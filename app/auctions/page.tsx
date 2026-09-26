import Image from "next/image";
import Link from "next/link";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { AuctionCountdown } from "@/app/components/AuctionCountdown";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, artworkImages, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";

export const dynamic = "force-dynamic";
const views = ["live", "upcoming", "ending", "ended"] as const;
type View = (typeof views)[number];

export default async function AuctionsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const enabled = auctionsEnabled();
  const params = await searchParams;
  const view: View = views.includes(params.view as View) ? params.view as View : "live";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100).toLowerCase() : "";
  if (enabled) await settleDueAuctions();
  const db = getDb();
  const rows = enabled ? await db.select({ id: auctions.id, status: auctions.status, startsAt: auctions.startsAt, endsAt: auctions.endsAt, current: auctions.currentBidPaise, opening: auctions.openingBidPaise, title: artworks.title, artist: artistProfiles.displayName, image: artworkImages.url }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id)).leftJoin(artworkImages, and(eq(artworkImages.artworkId, artworks.id), eq(artworkImages.sortOrder, 0))).where(inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING", "SOLD", "UNSOLD", "PAYMENT_EXPIRED"])).orderBy(asc(auctions.endsAt)).limit(100) : [];
  const bidCounts = rows.length ? await db.select({ auctionId: auctionBids.auctionId, value: count() }).from(auctionBids).where(inArray(auctionBids.auctionId, rows.map((row) => row.id))).groupBy(auctionBids.auctionId) : [];
  const bidCountByAuction = new Map(bidCounts.map((row) => [row.auctionId, Number(row.value)]));
  // Server-rendered dynamic page; time only determines the current discovery tab.
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
  return <GalleryShell><main className="section-shell py-16 lg:py-24"><p className="eyebrow">Test mode</p><h1 className="section-title mt-6">Live art <i>auctions.</i></h1>{!enabled ? <p className="mt-6 max-w-xl text-white/55">Auctions are not enabled in this environment.</p> : <><p className="mt-5 max-w-2xl text-white/55">Bid on published single-edition artwork. The server decides the winning bid and provides a 24-hour test payment window.</p><nav aria-label="Auction filters" className="mt-9 flex flex-wrap gap-2">{views.map((item) => <Link key={item} href={`/auctions?view=${item}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={view === item ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm capitalize ${view === item ? "border-cobalt-light text-white" : "border-white/15 text-white/55"}`}>{item === "ending" ? "Ending soon" : item}</Link>)}</nav><form method="get" className="mt-6 flex max-w-xl gap-3"><input type="hidden" name="view" value={view} /><label className="sr-only" htmlFor="auction-search">Search auctions</label><input id="auction-search" name="q" defaultValue={typeof params.q === "string" ? params.q : ""} maxLength={100} className="field min-w-0 flex-1" placeholder="Search artwork title" /><button className="button-outline">Search</button></form><p className="mt-5 text-sm text-white/45">{filtered.length} {filtered.length === 1 ? "auction" : "auctions"}</p><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((row) => <Link key={row.id} href={`/auctions/${row.id}`} className="group overflow-hidden border border-white/10 hover:border-cobalt-light/55">{row.image && <div className="relative aspect-[4/3] overflow-hidden"><Image src={row.image} alt={row.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div>}<div className="p-6"><p className="text-xs uppercase tracking-wider text-cobalt-light">Auction · {row.status.replaceAll("_", " ")}</p><h2 className="mt-3 font-serif text-3xl">{row.title}</h2><p className="mt-1 text-sm text-white/45">by {row.artist}</p><p className="mt-4 text-sm text-white/60">{row.current === null ? "Opening bid" : "Highest bid"} ₹{(Number(row.current ?? row.opening) / 100).toLocaleString("en-IN")} · {bidCountByAuction.get(row.id) ?? 0} bids</p><p className="mt-2 text-xs text-white/40">{row.status === "SCHEDULED" ? <>Starts in <AuctionCountdown target={row.startsAt.toISOString()} serverNow={serverNow} completeLabel="Starting" /></> : row.status === "LIVE" ? <>Ends in <AuctionCountdown target={row.endsAt.toISOString()} serverNow={serverNow} /></> : `Ended ${row.endsAt.toLocaleString("en-IN")}`}</p></div></Link>)}{!filtered.length && <p className="border border-white/10 p-10 text-white/45">No auctions match this view yet.</p>}</div></>}</main></GalleryShell>;
}
