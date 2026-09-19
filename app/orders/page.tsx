import { auth } from "@/auth";
import Link from "next/link";
import { GalleryShell } from "@/app/components/GalleryShell";
import { ReviewForm } from "@/app/components/ReviewForm";
import { formatPrice } from "@/app/data";
import { getBuyerOrders } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;
  const orders = await getBuyerOrders(session.user.id);
  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <p className="eyebrow">Purchase history</p>
        <h1 className="section-title mt-6">My <i>orders.</i></h1>
        <div className="mt-12 grid gap-5">
          {orders.map((order) => {
            const paymentPending = order.paymentStatus === "CREATED" || order.paymentStatus === "PENDING";
            return (
              <article key={`${order.id}-${order.itemId}`} className="grid gap-5 border border-white/10 p-6 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/35">{order.orderNumber} · {order.createdAt.toLocaleDateString("en-IN")}</p>
                  <h2 className="mt-3 font-serif text-3xl">{order.title ?? "Artwork"}</h2>
                  <p className="mt-1 text-sm text-white/45">{order.artist} · Quantity {order.quantity ?? 1}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/50"><span>Payment: {order.paymentStatus}</span><span>Order: {order.status}</span></div>
                  {paymentPending ? <p className="mt-3 max-w-xl text-sm text-amber-100/75">Payment is not confirmed. If Razorpay was closed without payment, no purchase was completed.</p> : null}
                  {order.status === "DELIVERED" && order.itemId && <ReviewForm orderItemId={order.itemId} />}
                </div>
                <p className="font-serif text-2xl">{formatPrice(Number(order.lineTotal ?? order.total))}</p>
              </article>
            );
          })}
          {!orders.length && <div className="grid min-h-72 place-items-center text-center"><div><h2 className="font-serif text-4xl">No orders yet.</h2><p className="mt-3 text-white/45">The right artwork is still waiting.</p><Link href="/#gallery" className="button-light mt-7">Explore gallery</Link></div></div>}
        </div>
      </main>
    </GalleryShell>
  );
}
