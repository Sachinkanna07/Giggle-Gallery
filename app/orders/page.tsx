import { auth } from "@/auth";
import Link from "next/link";
import { GalleryShell } from "@/app/components/GalleryShell";
import { ReviewForm } from "@/app/components/ReviewForm";
import { formatPrice } from "@/app/data";
import { getBuyerOrders } from "@/lib/marketplace-data";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;
  const orders = await getBuyerOrders(session.user.id);

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-12">
        <div className="border-b border-border pb-8">
          <p className="eyebrow flex items-center gap-2">
            <Package size={14} /> Provenance & Acquisition Archive
          </p>
          <h1 className="section-title mt-3">
            My <i>orders.</i>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Verified acquisition receipts, tracking details, and certificate records.
          </p>
        </div>

        <div className="space-y-6">
          {orders.map((order) => {
            const paymentPending =
              order.paymentStatus === "CREATED" || order.paymentStatus === "PENDING";
            return (
              <article
                key={`${order.id}-${order.itemId}`}
                className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl grid gap-6 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-text-secondary">·</span>
                    <span className="text-xs text-text-secondary">
                      {order.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h2 className="mt-2 font-serif text-3xl text-text-primary">
                    {order.title ?? "Original Artwork"}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    By {order.artist} · Quantity {order.quantity ?? 1}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1 text-text-secondary">
                      Payment: <strong className="text-text-primary">{order.paymentStatus}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1 text-text-secondary">
                      Fulfillment: <strong className="text-text-primary">{order.status}</strong>
                    </span>
                  </div>

                  {order.city && (
                    <p className="mt-4 text-xs text-text-secondary leading-relaxed">
                      Delivery Address: {order.city}, {order.state}, {order.country}
                    </p>
                  )}

                  {paymentPending && (
                    <p className="mt-4 text-xs text-amber-300 font-medium">
                      Payment is not confirmed. If Razorpay was closed without payment, no acquisition was finalized.
                    </p>
                  )}

                  {order.status === "DELIVERED" && order.itemId && (
                    <div className="mt-6 border-t border-border pt-4">
                      <ReviewForm orderItemId={order.itemId} />
                    </div>
                  )}
                </div>

                <div className="sm:text-right">
                  <p className="text-xs text-text-secondary uppercase tracking-wider">Acquisition Total</p>
                  <p className="font-serif text-3xl text-text-primary mt-1">
                    {formatPrice(Number(order.lineTotal ?? order.total))}
                  </p>
                </div>
              </article>
            );
          })}

          {!orders.length && (
            <div className="rounded-2xl border border-border p-16 text-center text-text-secondary">
              <Package size={36} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
              <h2 className="font-serif text-3xl text-text-primary">No acquisitions yet</h2>
              <p className="mt-2 text-sm">Your private provenance history will appear here once you acquire your first work.</p>
              <Link href="/#gallery" className="button-light mt-6 text-xs !py-2.5 !px-6 inline-block">
                Explore the gallery
              </Link>
            </div>
          )}
        </div>
      </main>
    </GalleryShell>
  );
}
