"use server";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { addresses, artistProfiles, auctionPaymentAttempts, auctions, artworks, cartItems, carts, orderItems, orders, paymentAttempts, payments } from "@/db/schema";
import { requireUser } from "@/lib/authz";
import { requireAuctionsEnabled } from "@/lib/auctions/feature-flag";
import { applyBasisPoints, majorToMinorUnits, minorToMajorUnits, toSafeProviderAmount } from "@/lib/money";
import { getRazorpay } from "@/lib/razorpay";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(5).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{4,12}$/),
  country: z.string().trim().length(2).default("IN"),
});

export type CheckoutResult = { ok: false; error: string } | { ok: true; key: string; providerOrderId: string; internalOrderId: string; amountPaise: number; currency: string; buyer: { name: string; email: string } };

export async function beginCheckout(input: z.input<typeof checkoutSchema>): Promise<CheckoutResult> {
  let provisionalOrderId: string | undefined;
  try {
    const user = await requireUser();
    const address = checkoutSchema.parse(input);
    const db = getDb();
    const rows = await db.select({ cartId: carts.id, artworkId: artworks.id, artistId: artworks.artistId, title: artworks.title, artistName: artistProfiles.displayName, price: artworks.price, currency: artworks.currency, stock: artworks.stock, availability: artworks.availability, status: artworks.status, type: artworks.type, quantity: cartItems.quantity }).from(carts).innerJoin(cartItems, eq(carts.id, cartItems.cartId)).innerJoin(artworks, eq(cartItems.artworkId, artworks.id)).innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id)).where(eq(carts.userId, user.id));
    if (!rows.length) return { ok: false, error: "Your cart is empty." };
    if (rows.some((row) => row.status !== "PUBLISHED" || row.availability !== "AVAILABLE" || row.quantity < 1 || row.quantity > row.stock)) return { ok: false, error: "One or more artworks are no longer available in that quantity." };
    if (rows.some((row) => row.currency !== "INR")) return { ok: false, error: "This checkout currently supports INR artwork only." };
    const subtotalPaise = rows.reduce((sum, row) => sum + majorToMinorUnits(row.price) * BigInt(row.quantity), 0n);
    const shippingPaise = rows.some((row) => row.type === "PHYSICAL") ? 35_000n : 0n;
    const taxRateBps = Number(process.env.GST_RATE_BPS ?? "0");
    if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000) throw new Error("GST_RATE_BPS must be an integer between 0 and 10000.");
    const taxPaise = applyBasisPoints(subtotalPaise, taxRateBps);
    const totalPaise = subtotalPaise + shippingPaise + taxPaise;
    const providerAmount = toSafeProviderAmount(totalPaise);
    const orderNumber = `GG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const order = await db.transaction(async (tx) => {
      // Coordinate with admin auction scheduling on the same artwork rows. A
      // CREATED order becomes visible to scheduling before the provider call.
      const locked = await tx.select({ id: artworks.id, price: artworks.price, artistId: artworks.artistId, currency: artworks.currency, type: artworks.type, status: artworks.status, availability: artworks.availability, stock: artworks.stock }).from(artworks).where(inArray(artworks.id, rows.map((row) => row.artworkId))).orderBy(artworks.id).for("update");
      const current = new Map(locked.map((row) => [row.id, row]));
      if (rows.some((row) => { const art = current.get(row.artworkId); return !art || art.status !== "PUBLISHED" || art.availability !== "AVAILABLE" || art.stock < row.quantity || art.price !== row.price || art.artistId !== row.artistId || art.currency !== row.currency || art.type !== row.type; })) throw new Error("ARTWORK_CHANGED");
      const [savedAddress] = await tx.insert(addresses).values({ userId: user.id, ...address, line2: address.line2 || null }).returning({ id: addresses.id });
      const [createdOrder] = await tx.insert(orders).values({ orderNumber, buyerId: user.id, addressId: savedAddress.id, subtotal: minorToMajorUnits(subtotalPaise), shipping: minorToMajorUnits(shippingPaise), tax: minorToMajorUnits(taxPaise), total: minorToMajorUnits(totalPaise), currency: "INR" }).returning({ id: orders.id });
      await tx.insert(orderItems).values(rows.map((row) => {
        const lineTotalPaise = majorToMinorUnits(row.price) * BigInt(row.quantity);
        const platformFeePaise = applyBasisPoints(lineTotalPaise, 1_500);
        return { orderId: createdOrder.id, artworkId: row.artworkId, artistId: row.artistId, titleSnapshot: row.title, artistNameSnapshot: row.artistName, unitPrice: row.price, quantity: row.quantity, lineTotal: minorToMajorUnits(lineTotalPaise), platformFee: minorToMajorUnits(platformFeePaise), sellerEarnings: minorToMajorUnits(lineTotalPaise - platformFeePaise) };
      }));
      return createdOrder;
    });
    provisionalOrderId = order.id;
    const providerOrder = await getRazorpay().orders.create({ amount: providerAmount, currency: "INR", receipt: orderNumber, notes: { internal_order_id: order.id } });
    await db.transaction(async (tx) => {
      await tx.insert(payments).values({ orderId: order.id, providerOrderId: providerOrder.id, amount: minorToMajorUnits(totalPaise), currency: "INR", status: "PENDING" });
      await tx.insert(paymentAttempts).values({ orderId: order.id, providerOrderId: providerOrder.id, idempotencyKey: `razorpay:${providerOrder.id}`, amountPaise: totalPaise, currency: "INR", status: "PENDING" });
      await tx.update(orders).set({ paymentStatus: "PENDING", updatedAt: new Date() }).where(eq(orders.id, order.id));
    });
    return { ok: true, key: process.env.RAZORPAY_KEY_ID!, providerOrderId: providerOrder.id, internalOrderId: order.id, amountPaise: providerAmount, currency: "INR", buyer: { name: user.name ?? address.fullName, email: user.email ?? "" } };
  } catch (error) {
    if (provisionalOrderId) {
      await getDb().update(orders).set({ paymentStatus: "FAILED", status: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, provisionalOrderId)).catch(() => undefined);
    }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check your delivery details." };
    if (error instanceof Error && error.message === "ARTWORK_CHANGED") return { ok: false, error: "An artwork changed availability or price. Review your cart and try again." };
    if (error instanceof Error && (error.message.includes("RAZORPAY_KEY_ID") || error.message.includes("RAZORPAY_KEY_SECRET"))) return { ok: false, error: "Secure payments are being configured. Please try again shortly." };
    if (error instanceof Error && error.message.includes("DATABASE_URL")) return { ok: false, error: "Checkout is being configured. Please try again shortly." };
    return { ok: false, error: "Checkout could not be started. Please try again." };
  }
}

/** Creates the sole payment order for the persisted auction winner. Browser input never supplies a price. */
export async function beginAuctionCheckout(auctionId: string, input: z.input<typeof checkoutSchema>): Promise<CheckoutResult> {
  try {
    requireAuctionsEnabled();
    const id = z.string().uuid().parse(auctionId);
    const user = await requireUser();
    const address = checkoutSchema.parse(input);
    const db = getDb();
    const [sale] = await db.select().from(auctions).where(eq(auctions.id, id)).limit(1);
    const [obligation] = await db.select().from(auctionPaymentAttempts).where(eq(auctionPaymentAttempts.auctionId, id)).limit(1);
    if (!sale || !obligation || sale.status !== "PAYMENT_PENDING" || obligation.status !== "PENDING" || sale.winnerId !== user.id || obligation.winnerId !== user.id || !sale.winningBidPaise || sale.winningBidPaise !== obligation.winningBidPaise || !sale.paymentDeadlineAt || sale.paymentDeadlineAt <= new Date()) throw new Error("AUCTION_NOT_PAYABLE");
    const winningBidPaise = sale.winningBidPaise;
    const [artwork] = await db.select({ type: artworks.type, status: artworks.status, availability: artworks.availability, stock: artworks.stock }).from(artworks).where(eq(artworks.id, sale.artworkId)).limit(1);
    if (!artwork || artwork.status !== "PUBLISHED" || artwork.availability !== "RESERVED" || artwork.stock !== 1) throw new Error("AUCTION_NOT_PAYABLE");
    const taxRateBps = Number(process.env.GST_RATE_BPS ?? "0");
    if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000) throw new Error("GST_RATE_BPS must be an integer between 0 and 10000.");
    const shippingPaise = artwork.type === "PHYSICAL" ? 35_000n : 0n;
    const taxPaise = applyBasisPoints(winningBidPaise, taxRateBps);
    const totalPaise = winningBidPaise + shippingPaise + taxPaise;
    const buyer = { name: user.name ?? address.fullName, email: user.email ?? "" };
    const existingPayment = obligation.orderId ? (await db.select({ providerOrderId: payments.providerOrderId, status: payments.status }).from(payments).where(eq(payments.orderId, obligation.orderId)).limit(1))[0] : undefined;
    if (obligation.orderId && existingPayment?.status === "PENDING" && existingPayment.providerOrderId && obligation.amountPaise === totalPaise) return { ok: true, key: process.env.RAZORPAY_KEY_ID!, providerOrderId: existingPayment.providerOrderId, internalOrderId: obligation.orderId, amountPaise: toSafeProviderAmount(totalPaise), currency: "INR", buyer };
    if (obligation.orderId) throw new Error("AUCTION_NOT_PAYABLE");

    // Create the external order first. A failed provider call cannot strand a
    // winner with an internal order that can never receive a payment attempt.
    const receipt = `GG-A-${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const providerOrder = await getRazorpay().orders.create({ amount: toSafeProviderAmount(totalPaise), currency: "INR", receipt, notes: { auction_id: id } });
    const persisted = await db.transaction(async (tx) => {
      const [lockedSale] = await tx.select().from(auctions).where(eq(auctions.id, id)).limit(1).for("update");
      const [lockedObligation] = await tx.select().from(auctionPaymentAttempts).where(eq(auctionPaymentAttempts.auctionId, id)).limit(1).for("update");
      if (!lockedSale || !lockedObligation || lockedSale.status !== "PAYMENT_PENDING" || lockedObligation.status !== "PENDING" || lockedSale.winnerId !== user.id || lockedObligation.winnerId !== user.id || lockedSale.winningBidPaise !== winningBidPaise || lockedSale.winningBidPaise !== lockedObligation.winningBidPaise || !lockedSale.paymentDeadlineAt || lockedSale.paymentDeadlineAt <= new Date()) throw new Error("AUCTION_NOT_PAYABLE");
      if (lockedObligation.orderId) {
        const [prior] = await tx.select({ providerOrderId: payments.providerOrderId, amount: payments.amount, status: payments.status }).from(payments).where(eq(payments.orderId, lockedObligation.orderId)).limit(1);
        if (!prior?.providerOrderId || prior.status !== "PENDING" || prior.amount !== minorToMajorUnits(totalPaise)) throw new Error("AUCTION_NOT_PAYABLE");
        return { orderId: lockedObligation.orderId, providerOrderId: prior.providerOrderId };
      }
      const [lockedArtwork] = await tx.select({ id: artworks.id, artistId: artworks.artistId, title: artworks.title, type: artworks.type, status: artworks.status, availability: artworks.availability, stock: artworks.stock, displayName: artistProfiles.displayName }).from(artworks).innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id)).where(eq(artworks.id, lockedSale.artworkId)).limit(1).for("update");
      if (!lockedArtwork || lockedArtwork.status !== "PUBLISHED" || lockedArtwork.availability !== "RESERVED" || lockedArtwork.stock !== 1 || lockedArtwork.type !== artwork.type || lockedArtwork.artistId !== lockedSale.sellerId) throw new Error("AUCTION_NOT_PAYABLE");
      const [savedAddress] = await tx.insert(addresses).values({ userId: user.id, ...address, line2: address.line2 || null }).returning({ id: addresses.id });
      const [order] = await tx.insert(orders).values({ orderNumber: receipt, buyerId: user.id, addressId: savedAddress.id, subtotal: minorToMajorUnits(winningBidPaise), shipping: minorToMajorUnits(shippingPaise), tax: minorToMajorUnits(taxPaise), total: minorToMajorUnits(totalPaise), currency: "INR", paymentStatus: "PENDING" }).returning({ id: orders.id });
      const fee = applyBasisPoints(winningBidPaise, 1_500);
      await tx.insert(orderItems).values({ orderId: order.id, artworkId: lockedArtwork.id, artistId: lockedArtwork.artistId, titleSnapshot: lockedArtwork.title, artistNameSnapshot: lockedArtwork.displayName, unitPrice: minorToMajorUnits(winningBidPaise), quantity: 1, lineTotal: minorToMajorUnits(winningBidPaise), platformFee: minorToMajorUnits(fee), sellerEarnings: minorToMajorUnits(winningBidPaise - fee) });
      await tx.insert(payments).values({ orderId: order.id, providerOrderId: providerOrder.id, amount: minorToMajorUnits(totalPaise), currency: "INR", status: "PENDING" });
      await tx.insert(paymentAttempts).values({ orderId: order.id, providerOrderId: providerOrder.id, idempotencyKey: `razorpay:${providerOrder.id}`, amountPaise: totalPaise, currency: "INR", status: "PENDING" });
      await tx.update(auctionPaymentAttempts).set({ orderId: order.id, amountPaise: totalPaise, updatedAt: new Date() }).where(eq(auctionPaymentAttempts.id, lockedObligation.id));
      return { orderId: order.id, providerOrderId: providerOrder.id };
    });
    return { ok: true, key: process.env.RAZORPAY_KEY_ID!, providerOrderId: persisted.providerOrderId, internalOrderId: persisted.orderId, amountPaise: toSafeProviderAmount(totalPaise), currency: "INR", buyer };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check your delivery details." };
    if (error instanceof Error && (error.message === "AUCTION_NOT_PAYABLE" || error.message === "AUCTIONS_DISABLED")) return { ok: false, error: "This auction payment is no longer available." };
    return { ok: false, error: "Auction payment could not be started. Please try again." };
  }
}
