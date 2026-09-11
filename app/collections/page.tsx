import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CollectionsManager } from "@/app/components/CollectionsManager";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const [viewer, catalog] = await Promise.all([getViewerState(session.user.id), getMarketplaceCatalog()]);
  const saved = catalog.artworks.filter((artwork) => viewer.savedIds.includes(artwork.id));
  return <GalleryShell><main className="section-shell py-16 lg:py-24"><p className="eyebrow">Your little museums</p><h1 className="section-title mt-6">Collections with <i>a point of view.</i></h1><p className="mt-6 max-w-2xl text-white/50">Create, rename, delete, and curate collections from artwork you’ve saved.</p><section className="mt-12"><CollectionsManager initialCollections={viewer.collections} savedArtworks={saved} /></section></main></GalleryShell>;
}
