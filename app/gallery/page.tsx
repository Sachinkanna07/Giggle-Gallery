import { auth } from "@/auth";
import { GalleryBrowse } from "@/app/components/GalleryBrowse";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [session, catalog] = await Promise.all([auth(), getMarketplaceCatalog()]);
  const viewer = await getViewerState(session?.user?.id);
  return <GalleryShell><GalleryBrowse artworks={catalog.artworks} viewer={viewer} signedIn={Boolean(session?.user)} databaseReady={catalog.databaseReady}/></GalleryShell>;
}
