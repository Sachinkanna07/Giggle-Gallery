import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { ArtworkUploadForm } from "@/app/components/SellerForms";

export const dynamic = "force-dynamic";

export default async function NewArtworkPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) redirect("/seller");
  return <GalleryShell><main className="section-shell py-16 lg:py-24"><p className="eyebrow">Seller studio</p><h1 className="section-title mt-6">Add a new <i>artwork.</i></h1><p className="mt-6 max-w-2xl text-white/50">Images upload directly to production object storage. New listings remain pending until review.</p><section className="mt-12 max-w-4xl border-t border-white/10 pt-10"><ArtworkUploadForm sellerId={session.user.id} /></section></main></GalleryShell>;
}
