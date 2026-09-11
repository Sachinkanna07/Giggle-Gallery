import Link from "next/link";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { formatPrice } from "@/app/data";
import { getSellerSnapshot } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const snapshot = await getSellerSnapshot(session.user.id);
  if (!snapshot.artist || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return <GalleryShell><main className="section-shell py-24"><p className="eyebrow">Seller dashboard</p><h1 className="section-title mt-6">Your studio is <i>almost ready.</i></h1><p className="mt-6 max-w-xl text-white/50">Selling tools unlock after your artist application is approved.</p><Link href="/sell" className="button-light mt-8">View application</Link></main></GalleryShell>;
  }
  const revenue = snapshot.sales.reduce((sum, sale) => sum + Number(sale.sellerEarnings), 0);
  const views = snapshot.artworks.reduce((sum, artwork) => sum + artwork.viewCount, 0);
  const metrics = [["Revenue", formatPrice(revenue)], ["Sales", String(snapshot.sales.length)], ["Artwork views", String(views)], ["Published works", String(snapshot.artworks.filter((item) => item.status === "PUBLISHED").length)]];
  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">Seller dashboard</p><h1 className="mt-5 font-serif text-6xl tracking-[-.05em]">Welcome back, {snapshot.artist.displayName}.</h1></div><Link href="/seller/artworks/new" className="button-light">Add artwork</Link></div>
        <nav className="mt-10 flex gap-6 overflow-x-auto border-y border-white/10 py-4 text-sm text-white/55" aria-label="Seller sections">{["Overview", "My Artwork", "Orders", "Sales", "Revenue", "Followers", "Analytics", "Profile", "Payouts", "Settings"].map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="whitespace-nowrap hover:text-white">{item}</a>)}</nav>
        <section id="overview" className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="bg-ink p-7"><p className="text-sm text-white/40">{label}</p><p className="mt-3 font-serif text-4xl">{value}</p></div>)}</section>
        <section id="my-artwork" className="mt-16"><div className="flex items-end justify-between"><h2 className="font-serif text-4xl">My artwork</h2><span className="text-sm text-white/40">{snapshot.artworks.length} works</span></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-white/15 text-white/40"><tr><th className="py-3">Title</th><th>Status</th><th>Availability</th><th>Stock</th><th>Price</th><th>Views</th></tr></thead><tbody>{snapshot.artworks.map((artwork) => <tr key={artwork.id} className="border-b border-white/8"><td className="py-4 font-medium">{artwork.title}</td><td>{artwork.status.replaceAll("_", " ")}</td><td>{artwork.availability.replaceAll("_", " ")}</td><td>{artwork.stock}</td><td>{formatPrice(Number(artwork.price))}</td><td>{artwork.viewCount}</td></tr>)}</tbody></table>{!snapshot.artworks.length && <p className="py-16 text-center text-white/45">Your studio is empty. Add your first artwork.</p>}</div></section>
        <section id="orders" className="mt-16"><div className="flex items-end justify-between"><h2 className="font-serif text-4xl">Sales & orders</h2><span className="text-sm text-white/40">Realtime source: verified orders</span></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-white/15 text-white/40"><tr><th className="py-3">Order</th><th>Artwork</th><th>Quantity</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead><tbody>{snapshot.sales.map((sale) => <tr key={sale.id} className="border-b border-white/8"><td className="py-4">{sale.orderNumber}</td><td>{sale.title}</td><td>{sale.quantity}</td><td>{formatPrice(Number(sale.amount))}</td><td>{sale.paymentStatus}</td><td>{sale.status}</td></tr>)}</tbody></table>{!snapshot.sales.length && <p className="py-12 text-center text-white/45">Your first sale will appear here.</p>}</div></section>
        <section id="analytics" className="mt-16 grid gap-6 lg:grid-cols-2"><div className="border border-white/10 p-7"><h2 className="font-serif text-3xl">Sales over time</h2><div className="mt-8 flex h-44 items-end gap-3" aria-label="Sales chart">{[18, 26, 20, 42, 36, 58, Math.max(12, Math.min(92, snapshot.sales.length * 12))].map((height, index) => <div key={index} className="flex-1 bg-cobalt-light/70" style={{ height: `${height}%` }} />)}</div></div><div className="border border-white/10 p-7"><h2 className="font-serif text-3xl">Top artworks</h2><ol className="mt-6 space-y-4">{[...snapshot.artworks].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((artwork, index) => <li key={artwork.id} className="flex justify-between border-b border-white/10 pb-3"><span>{index + 1}. {artwork.title}</span><span className="text-white/40">{artwork.viewCount} views</span></li>)}</ol></div></section>
        <section id="payouts" className="mt-16 border border-white/10 p-7"><h2 className="font-serif text-4xl">Payouts</h2><p className="mt-3 max-w-xl text-sm text-white/45">Gross value, platform fees, payment fees, and seller earnings are tracked per fulfilled order item. Banking details are handled by the configured payout provider, never stored as raw card data.</p><div className="mt-6 space-y-3">{snapshot.payouts.map((payout) => <div key={payout.id} className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3 text-sm"><span>{payout.status}</span><span>{formatPrice(Number(payout.sellerEarnings))} earnings</span></div>)}{!snapshot.payouts.length && <p className="text-sm text-white/35">No payouts scheduled.</p>}</div></section>
      </main>
    </GalleryShell>
  );
}
