import Image from "next/image";
import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { AuctionDraftForm } from "@/app/components/AuctionManagementForms";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctions, artworkImages, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { Gavel, ArrowLeft, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerAuctionsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return null;
  }
  const [artist] = await getDb()
    .select({ id: artistProfiles.id })
    .from(artistProfiles)
    .where(eq(artistProfiles.userId, session.user.id))
    .limit(1);
  if (!artist) return null;

  const enabled = auctionsEnabled();
  const [eligible, records] = enabled
    ? await Promise.all([
        getDb()
          .select({ id: artworks.id, title: artworks.title })
          .from(artworks)
          .where(
            and(
              eq(artworks.artistId, artist.id),
              eq(artworks.status, "PUBLISHED"),
              eq(artworks.availability, "AVAILABLE"),
              eq(artworks.stock, 1),
              eq(artworks.currency, "INR")
            )
          ),
        getDb()
          .select({
            id: auctions.id,
            status: auctions.status,
            createdAt: auctions.createdAt,
            startsAt: auctions.startsAt,
            endsAt: auctions.endsAt,
            current: auctions.currentBidPaise,
            opening: auctions.openingBidPaise,
            winnerId: auctions.winnerId,
            title: artworks.title,
            image: artworkImages.url,
          })
          .from(auctions)
          .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
          .leftJoin(
            artworkImages,
            and(eq(artworkImages.artworkId, artworks.id), eq(artworkImages.sortOrder, 0))
          )
          .where(eq(auctions.sellerId, artist.id))
          .orderBy(desc(auctions.createdAt)),
      ])
    : [[], []];

  const bidCounts = records.length
    ? await getDb()
        .select({ auctionId: auctionBids.auctionId, value: count() })
        .from(auctionBids)
        .where(inArray(auctionBids.auctionId, records.map((row) => row.id)))
        .groupBy(auctionBids.auctionId)
    : [];
  const bidCountByAuction = new Map(bidCounts.map((row) => [row.auctionId, Number(row.value)]));

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-12">
        <Link
          href="/seller"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Back to Studio Console
        </Link>

        <div className="max-w-3xl border-b border-border pb-8">
          <p className="eyebrow flex items-center gap-2">
            <Gavel size={14} /> Studio Auction Engine
          </p>
          <h1 className="section-title mt-4">
            Auction <i>Studio.</i>
          </h1>
          {!enabled ? (
            <p className="mt-4 text-sm text-text-secondary">Auctions are disabled in this environment.</p>
          ) : (
            <p className="mt-4 text-base text-text-secondary leading-relaxed">
              Initiate single-lot auction releases for published 1-of-1 creations. Drafts undergo curatorial scheduling review before going live in the bidding room.
            </p>
          )}
        </div>

        {enabled && (
          <>
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 max-w-3xl shadow-xl">
              <h2 className="font-serif text-2xl text-text-primary mb-4 flex items-center gap-2">
                <Plus size={18} className="text-accent-secondary" /> Draft a New Auction Lot
              </h2>
              <AuctionDraftForm eligible={eligible} />
            </div>

            <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
              <h2 className="font-serif text-3xl text-text-primary border-b border-border pb-4">
                Your Studio Auction Lots
              </h2>

              <ul className="mt-6 space-y-4">
                {records.map((item) => (
                  <li
                    key={item.id}
                    className="grid gap-5 rounded-xl border border-border bg-surface-elevated/40 p-5 sm:grid-cols-[6rem_1fr_auto] sm:items-center"
                  >
                    {item.image ? (
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-bg-secondary">
                        <Image src={item.image} alt={item.title} fill sizes="96px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg bg-surface-elevated flex items-center justify-center text-xs text-text-secondary">
                        No Image
                      </div>
                    )}
                    <div>
                      <p className="font-serif text-2xl text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        Status: <strong className="text-text-primary uppercase">{item.status.replaceAll("_", " ")}</strong> · {bidCountByAuction.get(item.id) ?? 0} bids · {item.current === null ? "Opening" : "Current"} ₹{(Number(item.current ?? item.opening) / 100).toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {item.startsAt.toLocaleDateString("en-IN")} to {item.endsAt.toLocaleDateString("en-IN")}
                        {item.winnerId ? " · Winner selected" : ""}
                      </p>
                    </div>
                    {item.status !== "DRAFT" && item.status !== "CANCELLED" && (
                      <Link className="button-outline text-xs !py-2 !px-4 whitespace-nowrap" href={`/auctions/${item.id}`}>
                        View Room
                      </Link>
                    )}
                  </li>
                ))}
                {!records.length && (
                  <li className="py-8 text-center text-xs text-text-secondary">
                    No auction records created yet.
                  </li>
                )}
              </ul>
            </section>
          </>
        )}
      </main>
    </GalleryShell>
  );
}
