"use server";

import { and, eq } from "drizzle-orm";
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
    console.error("Checkout creation failed", error);
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check your delivery details." };
    if (error instanceof Error && (error.message.includes("RAZORPAY_KEY_ID") || error.message.includes("RAZORPAY_KEY_SECRET"))) return { ok: false, error: "Secure payments are being configured. Please try again shortly." };
    if (error instanceof Error && error.message.includes("DATABASE_URL")) return { ok: false, error: "Checkout is being configured. Please try again shortly." };
    return { ok: false, error: "Checkout could not be started. Please try again." };
  }
}

/** Creates the sole payment order for the persisted auction winner. Browser input never supplies a price. */
export async function beginAuctionCheckout(auctionId: string, input: z.input<typeof checkoutSchema>): Promise<CheckoutResult> {
  let provisionalOrderId: string | undefined;
  try {
    requireAuctionsEnabled();
    const user = await requireUser(); const address = checkoutSchema.parse(input); const db = getDb();
    const auction = await db.transaction(async (tx) => {
      const [attempt] = await tx.select().from(auctionPaymentAttempts).innerJoin(auctions, eq(auctionPaymentAttempts.auctionId, auctions.id)).where(eq(auctions.id, auctionId)).limit(1).for("update");
      if (!attempt) throw new Error("AUCTION_NOT_PAYABLE");
      const paymentAttempt = attempt.auction_payment_attempts; const sale = attempt.auctions;
      if (sale.status !== "PAYMENT_PENDING" || paymentAttempt.status !== "PENDING" || sale.winnerId !== user.id || paymentAttempt.winnerId !== user.id || !sale.paymentDeadlineAt || sale.paymentDeadlineAt <= new Date() || sale.winningBidPaise !== paymentAttempt.winningBidPaise || paymentAttempt.orderId) throw new Error("AUCTION_NOT_PAYABLE");
      const [artwork] = await tx.select({ id: artworks.id, artistId: artworks.artistId, title: artworks.title, price: artworks.price, type: artworks.type, status: artworks.status, availability: artworks.availability, stock: artworks.stock, displayName: artistProfiles.displayName }).from(artworks).innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id)).where(eq(artworks.id, sale.artworkId)).limit(1).for("update");
      if (!artwork || artwork.status !== "PUBLISHED" || artwork.availability !== "RESERVED" || artwork.stock !== 1) throw new Error("AUCTION_NOT_PAYABLE");
      const bidPaise = sale.winningBidPaise!; const shippingPaise = artwork.type === "PHYSICAL" ? 35_000n : 0n; const taxRateBps = Number(process.env.GST_RATE_BPS ?? "0");
      if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000) throw new Error("GST_RATE_BPS must be an integer between 0 and 10000.");
      const taxPaise = applyBasisPoints(bidPaise, taxRateBps); const totalPaise = bidPaise + shippingPaise + taxPaise;
      const orderNumber = `GG-AUCTION-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const [savedAddress] = await tx.insert(addresses).values({ userId: user.id, ...address, line2: address.line2 || null }).returning({ id: addresses.id });
      const [order] = await tx.insert(orders).values({ orderNumber, buyerId: user.id, addressId: savedAddress.id, subtotal: minorToMajorUnits(bidPaise), shipping: minorToMajorUnits(shippingPaise), tax: minorToMajorUnits(taxPaise), total: minorToMajorUnits(totalPaise), currency: "INR" }).returning({ id: orders.id });
      const fee = applyBasisPoints(bidPaise, 1_500);
      await tx.insert(orderItems).values({ orderId: order.id, artworkId: artwork.id, artistId: artwork.artistId, titleSnapshot: artwork.title, artistNameSnapshot: artwork.displayName, unitPrice: minorToMajorUnits(bidPaise), quantity: 1, lineTotal: minorToMajorUnits(bidPaise), platformFee: minorToMajorUnits(fee), sellerEarnings: minorToMajorUnits(bidPaise - fee) });
      await tx.update(auctionPaymentAttempts).set({ orderId: order.id, amountPaise: totalPaise, updatedAt: new Date() }).where(and(eq(auctionPaymentAttempts.id, paymentAttempt.id), eq(auctionPaymentAttempts.status, "PENDING")));
      return { orderId: order.id, orderNumber, totalPaise };
    });
    provisionalOrderId = auction.orderId;
    const providerOrder = await getRazorpay().orders.create({ amount: toSafeProviderAmount(auction.totalPaise), currency: "INR", receipt: auction.orderNumber, notes: { internal_order_id: auction.orderId, auction_id: auctionId } });
    await db.transaction(async (tx) => { await tx.insert(payments).values({ orderId: auction.orderId, providerOrderId: providerOrder.id, amount: minorToMajorUnits(auction.totalPaise), currency: "INR", status: "PENDING" }); await tx.insert(paymentAttempts).values({ orderId: auction.orderId, providerOrderId: providerOrder.id, idempotencyKey: `razorpay:${providerOrder.id}`, amountPaise: auction.totalPaise, currency: "INR", status: "PENDING" }); await tx.update(orders).set({ paymentStatus: "PENDING", updatedAt: new Date() }).where(eq(orders.id, auction.orderId)); });
    return { ok: true, key: process.env.RAZORPAY_KEY_ID!, providerOrderId: providerOrder.id, internalOrderId: auction.orderId, amountPaise: toSafeProviderAmount(auction.totalPaise), currency: "INR", buyer: { name: user.name ?? address.fullName, email: user.email ?? "" } };
  } catch (error) {
    if (provisionalOrderId) await getDb().update(orders).set({ paymentStatus: "FAILED", status: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, provisionalOrderId)).catch(() => undefined);
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check your delivery details." };
    if (error instanceof Error && (error.message === "AUCTION_NOT_PAYABLE" || error.message === "AUCTIONS_DISABLED")) return { ok: false, error: "This auction payment is no longer available." };
    return { ok: false, error: "Auction payment could not be started. Please try again." };
  }
}
