import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CheckoutForm } from "@/app/components/CheckoutForm";
import { formatPrice } from "@/app/data";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) return null;
  const [viewer, catalog] = await Promise.all([getViewerState(session.user.id), getMarketplaceCatalog()]);
  const items = viewer.cart.map((entry) => ({ ...entry, artwork: catalog.artworks.find((artwork) => artwork.id === entry.artworkId) })).filter((item) => item.artwork);
  const subtotal = items.reduce((sum, item) => sum + item.artwork!.price * item.quantity, 0);
  const shipping = items.some((item) => item.artwork!.type === "PHYSICAL") ? 350 : 0;
  return <GalleryShell><main className="section-shell grid gap-12 py-16 lg:grid-cols-[1fr_.75fr] lg:py-24"><section><p className="eyebrow">Secure checkout</p><h1 className="mt-5 font-serif text-6xl tracking-[-.05em]">Where should your art arrive?</h1>{items.length ? <div className="mt-10"><CheckoutForm /></div> : <div className="mt-10 border border-white/10 p-10"><h2 className="font-serif text-3xl">Your cart is empty.</h2><Link href="/#gallery" className="button-light mt-6">Explore artwork</Link></div>}</section><aside className="h-fit border border-white/10 bg-white/[.025] p-6 lg:sticky lg:top-28"><h2 className="font-serif text-3xl">Order summary</h2><div className="mt-6 space-y-5">{items.map((item) => <div key={item.artworkId} className="grid grid-cols-[64px_1fr_auto] gap-3"><div className="relative aspect-[4/5] overflow-hidden"><Image src={item.artwork!.image} alt="" fill sizes="64px" className="object-cover" /></div><div><p className="font-medium">{item.artwork!.title}</p><p className="text-xs text-white/40">{item.artwork!.artist} · Qty {item.quantity}</p></div><span className="text-sm">{formatPrice(item.artwork!.price * item.quantity)}</span></div>)}</div><dl className="mt-7 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-white/50"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div><div className="flex justify-between text-white/50"><dt>Insured delivery</dt><dd>{formatPrice(shipping)}</dd></div><div className="flex justify-between border-t border-white/10 pt-4 text-lg"><dt>Total</dt><dd className="font-semibold">{formatPrice(subtotal + shipping)}</dd></div></dl><p className="mt-4 text-xs text-white/35">Final totals and availability are recalculated on the server before payment.</p></aside></main></GalleryShell>;
}
