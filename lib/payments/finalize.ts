import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  artistProfiles,
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

  try {
    return await db.transaction(async (tx) => {
      const [payment] = await tx
        .select({ id: payments.id, orderId: payments.orderId, status: payments.status })
        .from(payments)
        .where(eq(payments.providerOrderId, providerOrderId))
        .limit(1)
        .for("update");

      if (!payment) throw new Error("Payment record not found.");
      if (payment.status === "PAID") return { orderId: payment.orderId, status: "ALREADY_CONFIRMED" };
      if (payment.status === "REFUNDED") return { orderId: payment.orderId, status: "REFUNDED" };
      if (payment.status !== "PENDING") throw new Error(`Payment cannot be finalized from ${payment.status}.`);

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

      for (const item of items) {
        if (!item.artworkId) continue;
        const [updated] = await tx
          .update(artworks)
          .set({ stock: sql`${artworks.stock} - ${item.quantity}`, updatedAt: new Date() })
          .where(and(
            eq(artworks.id, item.artworkId),
            eq(artworks.status, "PUBLISHED"),
            eq(artworks.availability, "AVAILABLE"),
            gte(artworks.stock, item.quantity),
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

      const [order] = await tx.select({ buyerId: orders.buyerId }).from(orders).where(eq(orders.id, payment.orderId)).limit(1);
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
      await tx.update(payments).set({ status: "REFUNDED", failureReason: error.message, updatedAt: new Date() }).where(eq(payments.id, error.paymentId));
      await tx.update(paymentAttempts).set({ status: "REFUNDED", failureReason: error.message, refundedAt: new Date(), updatedAt: new Date() }).where(eq(paymentAttempts.providerOrderId, providerOrderId));
      await tx.update(orders).set({ paymentStatus: "REFUNDED", status: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, error.orderId));
    });
    return { orderId: error.orderId, status: "REFUNDED" };
  }
}
