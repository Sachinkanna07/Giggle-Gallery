import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getMarketplaceCatalog } from "@/lib/marketplace-data";
import { searchArtworks } from "@/lib/search";
import { getDb, hasDatabase } from "@/db";
import { searchHistory } from "@/db/schema";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.slice(0, 200) ?? "";
  const numberValue = (name: string) => {
    const raw = params.get(name);
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  };
  const catalog = await getMarketplaceCatalog();
  const results = searchArtworks(catalog.artworks, {
    query,
    category: params.get("category") ?? undefined,
    style: params.get("style") ?? undefined,
    mood: params.get("mood") ?? undefined,
    medium: params.get("medium") ?? undefined,
    artist: params.get("artist") ?? undefined,
    year: numberValue("year"),
    availability: params.get("availability") ?? undefined,
    minPrice: numberValue("minPrice"),
    maxPrice: numberValue("maxPrice"),
    sort: (params.get("sort") as "Recommended" | "Trending" | "Newest" | "Popular" | "Price low" | "Price high") ?? "Recommended",
  });
  const session = await auth();
  if (query && session?.user?.id && hasDatabase()) {
    await getDb().insert(searchHistory).values({ userId: session.user.id, query, filters: Object.fromEntries(params), resultCount: results.length });
  }
  return Response.json({ results, databaseReady: catalog.databaseReady }, { headers: { "Cache-Control": session?.user ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300" } });
}
