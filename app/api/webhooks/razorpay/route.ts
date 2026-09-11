import { eq } from "drizzle-orm";
import { markRazorpayPaymentPaid } from "@/app/actions/checkout";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { verifyRazorpayWebhook } from "@/lib/razorpay";

type RazorpayWebhook = { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; error_description?: string } } } };

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyRazorpayWebhook(rawBody, signature)) return Response.json({ error: "Invalid signature" }, { status: 400 });
  const event = JSON.parse(rawBody) as RazorpayWebhook;
  const payment = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && payment?.id && payment.order_id) await markRazorpayPaymentPaid(payment.order_id, payment.id);
  if (event.event === "payment.failed" && payment?.order_id) await getDb().update(payments).set({ status: "FAILED", failureReason: payment.error_description ?? "Provider reported failure", updatedAt: new Date() }).where(eq(payments.providerOrderId, payment.order_id));
  return Response.json({ received: true });
}
