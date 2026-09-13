import Link from "next/link";
import { Check, Clock3 } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { orders } from "@/db/schema";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const session = await auth();
  const orderId = z.string().uuid().safeParse(order);
  let verifiedOrder: { orderNumber: string; status: string; paymentStatus: string } | undefined;

  if (session?.user?.id && orderId.success) {
    try {
      [verifiedOrder] = await getDb().select({ orderNumber: orders.orderNumber, status: orders.status, paymentStatus: orders.paymentStatus }).from(orders).where(and(eq(orders.id, orderId.data), eq(orders.buyerId, session.user.id))).limit(1);
    } catch (error) {
      console.error("Checkout confirmation lookup failed", error);
    }
  }

  const confirmed = verifiedOrder?.status === "CONFIRMED" && verifiedOrder.paymentStatus === "PAID";
  return <GalleryShell><main className="grid min-h-[calc(100vh-5rem)] place-items-center px-5 text-center"><div><div className={`mx-auto grid size-24 place-items-center rounded-full ${confirmed ? "bg-cobalt" : "bg-white/10"}`}>{confirmed ? <Check size={38} /> : <Clock3 size={38} />}</div><p className="eyebrow mt-8 justify-center">{confirmed ? "Payment verified" : "Verification pending"}</p><h1 className="mt-5 font-serif text-6xl tracking-[-.05em]">{confirmed ? "Something beautiful is yours." : "We’re confirming your payment."}</h1><p className="mx-auto mt-5 max-w-lg text-white/50">{confirmed ? `Your order ${verifiedOrder?.orderNumber} is confirmed. Follow its progress from My Orders.` : "We cannot show this order as paid until the signed payment confirmation is stored. Check My Orders shortly for the latest status."}</p><div className="mt-8 flex justify-center gap-3"><Link href="/orders" className="button-light">View my orders</Link><Link href="/#gallery" className="button-outline">Keep exploring</Link></div></div></main></GalleryShell>;
}
