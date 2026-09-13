import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { orders, paymentAttempts, payments } from "@/db/schema";
import { finalizeRazorpayPayment } from "@/lib/payments/finalize";
import { verifyRazorpayWebhook } from "@/lib/razorpay";
import { rateLimitRequest, rateLimitResponse } from "@/lib/security/request";
import { getWebhookEventIdentity, sha256 } from "@/lib/webhook-event";
import { claimWebhookEvent, markWebhookEventFailed, markWebhookEventProcessed } from "@/lib/webhook-events";

const webhookSchema = z.object({
  event: z.string().min(1).max(100),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1).max(200).optional(),
        order_id: z.string().min(1).max(200).optional(),
        error_code: z.string().max(200).optional(),
        error_description: z.string().max(1_000).optional(),
      }).passthrough().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

export async function POST(request: Request) {
  const rateLimit = rateLimitRequest(request, "razorpay-webhook", 10_000, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  let claimedEventId: string | undefined;
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    if (!verifyRazorpayWebhook(rawBody, signature)) return Response.json({ error: "Invalid signature" }, { status: 400 });
    const event = webhookSchema.parse(JSON.parse(rawBody));
    const identity = getWebhookEventIdentity(rawBody, request.headers.get("x-razorpay-event-id"));
    claimedEventId = identity.providerEventId;
    const claim = await claimWebhookEvent({
      provider: "RAZORPAY",
      providerEventId: identity.providerEventId,
      signatureHash: sha256(signature),
      bodyHash: identity.bodyHash,
      eventType: event.event,
    });
    if (claim === "PROCESSED") return Response.json({ received: true, duplicate: true });
    if (claim === "IN_PROGRESS") return Response.json({ error: "Webhook event is already processing." }, { status: 503, headers: { "Retry-After": "30" } });

    const payment = event.payload?.payment?.entity;
    if (event.event === "payment.captured" && (!payment?.id || !payment.order_id)) throw new Error("Captured payment payload is incomplete.");
    if (event.event === "payment.captured" && payment?.id && payment.order_id) {
      await finalizeRazorpayPayment(payment.order_id, payment.id);
    }
    if (event.event === "payment.failed" && !payment?.order_id) throw new Error("Failed payment payload is incomplete.");
    if (event.event === "payment.failed" && payment?.order_id) {
      const reason = payment.error_description ?? "Provider reported failure";
      await getDb().transaction(async (tx) => {
        const [record] = await tx.select({ orderId: payments.orderId }).from(payments).where(and(eq(payments.providerOrderId, payment.order_id!), eq(payments.status, "PENDING"))).limit(1).for("update");
        if (!record) return;
        await tx.update(payments).set({ status: "FAILED", failureReason: reason, updatedAt: new Date() }).where(eq(payments.providerOrderId, payment.order_id!));
        await tx.update(paymentAttempts).set({ status: "FAILED", failureCode: payment.error_code, failureReason: reason, updatedAt: new Date() }).where(eq(paymentAttempts.providerOrderId, payment.order_id!));
        await tx.update(orders).set({ paymentStatus: "FAILED", status: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, record.orderId));
      });
    }
    await markWebhookEventProcessed("RAZORPAY", identity.providerEventId);
    return Response.json({ received: true });
  } catch (error) {
    if (claimedEventId) await markWebhookEventFailed("RAZORPAY", claimedEventId, error).catch(() => undefined);
    console.error("Razorpay webhook handling failed", error);
    const status = error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500;
    return Response.json({ error: "Webhook could not be processed" }, { status });
  }
}
