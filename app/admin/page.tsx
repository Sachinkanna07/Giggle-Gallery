import { count, desc, eq } from "drizzle-orm";
import Image from "next/image";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import {
  reviewSellerApplicationForm,
  reviewArtworkForm,
  unpublishArtworkForm,
} from "@/app/actions/marketplace";
import {
  CancelAuctionButton,
  ScheduleAuctionButton,
} from "@/app/components/AuctionManagementForms";
import { formatPrice } from "@/app/data";
import { getDb } from "@/db";
import {
  artistApplications,
  artistProfiles,
  auctionBids,
  auctionPaymentAttempts,
  auctions,
  artworks,
  artworkImages,
  orders,
  users,
} from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { ShieldCheck, Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  const db = getDb();
  const auctionReviewRows = auctionsEnabled()
    ? await db
        .select({
          id: auctions.id,
          title: artworks.title,
          startsAt: auctions.startsAt,
          endsAt: auctions.endsAt,
        })
        .from(auctions)
        .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
        .where(eq(auctions.status, "DRAFT"))
        .orderBy(desc(auctions.createdAt))
    : [];

  const auctionOverviewRows = auctionsEnabled()
    ? await db
        .select({
          id: auctions.id,
          title: artworks.title,
          status: auctions.status,
          startsAt: auctions.startsAt,
          endsAt: auctions.endsAt,
          paymentStatus: auctionPaymentAttempts.status,
        })
        .from(auctions)
        .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
        .leftJoin(auctionPaymentAttempts, eq(auctionPaymentAttempts.auctionId, auctions.id))
        .orderBy(desc(auctions.createdAt))
        .limit(50)
    : [];

  const bidCounts = auctionsEnabled()
    ? await db
        .select({ auctionId: auctionBids.auctionId, value: count() })
        .from(auctionBids)
        .groupBy(auctionBids.auctionId)
    : [];

  const bidCountByAuction = new Map(bidCounts.map((row) => [row.auctionId, Number(row.value)]));

  const [
    applications,
    pendingRows,
    publishedRows,
    userCountRows,
    publishedCountRows,
    rejectedCountRows,
    recentOrders,
  ] = await Promise.all([
    db.select().from(artistApplications).orderBy(desc(artistApplications.createdAt)),
    db
      .select({
        id: artworks.id,
        title: artworks.title,
        status: artworks.status,
        price: artworks.price,
        currency: artworks.currency,
        medium: artworks.medium,
        year: artworks.year,
        createdAt: artworks.createdAt,
        publishedAt: artworks.publishedAt,
        displayName: artistProfiles.displayName,
        imageUrl: artworkImages.url,
      })
      .from(artworks)
      .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
      .leftJoin(artworkImages, eq(artworks.id, artworkImages.artworkId))
      .where(eq(artworks.status, "PENDING_REVIEW"))
      .orderBy(desc(artworks.createdAt)),
    db
      .select({
        id: artworks.id,
        title: artworks.title,
        status: artworks.status,
        price: artworks.price,
        currency: artworks.currency,
        medium: artworks.medium,
        year: artworks.year,
        createdAt: artworks.createdAt,
        publishedAt: artworks.publishedAt,
        displayName: artistProfiles.displayName,
        imageUrl: artworkImages.url,
      })
      .from(artworks)
      .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
      .leftJoin(artworkImages, eq(artworks.id, artworkImages.artworkId))
      .where(eq(artworks.status, "PUBLISHED"))
      .orderBy(desc(artworks.publishedAt)),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(artworks).where(eq(artworks.status, "PUBLISHED")),
    db.select({ value: count() }).from(artworks).where(eq(artworks.status, "REJECTED")),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(25),
  ]);

  // Deduplicate artworks
  const seen = new Set<string>();
  const pendingArtworks = pendingRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const publishedSeen = new Set<string>();
  const publishedArtworks = publishedRows.filter((row) => {
    if (publishedSeen.has(row.id)) return false;
    publishedSeen.add(row.id);
    return true;
  });

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-16">
        {/* Header Bar */}
        <div className="border-b border-border pb-8">
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck size={14} /> Operational Control Center
          </p>
          <h1 className="section-title mt-3">
            Admin <i>Review.</i>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Moderation queues, platform metrics, and regulatory settlement oversight.
          </p>
        </div>

        {/* SECTION 1: PLATFORM OVERVIEW METRICS */}
        <section aria-label="Marketplace overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Registered Users</p>
            <p className="font-serif text-3xl sm:text-4xl text-text-primary mt-2">
              {Number(userCountRows[0]?.value ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Published Catalog</p>
            <p className="font-serif text-3xl sm:text-4xl text-text-primary mt-2">
              {Number(publishedCountRows[0]?.value ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Rejected Works</p>
            <p className="font-serif text-3xl sm:text-4xl text-rose-300 mt-2">
              {Number(rejectedCountRows[0]?.value ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Recent Orders</p>
            <p className="font-serif text-3xl sm:text-4xl text-text-primary mt-2">
              {recentOrders.length}
            </p>
          </div>
        </section>

        {/* SECTION 2: AUCTION APPROVAL & OVERSIGHT */}
        {auctionsEnabled() && (
          <section className="space-y-8">
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
              <h2 className="font-serif text-3xl text-text-primary flex items-center gap-2">
                <Gavel size={20} className="text-accent-secondary" /> Auction Approvals
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Scheduling reserves a single-stock artwork and is locked against concurrent payment attempts.
              </p>

              <div className="mt-6 space-y-3">
                {auctionReviewRows.map((auction) => (
                  <article
                    key={auction.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-surface-elevated/40 p-4"
                  >
                    <div>
                      <h3 className="font-serif text-xl text-text-primary">{auction.title}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {auction.startsAt.toLocaleString("en-IN")} → {auction.endsAt.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ScheduleAuctionButton auctionId={auction.id} />
                      <CancelAuctionButton auctionId={auction.id} />
                    </div>
                  </article>
                ))}
                {!auctionReviewRows.length && (
                  <p className="text-xs text-text-secondary py-4">No auction drafts await review.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
              <h2 className="font-serif text-3xl text-text-primary">Auction Oversight Table</h2>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-border text-text-secondary uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3">Artwork</th>
                      <th>State</th>
                      <th>Bids</th>
                      <th>Payment</th>
                      <th>Ends</th>
                      <th>Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auctionOverviewRows.map((auction) => (
                      <tr key={auction.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 font-medium text-text-primary">
                          <a href={`/auctions/${auction.id}`} className="underline underline-offset-4">
                            {auction.title}
                          </a>
                        </td>
                        <td>{auction.status.replaceAll("_", " ")}</td>
                        <td>{bidCountByAuction.get(auction.id) ?? 0}</td>
                        <td>{auction.paymentStatus ?? "—"}</td>
                        <td>{auction.endsAt.toLocaleString("en-IN")}</td>
                        <td>
                          {(auction.status === "DRAFT" || auction.status === "SCHEDULED") && (
                            <CancelAuctionButton auctionId={auction.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: ARTWORK MODERATION QUEUE */}
        <section id="artwork-review" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
          <div className="border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text-primary">Artwork Review Queue</h2>
            <p className="text-xs text-text-secondary">
              Artworks submitted by sellers awaiting curatorial clearance before publishing to catalog.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {pendingArtworks.map((artwork) => (
              <article
                key={artwork.id}
                className="flex flex-col sm:flex-row sm:items-start gap-5 rounded-xl border border-border bg-surface-elevated/40 p-5"
              >
                {artwork.imageUrl && (
                  <div className="relative size-28 shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
                    <Image
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      fill
                      className="object-cover"
                      sizes="112px"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-2xl text-text-primary">{artwork.title}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        by {artwork.displayName} · {artwork.medium} · {artwork.year}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatPrice(Number(artwork.price))} · Submitted{" "}
                        {new Date(artwork.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-0.5 text-[10px] font-semibold text-amber-300 uppercase">
                      Pending Review
                    </span>
                  </div>

                  <form action={reviewArtworkForm} className="mt-5 flex flex-wrap gap-2">
                    <input type="hidden" name="artworkId" value={artwork.id} />
                    <button
                      name="decision"
                      value="PUBLISHED"
                      className="button-light text-xs !py-1.5 !px-4"
                    >
                      Publish
                    </button>
                    <button
                      name="decision"
                      value="REJECTED"
                      className="rounded-full border border-rose-300/30 bg-rose-500/10 px-4 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20 transition"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </article>
            ))}

            {!pendingArtworks.length && (
              <p className="py-12 text-center text-xs text-text-secondary">
                No artworks currently awaiting curatorial review.
              </p>
            )}
          </div>
        </section>

        {/* SECTION 4: PUBLISHED ARTWORKS */}
        <section id="published-artworks" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
          <div className="border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text-primary">Published Artworks Control</h2>
            <p className="text-xs text-text-secondary">
              Unpublishing immediately removes the artwork from discovery without deleting image or order history.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {publishedArtworks.map((artwork) => (
              <article
                key={artwork.id}
                className="flex flex-col sm:flex-row sm:items-start gap-5 rounded-xl border border-border bg-surface-elevated/40 p-5"
              >
                {artwork.imageUrl && (
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
                    <Image
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-xl text-text-primary">{artwork.title}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        by {artwork.displayName} · {formatPrice(Number(artwork.price))}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-semibold text-emerald-300 uppercase">
                      Published
                    </span>
                  </div>

                  <form action={unpublishArtworkForm} className="mt-4">
                    <input type="hidden" name="artworkId" value={artwork.id} />
                    <button className="rounded-full border border-border px-4 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 transition">
                      Unpublish
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 5: ORDERS OVERSIGHT */}
        <section id="orders" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
          <div className="border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text-primary">Orders Oversight</h2>
            <p className="text-xs text-text-secondary">
              Read-only payment settlement and fulfillment status for recent acquisitions.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-border text-text-secondary uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3">Order Number</th>
                  <th>Total</th>
                  <th>Payment Status</th>
                  <th>Fulfillment Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 font-medium text-text-primary font-mono">{order.orderNumber}</td>
                    <td className="font-serif text-sm">{formatPrice(Number(order.total))}</td>
                    <td>
                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] uppercase font-semibold">
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>{order.status}</td>
                    <td className="text-text-secondary">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6: SELLER APPLICATIONS */}
        <section id="seller-applications" className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
          <div className="border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text-primary">Artist Seller Applications</h2>
            <p className="text-xs text-text-secondary">
              Review artist identity, medium, location, and artistic style statements before granting studio privileges.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {applications.map((application) => (
              <article
                key={application.id}
                className="rounded-xl border border-border bg-surface-elevated/40 p-6 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-2xl text-text-primary">{application.displayName}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {application.fullName} · {application.city}, {application.country} · {application.artStyle}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-0.5 text-[10px] uppercase font-semibold text-text-secondary">
                    {application.status.replaceAll("_", " ")}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-text-secondary max-w-3xl">
                  {application.biography}
                </p>

                {application.status === "PENDING" || application.status === "NEEDS_REVIEW" ? (
                  <form action={reviewSellerApplicationForm} className="mt-4 flex flex-wrap gap-2 pt-2">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <button
                      name="decision"
                      value="APPROVED"
                      className="button-light text-xs !py-1.5 !px-4"
                    >
                      Approve
                    </button>
                    <button
                      name="decision"
                      value="NEEDS_REVIEW"
                      className="button-outline text-xs !py-1.5 !px-4"
                    >
                      Needs Review
                    </button>
                    <button
                      name="decision"
                      value="REJECTED"
                      className="rounded-full border border-rose-300/30 bg-rose-500/10 px-4 py-1.5 text-xs text-rose-200"
                    >
                      Reject
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-text-secondary pt-2">
                    Review finalized. Resubmission required for reassessment.
                  </p>
                )}
              </article>
            ))}

            {!applications.length && (
              <p className="py-12 text-center text-xs text-text-secondary">
                No artist applications currently in the queue.
              </p>
            )}
          </div>
        </section>
      </main>
    </GalleryShell>
  );
}
