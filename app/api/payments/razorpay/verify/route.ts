import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { orders, payments } from "@/db/schema";
import { markRazorpayPaymentPaid } from "@/app/actions/checkout";
import { verifyRazorpayPayment } from "@/lib/razorpay";

const payloadSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  internalOrderId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payment response." }, { status: 400 });
  const input = parsed.data;
  const [owned] = await getDb().select({ id: payments.id }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(eq(payments.providerOrderId, input.razorpay_order_id), eq(orders.id, input.internalOrderId), eq(orders.buyerId, session.user.id))).limit(1);
  if (!owned) return Response.json({ error: "Order not found." }, { status: 404 });
  if (!verifyRazorpayPayment(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) return Response.json({ error: "Payment signature could not be verified." }, { status: 400 });
  await markRazorpayPaymentPaid(input.razorpay_order_id, input.razorpay_payment_id);
  return Response.json({ ok: true, orderId: input.internalOrderId });
}
