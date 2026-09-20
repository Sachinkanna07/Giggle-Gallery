import Link from "next/link";
import { auth } from "@/auth";
import { updateSellerOrderStatusForm } from "@/app/actions/marketplace";
import { GalleryShell } from "@/app/components/GalleryShell";
import { formatPrice } from "@/app/data";
import { getSellerOrders, getSellerSnapshot } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

const nextStatus = { CONFIRMED: "PROCESSING", PROCESSING: "SHIPPED", SHIPPED: "DELIVERED" } as const;

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const [snapshot, sellerOrders] = await Promise.all([getSellerSnapshot(session.user.id), getSellerOrders(session.user.id)]);
  if (!snapshot.artist || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return <GalleryShell><main className="section-shell py-24"><p className="eyebrow">Seller dashboard</p><h1 className="section-title mt-6">Your studio is <i>almost ready.</i></h1><p className="mt-6 max-w-xl text-white/50">Selling tools unlock after your artist application is approved.</p><Link href="/sell" className="button-light mt-8">View application</Link></main></GalleryShell>;
  }

  const revenue = snapshot.sales.reduce((sum, sale) => sum + Number(sale.sellerEarnings), 0);
  const statusCount = (status: string) => snapshot.artworks.filter((item) => item.status === status).length;
  const lowStock = snapshot.artworks.filter((item) => item.status === "PUBLISHED" && item.stock <= 1).length;
  const metrics = [
    ["Verified revenue", formatPrice(revenue)],
    ["Paid sales", String(snapshot.sales.length)],
    ["Published", String(statusCount("PUBLISHED"))],
    ["Pending review", String(statusCount("PENDING_REVIEW"))],
    ["Rejected", String(statusCount("REJECTED"))],
    ["Low / out of stock", String(lowStock)],
  ];

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">Seller dashboard</p><h1 className="mt-5 font-serif text-6xl tracking-[-.05em]">Welcome back, {snapshot.artist.displayName}.</h1></div><Link href="/seller/artworks/new" className="button-light">Add artwork</Link></div>
        <nav className="mt-10 flex gap-6 overflow-x-auto border-y border-white/10 py-4 text-sm text-white/55" aria-label="Seller sections"><a href="#overview">Overview</a><a href="#my-artwork">My artwork</a><a href="#orders">Orders</a><a href="#analytics">Analytics</a><a href="#payouts">Payouts</a></nav>

        <section id="overview" className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="bg-ink p-7"><p className="text-sm text-white/40">{label}</p><p className="mt-3 font-serif text-4xl">{value}</p></div>)}</section>

        <section id="my-artwork" className="mt-16"><div className="flex items-end justify-between"><h2 className="font-serif text-4xl">My artwork</h2><span className="text-sm text-white/40">{snapshot.artworks.length} works</span></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-white/15 text-white/40"><tr><th className="py-3">Title</th><th>Status</th><th>Availability</th><th>Stock</th><th>Price</th><th>Views</th></tr></thead><tbody>{snapshot.artworks.map((artwork) => <tr key={artwork.id} className="border-b border-white/8"><td className="py-4 font-medium">{artwork.title}</td><td>{artwork.status.replaceAll("_", " ")}</td><td>{artwork.availability.replaceAll("_", " ")}</td><td>{artwork.stock}</td><td>{formatPrice(Number(artwork.price))}</td><td>{artwork.viewCount}</td></tr>)}</tbody></table>{!snapshot.artworks.length && <p className="py-16 text-center text-white/45">Your studio is empty. Add your first artwork.</p>}</div></section>

        <section id="orders" className="mt-16"><div className="flex items-end justify-between"><div><h2 className="font-serif text-4xl">Paid orders</h2><p className="mt-2 text-sm text-white/45">Only verified paid orders are shown. Shipping details are provided only for fulfillment.</p></div><span className="text-sm text-white/40">{sellerOrders.length} items</span></div><div className="mt-6 space-y-4">{sellerOrders.map((order) => { const next = nextStatus[order.status as keyof typeof nextStatus]; return <article key={order.id} className="grid gap-5 border border-white/10 p-6 lg:grid-cols-[1fr_.8fr_auto]"><div><p className="text-xs uppercase tracking-wider text-white/35">{order.orderNumber} · {order.createdAt.toLocaleDateString("en-IN")}</p><h3 className="mt-2 font-serif text-2xl">{order.title}</h3><p className="mt-1 text-sm text-white/45">Quantity {order.quantity} · {formatPrice(Number(order.amount))}</p><p className="mt-3 text-xs text-white/45">Payment {order.paymentStatus} · Fulfillment {order.status}</p></div><address className="not-italic text-sm leading-relaxed text-white/55"><span className="block font-medium text-white/80">Ship to {order.fullName}</span>{order.line1}{order.line2 ? `, ${order.line2}` : ""}<br />{order.city}, {order.state} {order.postalCode}<br />{order.country}{order.phone && <span className="mt-1 block">Phone: {order.phone}</span>}</address><div className="flex items-center">{next ? <form action={updateSellerOrderStatusForm}><input type="hidden" name="orderId" value={order.orderId} /><button name="status" value={next} className="button-light whitespace-nowrap">Mark {next.toLowerCase()}</button></form> : <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-sm text-emerald-100">Delivered</span>}</div></article>; })}{!sellerOrders.length && <p className="border border-white/10 p-12 text-center text-white/45">Paid orders will appear here after verification.</p>}</div></section>

        <section id="analytics" className="mt-16 grid gap-6 lg:grid-cols-2"><div className="border border-white/10 p-7"><h2 className="font-serif text-3xl">Verified sales summary</h2><dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between border-b border-white/10 pb-3"><dt className="text-white/45">Paid order items</dt><dd>{snapshot.sales.length}</dd></div><div className="flex justify-between border-b border-white/10 pb-3"><dt className="text-white/45">Seller earnings</dt><dd>{formatPrice(revenue)}</dd></div></dl></div><div className="border border-white/10 p-7"><h2 className="font-serif text-3xl">Top artworks</h2><ol className="mt-6 space-y-4">{[...snapshot.artworks].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((artwork, index) => <li key={artwork.id} className="flex justify-between border-b border-white/10 pb-3"><span>{index + 1}. {artwork.title}</span><span className="text-white/40">{artwork.viewCount} views</span></li>)}</ol></div></section>

        <section id="payouts" className="mt-16 border border-white/10 p-7"><h2 className="font-serif text-4xl">Payouts</h2><p className="mt-3 max-w-xl text-sm text-white/45">Gross value, platform fees, payment fees, and seller earnings are tracked per verified order item. Banking details are never stored here.</p><div className="mt-6 space-y-3">{snapshot.payouts.map((payout) => <div key={payout.id} className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3 text-sm"><span>{payout.status}</span><span>{formatPrice(Number(payout.sellerEarnings))} earnings</span></div>)}{!snapshot.payouts.length && <p className="text-sm text-white/35">No payouts scheduled.</p>}</div></section>
      </main>
    </GalleryShell>
  );
}
