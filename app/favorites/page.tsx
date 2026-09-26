import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { AccountShell } from "@/app/components/AccountShell";
import { GalleryShell } from "@/app/components/GalleryShell";
import { formatPrice } from "@/app/data";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";
export default async function FavoritesPage() {
  const session = await auth(); if (!session?.user?.id) return null;
  const [catalog, viewer] = await Promise.all([getMarketplaceCatalog(), getViewerState(session.user.id)]);
  const works = catalog.artworks.filter((item) => viewer.likedIds.includes(item.id));
  return <GalleryShell><AccountShell active="Favorites" eyebrow="Collector space" title="Favorites" description="The works you have liked, gathered in one place.">{works.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{works.map((item) => <Link href={`/artwork/${item.slug}`} key={item.id} className="group"><div className="relative aspect-[4/5] overflow-hidden bg-white/5"><Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-[1.025]"/></div><div className="mt-4 flex justify-between gap-4"><div><h2 className="font-serif text-2xl">{item.title}</h2><p className="text-sm text-white/45">{item.artist}</p></div><p className="text-sm">{formatPrice(item.price)}</p></div></Link>)}</div>:<div className="border border-white/10 bg-white/[.02] p-10 text-center"><h2 className="font-serif text-3xl">No favorites yet.</h2><Link href="/gallery" className="button-light mt-6">Explore the gallery</Link></div>}</AccountShell></GalleryShell>;
}
