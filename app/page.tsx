import { GalleryExperience } from "./components/GalleryExperience";
import { auth } from "@/auth";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawParams = await searchParams;
  const initialFilters = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const [session, catalog] = await Promise.all([auth(), getMarketplaceCatalog()]);
  const viewer = await getViewerState(session?.user?.id);
  return <GalleryExperience initialArtworks={catalog.artworks} artists={catalog.artists} viewer={viewer} user={session?.user ?? null} databaseReady={catalog.databaseReady} initialFilters={initialFilters} />;
}
