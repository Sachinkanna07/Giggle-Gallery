"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { addresses, artistProfiles, artworks, cartItems, carts, notifications, orderItems, orders, payments, payouts } from "@/db/schema";
import { requireUser } from "@/lib/authz";
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
  try {
    const user = await requireUser();
    const address = checkoutSchema.parse(input);
    const db = getDb();
    const rows = await db.select({ cartId: carts.id, artworkId: artworks.id, artistId: artworks.artistId, title: artworks.title, artistName: artistProfiles.displayName, price: artworks.price, currency: artworks.currency, stock: artworks.stock, availability: artworks.availability, status: artworks.status, type: artworks.type, quantity: cartItems.quantity }).from(carts).innerJoin(cartItems, eq(carts.id, cartItems.cartId)).innerJoin(artworks, eq(cartItems.artworkId, artworks.id)).innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id)).where(eq(carts.userId, user.id));
    if (!rows.length) return { ok: false, error: "Your cart is empty." };
    if (rows.some((row) => row.status !== "PUBLISHED" || row.availability !== "AVAILABLE" || row.quantity < 1 || row.quantity > row.stock)) return { ok: false, error: "One or more artworks are no longer available in that quantity." };
    if (rows.some((row) => row.currency !== "INR")) return { ok: false, error: "This checkout currently supports INR artwork only." };
    const subtotal = rows.reduce((sum, row) => sum + Number(row.price) * row.quantity, 0);
    const shipping = rows.some((row) => row.type === "PHYSICAL") ? 350 : 0;
    const tax = 0;
    const total = subtotal + shipping + tax;
    const orderNumber = `GG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [savedAddress] = await db.insert(addresses).values({ userId: user.id, ...address, line2: address.line2 || null }).returning({ id: addresses.id });
    const [order] = await db.insert(orders).values({ orderNumber, buyerId: user.id, addressId: savedAddress.id, subtotal: subtotal.toFixed(2), shipping: shipping.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2), currency: "INR" }).returning({ id: orders.id });
    await db.insert(orderItems).values(rows.map((row) => {
      const lineTotal = Number(row.price) * row.quantity;
      const platformFee = Math.round(lineTotal * 0.15 * 100) / 100;
      return { orderId: order.id, artworkId: row.artworkId, artistId: row.artistId, titleSnapshot: row.title, artistNameSnapshot: row.artistName, unitPrice: row.price, quantity: row.quantity, lineTotal: lineTotal.toFixed(2), platformFee: platformFee.toFixed(2), sellerEarnings: (lineTotal - platformFee).toFixed(2) };
    }));
    const providerOrder = await getRazorpay().orders.create({ amount: Math.round(total * 100), currency: "INR", receipt: orderNumber, notes: { internal_order_id: order.id } });
    await db.insert(payments).values({ orderId: order.id, providerOrderId: providerOrder.id, amount: total.toFixed(2), currency: "INR", status: "PENDING" });
    return { ok: true, key: process.env.RAZORPAY_KEY_ID!, providerOrderId: providerOrder.id, internalOrderId: order.id, amountPaise: Math.round(total * 100), currency: "INR", buyer: { name: user.name ?? address.fullName, email: user.email ?? "" } };
  } catch (error) {
    console.error("Checkout creation failed", error);
    return { ok: false, error: error instanceof z.ZodError ? (error.issues[0]?.message ?? "Check your delivery details.") : "Checkout could not be started. Please try again." };
  }
}

export async function markRazorpayPaymentPaid(providerOrderId: string, providerPaymentId: string) {
  const db = getDb();
  const [payment] = await db.select({ id: payments.id, orderId: payments.orderId, status: payments.status }).from(payments).where(eq(payments.providerOrderId, providerOrderId)).limit(1);
  if (!payment) throw new Error("Payment record not found.");
  if (payment.status === "PAID") return payment.orderId;
  const items = await db.select({ id: orderItems.id, artworkId: orderItems.artworkId, artistId: orderItems.artistId, quantity: orderItems.quantity, lineTotal: orderItems.lineTotal, platformFee: orderItems.platformFee, sellerEarnings: orderItems.sellerEarnings }).from(orderItems).where(eq(orderItems.orderId, payment.orderId));
  const [claimed] = await db.update(payments).set({ providerPaymentId, status: "PAID", verifiedAt: new Date(), updatedAt: new Date() }).where(and(eq(payments.id, payment.id), eq(payments.status, "PENDING"))).returning({ id: payments.id });
  if (!claimed) return payment.orderId;
  const decremented: Array<{ artworkId: string; quantity: number }> = [];
  for (const item of items) {
    if (!item.artworkId) continue;
    const [updated] = await db.update(artworks).set({ stock: sql`${artworks.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(artworks.id, item.artworkId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "AVAILABLE"), gte(artworks.stock, item.quantity))).returning({ id: artworks.id, stock: artworks.stock });
    if (!updated) {
      for (const rollback of decremented) await db.update(artworks).set({ stock: sql`${artworks.stock} + ${rollback.quantity}`, availability: "AVAILABLE", status: "PUBLISHED", updatedAt: new Date() }).where(eq(artworks.id, rollback.artworkId));
      await getRazorpay().payments.refund(providerPaymentId, { notes: { reason: "inventory_conflict", internal_order_id: payment.orderId } });
      await db.update(payments).set({ status: "REFUNDED", failureReason: "Inventory changed before payment confirmation", updatedAt: new Date() }).where(eq(payments.id, payment.id));
      await db.update(orders).set({ paymentStatus: "REFUNDED", status: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, payment.orderId));
      return payment.orderId;
    }
    decremented.push({ artworkId: updated.id, quantity: item.quantity });
    if (updated.stock === 0) await db.update(artworks).set({ availability: "SOLD_OUT", status: "SOLD", updatedAt: new Date() }).where(eq(artworks.id, updated.id));
  }
  await db.update(orders).set({ paymentStatus: "PAID", status: "CONFIRMED", updatedAt: new Date() }).where(eq(orders.id, payment.orderId));
  for (const item of items) {
    await db.insert(payouts).values({ artistId: item.artistId, orderItemId: item.id, grossAmount: item.lineTotal, platformFee: item.platformFee, sellerEarnings: item.sellerEarnings, status: "PENDING" }).onConflictDoNothing();
  }
  const [order] = await db.select({ buyerId: orders.buyerId }).from(orders).where(eq(orders.id, payment.orderId)).limit(1);
  if (order) {
    const [cart] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, order.buyerId)).limit(1);
    if (cart) await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await db.insert(notifications).values({ userId: order.buyerId, type: "ORDER_CONFIRMED", title: "Order confirmed", message: "Your payment was verified and the artists are preparing your order.", data: { orderId: payment.orderId } });
  }
  const sellerIds = [...new Set(items.map((item) => item.artistId))];
  for (const artistId of sellerIds) {
    const [artist] = await db.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, artistId)).limit(1);
    if (artist) await db.insert(notifications).values({ userId: artist.userId, type: "SALE_CONFIRMED", title: "New sale", message: "A verified order includes one of your artworks.", data: { orderId: payment.orderId } });
  }
  return payment.orderId;
}
