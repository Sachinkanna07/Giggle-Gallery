import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  artistProfiles,
  auctionBids,
  auctionEvents,
  auctionPaymentAttempts,
  auctions,
  artworks,
  cartItems,
  carts,
  notifications,
  orderItems,
  orders,
  paymentAttempts,
  payments,
  payouts,
} from "@/db/schema";
import { getRazorpay } from "@/lib/razorpay";
import { majorToMinorUnits } from "@/lib/money";
import { isCapturedExpectedPayment, matchesProviderPaymentIdentity } from "@/lib/payments/provider-state";

class InventoryConflictError extends Error {
  constructor(readonly orderId: string, readonly paymentId: string) {
    super("Inventory changed before payment confirmation.");
    this.name = "InventoryConflictError";
  }
}

export type PaymentFinalizationResult = {
  orderId: string;
  status: "CONFIRMED" | "ALREADY_CONFIRMED" | "REFUNDED";
};

export async function finalizeRazorpayPayment(providerOrderId: string, providerPaymentId: string): Promise<PaymentFinalizationResult> {
  const db = getDb();
  // A Checkout signature proves authenticity, not that money was captured.
  // Fetch the provider record for browser and webhook callers alike.
  const providerPayment = await getRazorpay().payments.fetch(providerPaymentId);
  if (!matchesProviderPaymentIdentity(providerPayment, providerPaymentId, providerOrderId)) throw new Error("Provider payment and order do not match.");
  const [auctionLink] = await db.select({ auctionId: auctionPaymentAttempts.auctionId }).from(payments).innerJoin(auctionPaymentAttempts, eq(auctionPaymentAttempts.orderId, payments.orderId)).where(eq(payments.providerOrderId, providerOrderId)).limit(1);

  try {
    return await db.transaction(async (tx) => {
      const auction = auctionLink ? (await tx.select().from(auctions).where(eq(auctions.id, auctionLink.auctionId)).limit(1).for("update"))[0] : undefined;
      const auctionAttempt = auction ? (await tx.select().from(auctionPaymentAttempts).where(eq(auctionPaymentAttempts.auctionId, auction.id)).limit(1).for("update"))[0] : undefined;
      const [payment] = await tx
        .select({ id: payments.id, orderId: payments.orderId, status: payments.status, amount: payments.amount, currency: payments.currency, providerPaymentId: payments.providerPaymentId })
        .from(payments)
        .where(eq(payments.providerOrderId, providerOrderId))
        .limit(1)
        .for("update");

      if (!payment) throw new Error("Payment record not found.");
      if (payment.status === "PAID" && payment.providerPaymentId === providerPaymentId) return { orderId: payment.orderId, status: "ALREADY_CONFIRMED" };
      if (payment.status === "REFUNDED" && payment.providerPaymentId === providerPaymentId) return { orderId: payment.orderId, status: "REFUNDED" };
      if (payment.status !== "PENDING") throw new Error(`Payment cannot be finalized from ${payment.status}.`);
      if (providerPayment.status !== "captured") throw new Error("Provider payment has not been captured.");

      const [order] = await tx.select({ buyerId: orders.buyerId, subtotal: orders.subtotal, total: orders.total, currency: orders.currency, paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, payment.orderId)).limit(1).for("update");
      if (!order) throw new Error("Order not found.");
      const [providerAttempt] = await tx.select({ amountPaise: paymentAttempts.amountPaise, currency: paymentAttempts.currency, status: paymentAttempts.status }).from(paymentAttempts).where(eq(paymentAttempts.providerOrderId, providerOrderId)).limit(1);
      if (!providerAttempt || providerAttempt.status !== "PENDING" || !isCapturedExpectedPayment(providerPayment, providerAttempt.amountPaise) || payment.currency !== "INR" || order.currency !== "INR" || providerAttempt.currency !== "INR" || payment.amount !== order.total || majorToMinorUnits(order.total) !== providerAttempt.amountPaise || order.paymentStatus !== "PENDING") throw new InventoryConflictError(payment.orderId, payment.id);
      if (auctionAttempt) {
        const [highestBid] = await tx.select({ bidderId: auctionBids.bidderId, amountPaise: auctionBids.amountPaise }).from(auctionBids).where(eq(auctionBids.auctionId, auctionAttempt.auctionId)).orderBy(sql`${auctionBids.amountPaise} desc`, auctionBids.createdAt).limit(1);
        if (!auction || auctionAttempt.orderId !== payment.orderId || auction.status !== "PAYMENT_PENDING" || auction.winnerId !== order.buyerId || auctionAttempt.winnerId !== order.buyerId || highestBid?.bidderId !== order.buyerId || highestBid.amountPaise !== auctionAttempt.winningBidPaise || auction.endsAt > new Date() || !auction.paymentDeadlineAt || auction.paymentDeadlineAt <= new Date() || auction.paymentDeadlineAt.getTime() !== auctionAttempt.deadlineAt.getTime() || auction.winningBidPaise !== auctionAttempt.winningBidPaise || majorToMinorUnits(order.subtotal) !== auctionAttempt.winningBidPaise || majorToMinorUnits(order.total) !== auctionAttempt.amountPaise || auctionAttempt.status !== "PENDING") {
          throw new InventoryConflictError(payment.orderId, payment.id);
        }
      }

      const items = await tx
        .select({
          id: orderItems.id,
          artworkId: orderItems.artworkId,
          artistId: orderItems.artistId,
          quantity: orderItems.quantity,
          lineTotal: orderItems.lineTotal,
          platformFee: orderItems.platformFee,
          sellerEarnings: orderItems.sellerEarnings,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, payment.orderId));

      if (!items.length || (auctionAttempt && (items.length !== 1 || items[0]?.artworkId !== auction?.artworkId || items[0]?.artistId !== auction?.sellerId || items[0]?.quantity !== 1 || majorToMinorUnits(items[0].lineTotal) !== auctionAttempt.winningBidPaise))) throw new InventoryConflictError(payment.orderId, payment.id);
      for (const item of items) {
        if (!item.artworkId) continue;
        const [updated] = await tx
          .update(artworks)
          .set({ stock: sql`${artworks.stock} - ${item.quantity}`, updatedAt: new Date() })
          .where(auctionAttempt ? and(eq(artworks.id, item.artworkId), eq(artworks.artistId, auction!.sellerId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)) : and(
            eq(artworks.id, item.artworkId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "AVAILABLE"), gte(artworks.stock, item.quantity),
          ))
          .returning({ id: artworks.id, stock: artworks.stock });
        if (!updated) throw new InventoryConflictError(payment.orderId, payment.id);
        if (updated.stock === 0) {
          await tx.update(artworks).set({ availability: "SOLD_OUT", status: "SOLD", updatedAt: new Date() }).where(eq(artworks.id, updated.id));
        }
      }

      await tx.update(payments).set({ providerPaymentId, status: "PAID", verifiedAt: new Date(), updatedAt: new Date() }).where(eq(payments.id, payment.id));
      await tx.update(paymentAttempts).set({ providerPaymentId, status: "PAID", verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentAttempts.providerOrderId, providerOrderId));
      await tx.update(orders).set({ paymentStatus: "PAID", status: "CONFIRMED", updatedAt: new Date() }).where(eq(orders.id, payment.orderId));
      if (auctionAttempt && auction) {
        await tx.update(auctionPaymentAttempts).set({ status: "PAID", updatedAt: new Date() }).where(eq(auctionPaymentAttempts.id, auctionAttempt.id));
        await tx.update(auctions).set({ status: "SOLD", updatedAt: new Date() }).where(and(eq(auctions.id, auction.id), eq(auctions.status, "PAYMENT_PENDING")));
      }

      if (items.length) {
        await tx.insert(payouts).values(items.map((item) => ({
          artistId: item.artistId,
          orderItemId: item.id,
          grossAmount: item.lineTotal,
          platformFee: item.platformFee,
          sellerEarnings: item.sellerEarnings,
          status: "PENDING" as const,
        }))).onConflictDoNothing();
      }

      if (order) {
        const [cart] = await tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, order.buyerId)).limit(1);
        if (cart) await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
        await tx.insert(notifications).values({
          userId: order.buyerId,
          type: "ORDER_CONFIRMED",
          title: "Order confirmed",
          message: "Your payment was verified and the artists are preparing your order.",
          data: { orderId: payment.orderId },
        });
      }

      const sellerIds = [...new Set(items.map((item) => item.artistId))];
      for (const artistId of sellerIds) {
        const [artist] = await tx.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, artistId)).limit(1);
        if (artist) {
          await tx.insert(notifications).values({
            userId: artist.userId,
            type: "SALE_CONFIRMED",
            title: "New sale",
            message: "A verified order includes one of your artworks.",
            data: { orderId: payment.orderId },
          });
        }
      }

      return { orderId: payment.orderId, status: "CONFIRMED" };
    });
  } catch (error) {
    if (!(error instanceof InventoryConflictError)) throw error;

    await getRazorpay().payments.refund(providerPaymentId, {
      notes: { reason: "inventory_conflict", internal_order_id: error.orderId },
    });

    await db.transaction(async (tx) => {
      await tx.update(payments).set({ providerPaymentId, status: "REFUNDED", failureReason: error.message, updatedAt: new Date() }).where(eq(payments.id, error.paymentId));
      await tx.update(paymentAttempts).set({ providerPaymentId, status: "REFUNDED", failureReason: error.message, refundedAt: new Date(), updatedAt: new Date() }).where(eq(paymentAttempts.providerOrderId, providerOrderId));
      await tx.update(orders).set({ paymentStatus: "REFUNDED", status: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, error.orderId));
      const [auctionAttempt] = await tx.select({ id: auctionPaymentAttempts.id, auctionId: auctionPaymentAttempts.auctionId }).from(auctionPaymentAttempts).where(eq(auctionPaymentAttempts.orderId, error.orderId)).limit(1);
      if (auctionAttempt) {
        const [auction] = await tx.select({ artworkId: auctions.artworkId, sellerId: auctions.sellerId, status: auctions.status }).from(auctions).where(eq(auctions.id, auctionAttempt.auctionId)).limit(1).for("update");
        await tx.update(auctionPaymentAttempts).set({ status: "EXPIRED", updatedAt: new Date() }).where(eq(auctionPaymentAttempts.id, auctionAttempt.id));
        if (auction?.status === "PAYMENT_PENDING" || auction?.status === "PAYMENT_EXPIRED") {
          await tx.update(auctions).set({ status: "PAYMENT_EXPIRED", updatedAt: new Date() }).where(eq(auctions.id, auctionAttempt.auctionId));
          await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: new Date() }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.artistId, auction.sellerId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)));
          await tx.insert(auctionEvents).values({ auctionId: auctionAttempt.auctionId, type: "PAYMENT_REFUNDED", reason: "Payment could not safely finalize" });
        }
      }
    });
    return { orderId: error.orderId, status: "REFUNDED" };
  }
}
