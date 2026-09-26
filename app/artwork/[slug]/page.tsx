import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { ArtworkPageActions } from "@/app/components/ArtworkPageActions";
import { getDb, hasDatabase } from "@/db";
import { auctions } from "@/db/schema";
import { formatPrice, recommendationReason } from "@/app/data";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getArtworkBySlug, getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);
  if (!artwork) return { title: "Artwork not found | Giggle Gallery" };
  return { title: `${artwork.title} by ${artwork.artist}`, description: artwork.description, alternates: { canonical: `/artwork/${artwork.slug}` }, openGraph: { title: artwork.title, description: artwork.description, type: "article", images: [artwork.image] }, twitter: { card: "summary_large_image", title: artwork.title, description: artwork.description, images: [artwork.image] } };
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([getMarketplaceCatalog(), auth()]);
  const artwork = catalog.artworks.find((item) => item.slug === slug);
  if (!artwork) notFound();
  const viewer = await getViewerState(session?.user?.id);
  const artist = catalog.artists.find((item) => item.id === artwork.artistId);
  const [auction] = auctionsEnabled() && artwork.availability === "RESERVED" ? await getDb().select({ id: auctions.id, status: auctions.status }).from(auctions).where(and(eq(auctions.artworkId, artwork.id), inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING"]))).limit(1) : [];
  return <GalleryShell><main className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1.12fr_.88fr]">
    <div className="relative min-h-[60vh] bg-black lg:min-h-[calc(100vh-5rem)]"><Image src={artwork.image} alt={`${artwork.title} by ${artwork.artist}`} fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" /></div>
    <article className="flex flex-col p-7 sm:p-12 lg:p-16">
      <p className="eyebrow">{artwork.style} · {artwork.mood}</p>
      <h1 className="mt-5 font-serif text-5xl leading-[.95] tracking-[-.055em] sm:text-6xl">{artwork.title}</h1>
      <Link href={artist ? `/artist/${artist.slug}` : "/#artists"} className="mt-5 text-white/55 underline decoration-white/20 underline-offset-4">{artwork.artist}, {artwork.location}</Link>
      <p className="mt-8 leading-relaxed text-white/65">{artwork.description}</p>
      <blockquote className="my-8 border-l border-cobalt-light pl-5 font-serif text-2xl italic">“{artwork.artistStatement}”</blockquote>
      <dl className="grid grid-cols-2 gap-5 border-y border-white/10 py-6 text-sm"><div><dt className="text-white/35">Medium</dt><dd className="mt-1">{artwork.medium}</dd></div><div><dt className="text-white/35">Year</dt><dd className="mt-1">{artwork.year}</dd></div><div><dt className="text-white/35">Dimensions</dt><dd className="mt-1">{artwork.dimensions}</dd></div><div><dt className="text-white/35">Availability</dt><dd className="mt-1">{auction ? "Auction reserved" : artwork.availability?.replaceAll("_", " ")}</dd></div><div><dt className="text-white/35">Likes</dt><dd className="mt-1">{artwork.likes}</dd></div><div><dt className="text-white/35">Signed-in views</dt><dd className="mt-1">{artwork.views}</dd></div></dl>
      {auction && <Link href={`/auctions/${auction.id}`} className="button-outline mt-6">View {auction.status.toLowerCase().replaceAll("_", " ")} auction</Link>}
      <div className="mt-6 border border-cobalt-light/20 bg-cobalt/[.08] p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-cobalt-light"><Sparkles size={14} /> Why it fits</p><p className="mt-2 text-sm text-white/65">{recommendationReason(artwork, viewer.preferences)}</p></div>
      <div className="mt-auto pt-8"><div className="mb-5 flex items-end justify-between"><span className="text-sm text-white/45">{artwork.type === "DIGITAL" ? "Licensed digital edition" : "Insured delivery"}</span><strong className="font-serif text-3xl font-normal">{formatPrice(artwork.price)}</strong></div><ArtworkPageActions artworkId={artwork.id} initialLiked={viewer.likedIds.includes(artwork.id)} initialLikeCount={artwork.likes} initialSaved={viewer.savedIds.includes(artwork.id)} signedIn={Boolean(session?.user)} persistenceReady={hasDatabase()} available={artwork.availability === "AVAILABLE" && (artwork.stock ?? 0) > 0} /></div>
    </article>
  </main></GalleryShell>;
}
