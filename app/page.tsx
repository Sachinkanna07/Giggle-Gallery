import { GalleryExperience } from "./components/GalleryExperience";
import { asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawParams = await searchParams;
  const initialFilters = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const [session, catalog] = await Promise.all([auth(), getMarketplaceCatalog()]);
  const viewer = await getViewerState(session?.user?.id);
  const auctionsAvailable = auctionsEnabled();
  const featuredAuctions = auctionsAvailable ? await getDb().select({ id: auctions.id, status: auctions.status, title: artworks.title, end: auctions.endsAt, current: auctions.currentBidPaise, opening: auctions.openingBidPaise }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(inArray(auctions.status, ["SCHEDULED", "LIVE"])).orderBy(asc(auctions.endsAt)).limit(4) : [];
  return <GalleryExperience initialArtworks={catalog.artworks} artists={catalog.artists} viewer={viewer} user={session?.user ?? null} databaseReady={catalog.databaseReady} auctionsAvailable={auctionsAvailable} initialFilters={initialFilters} featuredAuctions={featuredAuctions.map((auction) => ({ id: auction.id, title: auction.title, status: auction.status, end: auction.end.toISOString(), currentBidPaise: String(auction.current ?? auction.opening) }))} />;
}
