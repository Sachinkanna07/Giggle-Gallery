import { eq, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { artistProfiles, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getMarketplaceCatalog } from "@/lib/marketplace-data";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return Response.json({ artworks: [], artists: [], auctions: [] });

  const needle = query.toLocaleLowerCase();
  const catalog = await getMarketplaceCatalog();
  const artworkResults = catalog.artworks
    .filter((item) => [item.title, item.artist, item.category, item.medium, item.style].some((value) => value?.toLocaleLowerCase().includes(needle)))
    .slice(0, 5)
    .map((item) => ({ id: item.id, href: `/artwork/${item.slug}`, title: item.title, subtitle: `${item.artist} · ${item.medium}`, image: item.image }));
  const artistResults = catalog.artists
    .filter((item) => [item.name, item.location, item.discipline].some((value) => value.toLocaleLowerCase().includes(needle)))
    .slice(0, 4)
    .map((item) => ({ id: item.id, href: `/artist/${item.slug}`, title: item.name, subtitle: item.discipline, image: item.image }));

  let auctionResults: Array<{ id: string; href: string; title: string; subtitle: string }> = [];
  if (auctionsEnabled() && hasDatabase()) {
    const rows = await getDb().select({ id: auctions.id, title: artworks.title, artist: artistProfiles.displayName, status: auctions.status })
      .from(auctions)
      .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
      .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
      .where(inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING", "SOLD", "UNSOLD"]))
      .limit(40);
    auctionResults = rows
      .filter((item) => `${item.title} ${item.artist}`.toLocaleLowerCase().includes(needle))
      .slice(0, 4)
      .map((item) => ({ id: item.id, href: `/auctions/${item.id}`, title: item.title, subtitle: `${item.artist} · ${item.status.replaceAll("_", " ")}` }));
  }

  return Response.json({ artworks: artworkResults, artists: artistResults, auctions: auctionResults }, { headers: { "Cache-Control": "private, no-store" } });
}
