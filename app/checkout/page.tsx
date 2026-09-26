import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
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
      <main className="section-shell grid gap-12 py-16 lg:grid-cols-[1fr_.75fr] lg:py-24">
        <section>
          <p className="eyebrow">Secure checkout</p>
          <h1 className="mt-5 font-serif text-6xl tracking-[-.05em]">Where should your art arrive?</h1>
          {unavailableItems.length > 0 && (
            <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-amber-400" />
                <h2 className="font-serif text-xl font-normal text-amber-300">Items no longer available for purchase</h2>
              </div>
              <p className="mt-2 text-sm opacity-90">The following item(s) in your cart are no longer available. Please remove them before proceeding to payment.</p>
              <div className="mt-4 space-y-3 border-t border-amber-500/20 pt-4">
                {unavailableItems.map((item) => (
                  <div key={item.artworkId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-950/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative aspect-[4/5] w-12 overflow-hidden rounded"><Image src={item.image} alt="" fill sizes="48px" className="object-cover" /></div>
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-xs text-white/50">{item.artist} · Qty {item.quantity}</p>
                        <p className="mt-1 text-xs font-semibold text-red-300">{item.unavailableReason ?? "No longer available"}</p>
                      </div>
                    </div>
                    <RemoveCartItemButton artworkId={item.artworkId} title={item.title} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {canCheckout ? (
            <div className="mt-10">
              <CheckoutForm />
            </div>
          ) : unavailableItems.length > 0 ? (
            <div className="mt-8 rounded-xl border border-white/10 p-6 text-center text-white/50">
              <p className="text-sm">Remove all unavailable items above to unlock checkout.</p>
            </div>
          ) : (
            <div className="mt-10 border border-white/10 p-10">
              <h2 className="font-serif text-3xl">Your cart is empty.</h2>
              <Link href="/#gallery" className="button-light mt-6 inline-block">Explore artwork</Link>
            </div>
          )}
        </section>
        <aside className="h-fit border border-white/10 bg-white/[.025] p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl">Order summary</h2>
          <div className="mt-6 space-y-5">
            {availableItems.length ? (
              availableItems.map((item) => (
                <div key={item.artworkId} className="grid grid-cols-[64px_1fr_auto] gap-3">
                  <div className="relative aspect-[4/5] overflow-hidden"><Image src={item.image} alt="" fill sizes="64px" className="object-cover" /></div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-white/40">{item.artist} · Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">No available items in cart.</p>
            )}
          </div>
          <dl className="mt-7 space-y-3 border-t border-white/10 pt-5 text-sm">
            <div className="flex justify-between text-white/50"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between text-white/50"><dt>Insured delivery</dt><dd>{formatPrice(shipping)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-4 text-lg"><dt>Total</dt><dd className="font-semibold">{formatPrice(subtotal + shipping)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-white/35">Final totals and availability are recalculated on the server before payment.</p>
        </aside>
      </main>
    </GalleryShell>
  );
}
