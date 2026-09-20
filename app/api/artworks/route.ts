import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getMarketplaceCatalog } from "@/lib/marketplace-data";
import { normalizeArtworkFilters, searchArtworks } from "@/lib/search";
import { getDb, hasDatabase } from "@/db";
import { searchHistory } from "@/db/schema";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = normalizeArtworkFilters(Object.fromEntries(params));
  const catalog = await getMarketplaceCatalog();
  const results = searchArtworks(catalog.artworks, filters);
  const session = await auth();
  if (filters.query && session?.user?.id && hasDatabase()) {
    await getDb().insert(searchHistory).values({ userId: session.user.id, query: filters.query, filters, resultCount: results.length });
  }
  return Response.json({ results, databaseReady: catalog.databaseReady }, { headers: { "Cache-Control": session?.user ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300" } });
}
