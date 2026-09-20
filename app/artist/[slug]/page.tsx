import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GalleryShell } from "@/app/components/GalleryShell";
import { formatPrice } from "@/app/data";
import { getArtistBySlug } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArtistBySlug(slug);
  if (!result) return { title: "Artist not found" };
  return {
    title: result.artist.name,
    description: result.artist.bio,
    alternates: { canonical: `/artist/${result.artist.slug}` },
    openGraph: { title: `${result.artist.name} | Giggle Gallery`, description: result.artist.bio, images: [result.artist.image] },
    twitter: { card: "summary_large_image", title: result.artist.name, description: result.artist.bio, images: [result.artist.image] },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const result = await getArtistBySlug(slug);
  if (!result) notFound();
  return <GalleryShell><main><section className="relative isolate min-h-[62vh] overflow-hidden px-5 py-24 sm:px-10 lg:px-16"><Image src={result.artist.image} alt={`Artwork by ${result.artist.name}`} fill priority sizes="100vw" className="-z-20 object-cover opacity-45" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-black/10" /><div className="flex min-h-[45vh] flex-col justify-end"><p className="eyebrow">{result.artist.location} · {result.artist.discipline}</p><h1 className="section-title mt-6">{result.artist.name}</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">{result.artist.bio}</p><div className="mt-6 flex flex-wrap gap-6 text-sm text-white/50"><span>{result.artist.followerCount} followers</span><span>{result.artist.works} published artworks</span><span>{result.artist.rating.toFixed(1)} rating</span>{result.artist.joinedAt.getTime() > 0 && <span>Joined {result.artist.joinedAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>}</div></div></section><section className="section-shell py-20"><h2 className="font-serif text-5xl">Published artwork</h2>{result.artworks.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{result.artworks.map((artwork) => <Link href={`/artwork/${artwork.slug}`} key={artwork.id} className="group"><div className="relative aspect-[4/5] overflow-hidden"><Image src={artwork.image} alt={`${artwork.title} by ${result.artist.name}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /></div><div className="mt-4 flex justify-between gap-4"><div><h3 className="font-serif text-2xl">{artwork.title}</h3><p className="text-sm text-white/45">{artwork.year} · {artwork.medium}</p></div><span className="text-sm font-semibold">{formatPrice(artwork.price)}</span></div></Link>)}</div> : <p className="mt-8 border border-white/10 p-10 text-white/45">No published artwork is available from this artist yet.</p>}</section></main></GalleryShell>;
}
