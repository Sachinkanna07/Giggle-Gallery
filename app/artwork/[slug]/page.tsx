import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { ArtworkPageActions } from "@/app/components/ArtworkPageActions";
import { FollowArtistButton } from "@/app/components/FollowArtistButton";
import { getDb, hasDatabase } from "@/db";
import { auctions } from "@/db/schema";
import { formatPrice, recommendationReason } from "@/app/data";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getArtworkBySlug, getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artwork = await getArtworkBySlug((await params).slug);
  if (!artwork) return { title: "Artwork not found | Giggle Gallery" };
  return { title: `${artwork.title} by ${artwork.artist}`, description: artwork.description, alternates: { canonical: `/artwork/${artwork.slug}` }, openGraph: { title: artwork.title, description: artwork.description, type: "article", images: [artwork.image] } };
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([getMarketplaceCatalog(), auth()]);
  const artwork = catalog.artworks.find((item) => item.slug === slug);
  if (!artwork) notFound();
  const viewer = await getViewerState(session?.user?.id);
  const artist = catalog.artists.find((item) => item.id === artwork.artistId);
  const similar = catalog.artworks.filter((item) => item.id !== artwork.id && (item.artistId === artwork.artistId || item.style === artwork.style || item.mood === artwork.mood)).slice(0, 3);
  const [auction] = auctionsEnabled() && artwork.availability === "RESERVED" ? await getDb().select({ id: auctions.id, status: auctions.status }).from(auctions).where(and(eq(auctions.artworkId, artwork.id), inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING"]))).limit(1) : [];
  return <GalleryShell><main className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-12">
    <nav className="mb-6 text-xs text-white/40"><Link href="/gallery" className="hover:text-white">Gallery</Link> <span className="mx-2">/</span> {artist && <><Link href={`/artist/${artist.slug}`} className="hover:text-white">{artist.name}</Link><span className="mx-2">/</span></>}<span className="text-white/70">{artwork.title}</span></nav>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(21rem,.75fr)] lg:gap-12">
      <div className="relative min-h-[62vh] overflow-hidden bg-black lg:min-h-[78vh]"><Image src={artwork.image} alt={`${artwork.title} by ${artwork.artist}`} fill priority sizes="(max-width: 1024px) 100vw, 65vw" className="object-contain"/></div>
      <aside className="h-fit lg:sticky lg:top-24"><p className="eyebrow">{artwork.style} · {artwork.mood}</p><h1 className="mt-4 font-serif text-5xl leading-[.93] tracking-[-.055em]">{artwork.title}</h1><div className="mt-5 flex items-center justify-between gap-4"><Link href={artist ? `/artist/${artist.slug}` : "/gallery"} className="text-white/60 underline decoration-white/20 underline-offset-4">{artwork.artist}, {artwork.location}</Link>{artist && <FollowArtistButton artistId={artist.id} initialFollowing={viewer.followedArtistIds.includes(artist.id)} initialCount={artist.followerCount} signedIn={Boolean(session?.user)}/>}</div><div className="my-7 border-y border-white/10 py-6"><p className="font-serif text-3xl">{formatPrice(artwork.price)}</p><p className="mt-2 text-sm text-white/45">{artwork.type === "DIGITAL" ? "Licensed digital delivery" : "Insured shipping calculated at checkout"}</p><p className="mt-1 text-sm text-white/45">{artwork.stock ?? 0} available</p></div>{auction && <Link href={`/auctions/${auction.id}`} className="button-outline mb-5 w-full">View {auction.status.toLowerCase().replaceAll("_", " ")} auction</Link>}<ArtworkPageActions artworkId={artwork.id} initialLiked={viewer.likedIds.includes(artwork.id)} initialLikeCount={artwork.likes} initialSaved={viewer.savedIds.includes(artwork.id)} signedIn={Boolean(session?.user)} persistenceReady={hasDatabase()} available={artwork.availability === "AVAILABLE" && (artwork.stock ?? 0) > 0}/><dl className="mt-7 grid grid-cols-2 gap-5 border-t border-white/10 pt-6 text-sm"><Meta label="Medium" value={artwork.medium}/><Meta label="Year" value={String(artwork.year)}/><Meta label="Dimensions" value={artwork.dimensions}/><Meta label="Availability" value={artwork.availability?.replaceAll("_", " ") ?? "On request"}/></dl></aside>
    </div>
    <div className="grid gap-12 border-t border-white/10 py-16 lg:grid-cols-2"><section><p className="eyebrow">About the work</p><h2 className="mt-3 font-serif text-3xl">A closer look</h2><p className="mt-5 max-w-2xl leading-relaxed text-white/65">{artwork.description}</p><blockquote className="mt-8 border-l border-cobalt-light pl-5 font-serif text-2xl italic leading-relaxed">“{artwork.artistStatement}”</blockquote></section><section className="border border-cobalt-light/20 bg-cobalt/[.08] p-7"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-cobalt-light"><Sparkles size={14}/> Why it fits</p><p className="mt-4 leading-relaxed text-white/65">{recommendationReason(artwork, viewer.preferences)}</p>{artist && <><h3 className="mt-8 font-serif text-2xl">About {artist.name}</h3><p className="mt-3 text-sm leading-relaxed text-white/60">{artist.bio}</p><Link className="mt-5 inline-block text-sm underline underline-offset-4" href={`/artist/${artist.slug}`}>View artist profile</Link></>}</section></div>
    {similar.length > 0 && <section className="border-t border-white/10 py-16"><p className="eyebrow">Continue discovering</p><h2 className="mt-3 font-serif text-4xl">Similar works</h2><div className="mt-8 grid gap-5 sm:grid-cols-3">{similar.map((item) => <Link href={`/artwork/${item.slug}`} key={item.id} className="group"><div className="relative aspect-[4/5] overflow-hidden bg-white/5"><Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-[1.025]"/></div><h3 className="mt-4 font-serif text-2xl">{item.title}</h3><p className="mt-1 text-sm text-white/45">{item.artist} · {formatPrice(item.price)}</p></Link>)}</div></section>}
  </main></GalleryShell>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wider text-white/35">{label}</dt><dd className="mt-1 text-white/80">{value}</dd></div>; }
