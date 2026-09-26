import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { ArtworkUploadForm } from "@/app/components/SellerForms";
import { Palette, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewArtworkPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    redirect("/seller");
  }

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <Link
          href="/seller"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary mb-8"
        >
          <ArrowLeft size={14} /> Back to Studio Console
        </Link>

        <div className="max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <Palette size={14} /> Catalog Release
          </p>
          <h1 className="section-title mt-4">
            Upload new <i>artwork.</i>
          </h1>
          <p className="mt-4 text-base text-text-secondary leading-relaxed">
            High-resolution artwork images upload directly to secure cloud storage. Submissions undergo curatorial review before releasing to the public collector catalog.
          </p>
        </div>

        <section className="mt-12 max-w-3xl rounded-2xl border border-border bg-surface p-6 sm:p-10 shadow-xl">
          <ArtworkUploadForm sellerId={session.user.id} />
        </section>
      </main>
    </GalleryShell>
  );
}
