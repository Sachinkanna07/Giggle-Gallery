import Image from "next/image";
import Link from "next/link";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { AuctionCountdown } from "@/app/components/AuctionCountdown";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, artworkImages, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";
import { Gavel, Search } from "lucide-react";

export const dynamic = "force-dynamic";
const views = ["live", "upcoming", "ending", "ended"] as const;
type View = (typeof views)[number];

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const enabled = auctionsEnabled();
  const params = await searchParams;
  const view: View = views.includes(params.view as View) ? (params.view as View) : "live";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100).toLowerCase() : "";

  if (enabled) await settleDueAuctions();
  const db = getDb();

  const rows = enabled
    ? await db
        .select({
          id: auctions.id,
          status: auctions.status,
          startsAt: auctions.startsAt,
          endsAt: auctions.endsAt,
          current: auctions.currentBidPaise,
          opening: auctions.openingBidPaise,
          title: artworks.title,
          artist: artistProfiles.displayName,
          image: artworkImages.url,
        })
        .from(auctions)
        .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
        .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
        .leftJoin(
          artworkImages,
          and(eq(artworkImages.artworkId, artworks.id), eq(artworkImages.sortOrder, 0))
        )
        .where(
          inArray(auctions.status, [
            "SCHEDULED",
            "LIVE",
            "PAYMENT_PENDING",
            "SOLD",
            "UNSOLD",
            "PAYMENT_EXPIRED",
          ])
        )
        .orderBy(asc(auctions.endsAt))
        .limit(100)
    : [];

  const bidCounts = rows.length
    ? await db
        .select({ auctionId: auctionBids.auctionId, value: count() })
        .from(auctionBids)
        .where(inArray(auctionBids.auctionId, rows.map((row) => row.id)))
        .groupBy(auctionBids.auctionId)
    : [];

  const bidCountByAuction = new Map(bidCounts.map((row) => [row.auctionId, Number(row.value)]));

  // Server-rendered dynamic page; time determines the view categorization
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const filtered = rows.filter((row) => {
    if (q && !row.title.toLowerCase().includes(q)) return false;
    if (view === "upcoming") return row.status === "SCHEDULED" && row.startsAt.getTime() > now;
    if (view === "ending") return row.status === "LIVE" && row.endsAt.getTime() <= now + 3_600_000;
    if (view === "ended") return ["PAYMENT_PENDING", "SOLD", "UNSOLD", "PAYMENT_EXPIRED"].includes(row.status);
    return row.status === "LIVE";
  });

  const serverNow = new Date().toISOString();

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        {/* Header Hero */}
        <div className="max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <Gavel size={14} /> Luxury Digital Auction House
          </p>
          <h1 className="section-title mt-4">
            Live Art <i>Auctions.</i>
          </h1>
          {!enabled ? (
            <p className="mt-4 text-base text-text-secondary">
              Auctions are currently in reserve for this installation.
            </p>
          ) : (
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              Acquire verified original and single-edition digital works in real time. Transparent sequential bidding with Christie&apos;s style 2-minute overtime extensions on closing lots.
            </p>
          )}
        </div>

        {enabled && (
          <>
            {/* View Filter Tabs & Search Controls */}
            <div className="mt-12 flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
              <nav aria-label="Auction views" className="flex flex-wrap gap-2">
                {views.map((item) => {
                  const isActive = view === item;
                  return (
                    <Link
                      key={item}
                      href={`/auctions?view=${item}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                        isActive
                          ? "bg-text-primary text-bg-primary shadow-md"
                          : "border border-border text-text-secondary hover:border-text-primary hover:text-text-primary"
                      }`}
                    >
                      {item === "ending" ? "Closing Soon" : item}
                    </Link>
                  );
                })}
              </nav>

              {/* Keyword Search Field */}
              <form method="get" className="flex w-full max-w-sm gap-2">
                <input type="hidden" name="view" value={view} />
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    name="q"
                    defaultValue={typeof params.q === "string" ? params.q : ""}
                    maxLength={100}
                    placeholder="Search by title..."
                    className="field !py-2 pl-9 text-xs"
                  />
                </div>
                <button type="submit" className="button-outline text-xs !py-2 !px-4">
                  Search
                </button>
              </form>
            </div>

            {/* Auction Cards Grid */}
            <div className="mt-10">
              <p className="mb-6 text-xs text-text-secondary">
                Showing {filtered.length} {filtered.length === 1 ? "auction lot" : "auction lots"}
              </p>

              {filtered.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((row) => {
                    const highestRupees = (
                      Number(row.current ?? row.opening) / 100
                    ).toLocaleString("en-IN");
                    const bids = bidCountByAuction.get(row.id) ?? 0;

                    return (
                      <Link
                        key={row.id}
                        href={`/auctions/${row.id}`}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-accent-secondary/60 hover:shadow-2xl"
                      >
                        {/* Artwork Preview Image */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-secondary">
                          {row.image ? (
                            <Image
                              src={row.image}
                              alt={row.title}
                              fill
                              sizes="(max-width: 640px) 100vw, 33vw"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-text-secondary text-xs">
                              Catalogue Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-black/10" />

                          {/* Status Badge */}
                          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                            {row.status === "LIVE" ? (
                              <>
                                <span className="size-1.5 rounded-full bg-accent animate-ping" />
                                Live Bidding
                              </>
                            ) : (
                              row.status.replaceAll("_", " ")
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-1 flex-col justify-between p-6">
                          <div>
                            <h2 className="font-serif text-2xl text-text-primary group-hover:text-accent-secondary transition-colors">
                              {row.title}
                            </h2>
                            <p className="mt-1 text-xs text-text-secondary">By {row.artist}</p>
                          </div>

                          <div className="mt-6 border-t border-border pt-4">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-text-secondary">
                                {row.current === null ? "Opening Bid" : "Highest Bid"}
                              </span>
                              <strong className="font-serif text-2xl text-text-primary font-normal">
                                ₹{highestRupees}
                              </strong>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                              <span>{bids} {bids === 1 ? "bid" : "bids"} placed</span>
                              <span>
                                {row.status === "SCHEDULED" ? (
                                  <>Starts in <AuctionCountdown target={row.startsAt.toISOString()} serverNow={serverNow} completeLabel="Starting" /></>
                                ) : row.status === "LIVE" ? (
                                  <>Ends in <AuctionCountdown target={row.endsAt.toISOString()} serverNow={serverNow} /></>
                                ) : (
                                  `Ended ${row.endsAt.toLocaleDateString("en-IN")}`
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-border p-16 text-center text-text-secondary">
                  <Gavel size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-serif text-2xl text-text-primary">No auction lots found</p>
                  <p className="mt-1 text-xs">
                    Try switching views or explore upcoming scheduled releases.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </GalleryShell>
  );
}
