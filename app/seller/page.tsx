import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { updateSellerOrderStatusForm } from "@/app/actions/marketplace";
import { GalleryShell } from "@/app/components/GalleryShell";
import { formatPrice } from "@/app/data";
import { getDb } from "@/db";
import { auctions, artworks, follows, likes } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getSellerOrders, getSellerSnapshot } from "@/lib/marketplace-data";
import {
  Palette,
  TrendingUp,
  Gavel,
  Eye,
  Plus,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const nextStatus = {
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
} as const;

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [snapshot, sellerOrders] = await Promise.all([
    getSellerSnapshot(session.user.id),
    getSellerOrders(session.user.id),
  ]);

  if (!snapshot.artist || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return (
      <GalleryShell>
        <main className="section-shell py-24">
          <p className="eyebrow">Seller Studio Verification</p>
          <h1 className="section-title mt-4">
            Your studio is <i>in review.</i>
          </h1>
          <p className="mt-4 max-w-xl text-base text-text-secondary leading-relaxed">
            Professional creator tools unlock once your artist identity and portfolio application are verified by our curatorial team.
          </p>
          <Link href="/sell" className="button-light mt-8 text-xs !py-3 !px-6">
            View Application Status
          </Link>
        </main>
      </GalleryShell>
    );
  }

  const db = getDb();
  const [followerRows, favoriteRows, auctionRows] = await Promise.all([
    db.select({ value: count() }).from(follows).where(eq(follows.artistId, snapshot.artist.id)),
    db
      .select({ value: count() })
      .from(likes)
      .innerJoin(artworks, eq(likes.artworkId, artworks.id))
      .where(eq(artworks.artistId, snapshot.artist.id)),
    auctionsEnabled()
      ? db
          .select({ status: auctions.status, value: count() })
          .from(auctions)
          .where(eq(auctions.sellerId, snapshot.artist.id))
          .groupBy(auctions.status)
      : Promise.resolve([]),
  ]);

  const auctionCount = (statuses: Array<(typeof auctions.$inferSelect)["status"]>) =>
    auctionRows
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + Number(row.value), 0);

  const revenue = snapshot.sales.reduce((sum, sale) => sum + Number(sale.sellerEarnings), 0);
  const statusCount = (status: string) =>
    snapshot.artworks.filter((item) => item.status === status).length;
  const lowStock = snapshot.artworks.filter(
    (item) => item.status === "PUBLISHED" && item.stock <= 1
  ).length;

  const totalFollowers = Number(followerRows[0]?.value ?? 0);
  const totalFavorites = Number(favoriteRows[0]?.value ?? 0);

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-16">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Palette size={14} /> Artist Studio Console
            </p>
            <h1 className="section-title mt-3">
              Studio: <i>{snapshot.artist.displayName}.</i>
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Real-time catalog distribution, verified collector sales, and auction lots.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/seller/artworks/new" className="button-light text-xs !py-2.5 !px-5">
              <Plus size={15} /> Upload Artwork
            </Link>
            {auctionsEnabled() && (
              <Link href="/seller/auctions" className="button-outline text-xs !py-2.5 !px-5">
                <Gavel size={15} /> Auction Studio
              </Link>
            )}
          </div>
        </div>

        {/* Quick Nav Anchors */}
        <nav
          className="flex gap-6 overflow-x-auto border-b border-border pb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary"
          aria-label="Studio sections"
        >
          <a href="#overview" className="hover:text-text-primary transition">Overview</a>
          <a href="#catalog" className="hover:text-text-primary transition">Catalog & Works</a>
          <a href="#orders" className="hover:text-text-primary transition">Paid Orders</a>
          <a href="#signals" className="hover:text-text-primary transition">Collector Signals</a>
        </nav>

        {/* SECTION 1: OVERVIEW METRIC MATRIX (Phase 19) */}
        <section id="overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
            <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
              Verified Revenue
            </span>
            <p className="font-serif text-3xl sm:text-4xl text-text-primary mt-2">
              {formatPrice(revenue)}
            </p>
            <p className="text-[11px] text-text-secondary mt-1">Confirmed bank-settled earnings</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
            <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
              Paid Sales
            </span>
            <p className="font-serif text-3xl sm:text-4xl text-text-primary mt-2">
              {snapshot.sales.length}
            </p>
            <p className="text-[11px] text-text-secondary mt-1">Acquisitions fulfilled</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
            <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
              Studio Following
            </span>
            <p className="font-serif text-3xl sm:text-4xl text-accent-secondary mt-2">
              {totalFollowers}
            </p>
            <p className="text-[11px] text-text-secondary mt-1">Collectors subscribed</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
            <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
              Artwork Saves
            </span>
            <p className="font-serif text-3xl sm:text-4xl text-rose-400 mt-2">
              {totalFavorites}
            </p>
            <p className="text-[11px] text-text-secondary mt-1">Total favorites across catalog</p>
          </div>
        </section>

        {/* Inventory & Status Row */}
        <div className="grid gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-text-secondary">Published Works:</span>
            <strong className="block font-serif text-2xl text-text-primary mt-1">
              {statusCount("PUBLISHED")}
            </strong>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-text-secondary">Pending Review:</span>
            <strong className="block font-serif text-2xl text-amber-300 mt-1">
              {statusCount("PENDING_REVIEW")}
            </strong>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="text-text-secondary">Low Stock Warnings:</span>
            <strong className="block font-serif text-2xl text-rose-300 mt-1">
              {lowStock}
            </strong>
          </div>
          {auctionsEnabled() && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="text-text-secondary">Active Auction Lots:</span>
              <strong className="block font-serif text-2xl text-accent-secondary mt-1">
                {auctionCount(["SCHEDULED", "LIVE", "PAYMENT_PENDING"])}
              </strong>
            </div>
          )}
        </div>

        {/* SECTION 2: CATALOG & WORKS */}
        <section id="catalog" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="font-serif text-3xl text-text-primary">Studio Catalog</h2>
              <p className="text-xs text-text-secondary">Published, draft, and reviewed creations</p>
            </div>
            <Link href="/seller/artworks/new" className="button-outline text-xs !py-1.5 !px-3">
              + New Artwork
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-border text-text-secondary uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3">Title</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Collector Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {snapshot.artworks.map((artwork) => (
                  <tr key={artwork.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 font-medium text-text-primary">{artwork.title}</td>
                    <td>
                      <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-[10px] uppercase font-semibold">
                        {artwork.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{artwork.availability.replaceAll("_", " ")}</td>
                    <td>{artwork.stock}</td>
                    <td className="font-serif text-sm font-medium">
                      {formatPrice(Number(artwork.price))}
                    </td>
                    <td>{artwork.viewCount} views</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!snapshot.artworks.length && (
              <p className="py-12 text-center text-text-secondary text-sm">
                No artworks uploaded to this studio yet. Add your first piece.
              </p>
            )}
          </div>
        </section>

        {/* SECTION 3: PAID ORDERS & FULFILLMENT */}
        <section id="orders" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
          <div className="border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text-primary">Paid Orders & Shipping</h2>
            <p className="text-xs text-text-secondary">
              Only verified bank-cleared acquisitions appear here for packaging and dispatch.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {sellerOrders.map((order) => {
              const next = nextStatus[order.status as keyof typeof nextStatus];
              return (
                <article
                  key={order.id}
                  className="grid gap-6 rounded-xl border border-border bg-surface-elevated/40 p-6 lg:grid-cols-[1.2fr_1fr_auto]"
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-mono">
                      {order.orderNumber} · {order.createdAt.toLocaleDateString("en-IN")}
                    </p>
                    <h3 className="font-serif text-2xl text-text-primary mt-1">{order.title}</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Qty: {order.quantity} · Total: {formatPrice(Number(order.amount))}
                    </p>
                    <p className="mt-2 text-xs text-emerald-400 font-semibold">
                      Payment {order.paymentStatus} · Status: {order.status}
                    </p>
                  </div>

                  <address className="not-italic text-xs leading-relaxed text-text-secondary">
                    <span className="block font-semibold text-text-primary mb-1">
                      Ship to {order.fullName}
                    </span>
                    {order.line1}{order.line2 ? `, ${order.line2}` : ""}<br />
                    {order.city}, {order.state} {order.postalCode}<br />
                    {order.country}
                    {order.phone && <span className="block mt-1 font-mono">Tel: {order.phone}</span>}
                  </address>

                  <div className="flex items-center">
                    {next ? (
                      <form action={updateSellerOrderStatusForm}>
                        <input type="hidden" name="orderId" value={order.orderId} />
                        <button
                          name="status"
                          value={next}
                          className="button-light text-xs !py-2 !px-4 whitespace-nowrap"
                        >
                          Mark as {next.toLowerCase()}
                        </button>
                      </form>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-300">
                        <CheckCircle size={13} /> Delivered
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {!sellerOrders.length && (
              <p className="py-12 text-center text-text-secondary text-sm">
                No orders pending fulfillment. Completed purchases will arrive here directly.
              </p>
            )}
          </div>
        </section>

        {/* SECTION 4: COLLECTOR ATTENTION SIGNALS (Phase 19 Artsy Partner Inspiration) */}
        <section id="signals" className="grid gap-6 lg:grid-cols-2">
          {/* Top Works by Views */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-text-primary flex items-center gap-2">
              <Eye size={18} className="text-accent-secondary" /> Artwork Attention & Traffic
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Pieces receiving the highest authenticated collector impressions
            </p>
            <ol className="mt-6 space-y-3">
              {[...snapshot.artworks]
                .sort((a, b) => b.viewCount - a.viewCount)
                .slice(0, 5)
                .map((art, idx) => (
                  <li
                    key={art.id}
                    className="flex items-center justify-between border-b border-border/40 pb-3 text-xs"
                  >
                    <span className="font-medium text-text-primary">
                      {idx + 1}. {art.title}
                    </span>
                    <span className="text-text-secondary">{art.viewCount} views</span>
                  </li>
                ))}
            </ol>
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Revenue Integrity
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Verified order totals with 0% hidden deductions
            </p>
            <div className="mt-6 space-y-4 text-xs">
              <div className="flex justify-between border-b border-border/40 pb-3">
                <span className="text-text-secondary">Completed order line items</span>
                <span className="font-medium text-text-primary">{snapshot.sales.length}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-3">
                <span className="text-text-secondary">Net artist earnings</span>
                <span className="font-serif text-lg text-text-primary">{formatPrice(revenue)}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </GalleryShell>
  );
}
