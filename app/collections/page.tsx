import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CollectionsManager } from "@/app/components/CollectionsManager";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [viewer, catalog] = await Promise.all([
    getViewerState(session.user.id),
    getMarketplaceCatalog(),
  ]);

  const saved = catalog.artworks.filter((artwork) => viewer.savedIds.includes(artwork.id));

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <Layers size={14} /> Private Collector Museums
          </p>
          <h1 className="section-title mt-4">
            Collections with <i>a point of view.</i>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Curate, organize, and orchestrate private exhibition rooms from the pieces you have saved across your collector journeys.
          </p>
        </div>

        <section className="mt-14">
          <CollectionsManager initialCollections={viewer.collections} savedArtworks={saved} />
        </section>
      </main>
    </GalleryShell>
  );
}
