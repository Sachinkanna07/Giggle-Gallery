import { GalleryExperience } from "./components/GalleryExperience";
import { auth } from "@/auth";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [session, catalog] = await Promise.all([auth(), getMarketplaceCatalog()]);
  const viewer = await getViewerState(session?.user?.id);
  return <GalleryExperience initialArtworks={catalog.artworks} artists={catalog.artists} viewer={viewer} user={session?.user ?? null} databaseReady={catalog.databaseReady} />;
}
