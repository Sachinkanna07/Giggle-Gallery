import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { orders, payments } from "@/db/schema";
import { finalizeRazorpayPayment } from "@/lib/payments/finalize";
import { verifyRazorpayPayment } from "@/lib/razorpay";
import { isAllowedBrowserOrigin, originErrorResponse, rateLimitRequest, rateLimitResponse } from "@/lib/security/request";

const payloadSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  internalOrderId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    if (!isAllowedBrowserOrigin(request)) return originErrorResponse();
    const rateLimit = rateLimitRequest(request, "razorpay-browser-verification", 20, 60_000);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid payment response." }, { status: 400 });
    const input = parsed.data;
    const [owned] = await getDb().select({ id: payments.id }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(eq(payments.providerOrderId, input.razorpay_order_id), eq(orders.id, input.internalOrderId), eq(orders.buyerId, session.user.id))).limit(1);
    if (!owned) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!verifyRazorpayPayment(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) return Response.json({ error: "Payment signature could not be verified." }, { status: 400 });
    await finalizeRazorpayPayment(input.razorpay_order_id, input.razorpay_payment_id);
    return Response.json({ ok: true, orderId: input.internalOrderId });
  } catch (error) {
    console.error("Razorpay payment verification failed", error);
    return Response.json({ error: "Payment verification is pending. Please check My Orders shortly." }, { status: 500 });
  }
}
