import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { FollowArtistButton } from "@/app/components/FollowArtistButton";
import { formatPrice } from "@/app/data";
import { getDb } from "@/db";
import { artistProfiles, auctions, follows } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getArtistBySlug } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArtistBySlug(slug);
  if (!result) return { title: "Artist not found" };
  return { title: result.artist.name, description: result.artist.bio, alternates: { canonical: `/artist/${result.artist.slug}` }, openGraph: { title: `${result.artist.name} | Giggle Gallery`, description: result.artist.bio, images: [result.artist.image] }, twitter: { card: "summary_large_image", title: result.artist.name, description: result.artist.bio, images: [result.artist.image] } };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const result = await getArtistBySlug(slug);
  if (!result) notFound();
  const session = await auth();
  const db = getDb();
  const [owner] = await db.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, result.artist.id)).limit(1);
  const [following] = session?.user?.id ? await db.select({ artistId: follows.artistId }).from(follows).where(and(eq(follows.followerId, session.user.id), eq(follows.artistId, result.artist.id))).limit(1) : [];
  const auctionRows = auctionsEnabled() ? await db.select({ id: auctions.id, status: auctions.status }).from(auctions).where(and(eq(auctions.sellerId, result.artist.id), inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING"]))) : [];
  const favorites = result.artworks.reduce((sum, artwork) => sum + artwork.likes, 0);
  return <GalleryShell><main>
    <section className="relative isolate min-h-[62vh] overflow-hidden px-5 py-24 sm:px-10 lg:px-16">
      <Image src={result.artist.image} alt={`Artwork by ${result.artist.name}`} fill priority sizes="100vw" className="-z-20 object-cover opacity-45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-black/10" />
      <div className="flex min-h-[45vh] flex-col justify-end">
        <p className="eyebrow">{result.artist.location} · {result.artist.discipline}</p>
        <h1 className="section-title mt-6">{result.artist.name}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">{result.artist.bio}</p>
        <div className="mt-6 flex flex-wrap gap-6 text-sm text-white/50"><span>{result.artist.works} published artworks</span><span>{favorites} favorites received</span>{result.artist.joinedAt.getTime() > 0 && <span>Joined {result.artist.joinedAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>}</div>
        {owner?.userId !== session?.user?.id && <div className="mt-6"><FollowArtistButton artistId={result.artist.id} initialFollowing={Boolean(following)} initialCount={result.artist.followerCount} signedIn={Boolean(session?.user)} /></div>}
        {owner?.userId === session?.user?.id && <p className="mt-6 text-sm text-white/50">Your public artist profile · Followers: {result.artist.followerCount}</p>}
      </div>
    </section>
    {auctionRows.length > 0 && <section className="section-shell pt-16"><h2 className="font-serif text-4xl">Auctions by this artist</h2><div className="mt-6 flex flex-wrap gap-3">{auctionRows.map((auction) => <Link key={auction.id} href={`/auctions/${auction.id}`} className="button-outline">{auction.status.replaceAll("_", " ")} auction</Link>)}</div></section>}
    <section className="section-shell py-20"><h2 className="font-serif text-5xl">Published artwork</h2>{result.artworks.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{result.artworks.map((artwork) => <Link href={`/artwork/${artwork.slug}`} key={artwork.id} className="group"><div className="relative aspect-[4/5] overflow-hidden"><Image src={artwork.image} alt={`${artwork.title} by ${result.artist.name}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /></div><div className="mt-4 flex justify-between gap-4"><div><h3 className="font-serif text-2xl">{artwork.title}</h3><p className="text-sm text-white/45">{artwork.year} · {artwork.medium} · {artwork.likes} favorites</p></div><span className="text-sm font-semibold">{formatPrice(artwork.price)}</span></div></Link>)}</div> : <p className="mt-8 border border-white/10 p-10 text-white/45">No published artwork is available from this artist yet.</p>}</section>
  </main></GalleryShell>;
}
