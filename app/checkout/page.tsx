import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ShieldCheck, LockKeyhole } from "lucide-react";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CheckoutForm } from "@/app/components/CheckoutForm";
import { RemoveCartItemButton } from "@/app/components/RemoveCartItemButton";
import { formatPrice } from "@/app/data";
import { getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) return null;
  const viewer = await getViewerState(session.user.id);
  const availableItems = viewer.cart.filter((item) => item.isAvailable);
  const unavailableItems = viewer.cart.filter((item) => !item.isAvailable);
  const subtotal = availableItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = availableItems.some((item) => item.type === "PHYSICAL") ? 350 : 0;
  const canCheckout = availableItems.length > 0 && unavailableItems.length === 0;

  return (
    <GalleryShell>
      <main className="section-shell grid gap-12 py-16 lg:grid-cols-[1fr_0.8fr] lg:py-24">
        {/* Left Column: Form & Address Details */}
        <section>
          <p className="eyebrow flex items-center gap-2">
            <LockKeyhole size={14} /> Bank-Encrypted Razorpay Checkout
          </p>
          <h1 className="mt-4 font-serif text-5xl sm:text-6xl tracking-[-0.04em] text-text-primary leading-[0.95]">
            Where should your art <i>arrive?</i>
          </h1>

          {/* Unavailable Items Warning */}
          {unavailableItems.length > 0 && (
            <div className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-200">
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-amber-400 shrink-0" />
                <h2 className="font-serif text-xl font-normal text-amber-300">
                  Items no longer available for purchase
                </h2>
              </div>
              <p className="mt-2 text-xs opacity-90">
                The following item(s) in your cart are no longer available. Please remove them before proceeding to payment.
              </p>
              <div className="mt-4 space-y-3 border-t border-amber-500/20 pt-4">
                {unavailableItems.map((item) => (
                  <div
                    key={item.artworkId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative aspect-[4/5] w-12 overflow-hidden rounded bg-bg-secondary">
                        <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{item.title}</p>
                        <p className="text-xs text-white/50">{item.artist} · Qty {item.quantity}</p>
                        <p className="mt-1 text-xs font-semibold text-rose-300">
                          {item.unavailableReason ?? "Sold out"}
                        </p>
                      </div>
                    </div>
                    <RemoveCartItemButton artworkId={item.artworkId} title={item.title} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {canCheckout ? (
            <div className="mt-10 rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
              <CheckoutForm />
            </div>
          ) : unavailableItems.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary text-sm">
              <p>Remove all unavailable pieces above to unlock checkout.</p>
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-border bg-surface p-12 text-center">
              <h2 className="font-serif text-3xl text-text-primary">Your cart is empty.</h2>
              <p className="mt-2 text-xs text-text-secondary">Discover unique pieces in the gallery.</p>
              <Link href="/#gallery" className="button-light mt-6 text-xs !py-2.5 !px-6 inline-block">
                Explore gallery
              </Link>
            </div>
          )}
        </section>

        {/* Right Column: Order Summary & Price Transparency (Phase 27) */}
        <aside className="h-fit rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:sticky lg:top-28 shadow-xl">
          <h2 className="font-serif text-3xl text-text-primary">Order Summary</h2>
          <p className="text-xs text-text-secondary mt-1">Direct from verified artist studios</p>

          <div className="mt-6 space-y-4 max-h-[380px] overflow-y-auto">
            {availableItems.length ? (
              availableItems.map((item) => (
                <div key={item.artworkId} className="grid grid-cols-[60px_1fr_auto] gap-3 items-center border-b border-border/40 pb-3">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-bg-secondary">
                    <Image src={item.image} alt="" fill sizes="60px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-serif text-base text-text-primary leading-tight">{item.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{item.artist} · Qty {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-text-primary">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-text-secondary py-4">No available items in cart.</p>
            )}
          </div>

          <dl className="mt-6 space-y-3 border-t border-border pt-5 text-xs text-text-secondary">
            <div className="flex justify-between">
              <dt>Artwork subtotal</dt>
              <dd className="font-medium text-text-primary">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Insured fine art transit</dt>
              <dd className="font-medium text-text-primary">
                {shipping > 0 ? formatPrice(shipping) : "Free"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-4 text-base font-semibold text-text-primary">
              <dt>Collector Total</dt>
              <dd className="font-serif text-2xl font-normal text-text-primary">{formatPrice(subtotal + shipping)}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-xl border border-border/80 bg-surface-elevated/40 p-3.5 text-[11px] text-text-secondary flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-accent-secondary shrink-0 mt-0.5" />
            <span>
              All transactions are cryptographically verified by Razorpay with bank-level encryption. Subtotals are re-confirmed on the server.
            </span>
          </div>
        </aside>
      </main>
    </GalleryShell>
  );
}
