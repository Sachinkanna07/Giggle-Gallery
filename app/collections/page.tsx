import { auth } from "@/auth";
import { AccountShell } from "@/app/components/AccountShell";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CollectionsManager } from "@/app/components/CollectionsManager";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";
export default async function CollectionsPage() {
  const session = await auth(); if (!session?.user?.id) return null;
  const [viewer, catalog] = await Promise.all([getViewerState(session.user.id), getMarketplaceCatalog()]);
  const saved = catalog.artworks.filter((artwork) => viewer.savedIds.includes(artwork.id));
  return <GalleryShell><AccountShell active="Collections" eyebrow="Collector space" title="Collections" description="Create and curate considered groups from artwork you have saved."><CollectionsManager initialCollections={viewer.collections} savedArtworks={saved}/></AccountShell></GalleryShell>;
}
