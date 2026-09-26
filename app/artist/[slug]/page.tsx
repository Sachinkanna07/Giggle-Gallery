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
import { Gavel, MapPin, Palette, Layers } from "lucide-react";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArtistBySlug(slug);
  if (!result) return { title: "Artist not found" };
  return {
    title: `${result.artist.name} — Exhibition & Works | Giggle Gallery`,
    description: result.artist.bio,
    alternates: { canonical: `/artist/${result.artist.slug}` },
    openGraph: {
      title: `${result.artist.name} | Giggle Gallery`,
      description: result.artist.bio,
      images: [result.artist.image],
    },
    twitter: {
      card: "summary_large_image",
      title: result.artist.name,
      description: result.artist.bio,
      images: [result.artist.image],
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const result = await getArtistBySlug(slug);
  if (!result) notFound();

  const session = await auth();
  const db = getDb();

  const [owner] = await db
    .select({ userId: artistProfiles.userId })
    .from(artistProfiles)
    .where(eq(artistProfiles.id, result.artist.id))
    .limit(1);

  const [following] = session?.user?.id
    ? await db
        .select({ artistId: follows.artistId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, session.user.id),
            eq(follows.artistId, result.artist.id)
          )
        )
        .limit(1)
    : [];

  const auctionRows = auctionsEnabled()
    ? await db
        .select({ id: auctions.id, status: auctions.status, current: auctions.currentBidPaise, opening: auctions.openingBidPaise, endsAt: auctions.endsAt })
        .from(auctions)
        .where(
          and(
            eq(auctions.sellerId, result.artist.id),
            inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING"])
          )
        )
    : [];

  const favoritesReceived = result.artworks.reduce((sum, artwork) => sum + artwork.likes, 0);

  return (
    <GalleryShell>
      <main className="min-h-screen">
        {/* 1. HERO EXHIBITION BANNER */}
        <section className="relative isolate min-h-[68vh] overflow-hidden px-5 py-24 sm:px-10 lg:px-16 flex flex-col justify-end border-b border-border">
          {/* Background Artwork Montage / Ambient Backdrop */}
          <Image
            src={result.artist.image}
            alt={`Atmosphere of ${result.artist.name}`}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-black/30" />
          <div className="noise absolute inset-0 -z-10 opacity-20 mix-blend-soft-light" />

          <div className="section-shell flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {result.artist.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Palette size={13} /> {result.artist.discipline}
              </span>
            </div>

            <h1 className="mt-4 font-serif text-[clamp(3.5rem,8vw,7rem)] font-light tracking-[-0.04em] text-text-primary leading-[0.9]">
              {result.artist.name}
            </h1>

            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-text-secondary">
              {result.artist.bio}
            </p>

            {/* Stat Counters Bar */}
            <div className="mt-8 flex flex-wrap gap-8 border-y border-border py-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-secondary">Works</p>
                <p className="font-serif text-2xl text-text-primary mt-1">{result.artist.works}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-text-secondary">Followers</p>
                <p className="font-serif text-2xl text-text-primary mt-1">{result.artist.followerCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-text-secondary">Favorites</p>
                <p className="font-serif text-2xl text-text-primary mt-1">{favoritesReceived.toLocaleString("en-IN")}</p>
              </div>
              {auctionRows.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-secondary">Auction Lots</p>
                  <p className="font-serif text-2xl text-accent-secondary mt-1">{auctionRows.length}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {owner?.userId !== session?.user?.id ? (
                <FollowArtistButton
                  artistId={result.artist.id}
                  initialFollowing={Boolean(following)}
                  initialCount={result.artist.followerCount}
                  signedIn={Boolean(session?.user)}
                />
              ) : (
                <span className="rounded-full border border-border px-4 py-2 text-xs text-text-secondary">
                  Your Public Artist Studio
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 2. LIVE AUCTIONS SECTION (If artist has active lots) */}
        {auctionRows.length > 0 && (
          <section className="section-shell py-16 border-b border-border">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-secondary">
              <Gavel size={15} /> Active Auction Lots
            </div>
            <h2 className="font-serif text-4xl mt-3 text-text-primary">
              Live from the <i>studio.</i>
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {auctionRows.map((auction) => (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}`}
                  className="rounded-xl border border-border bg-surface p-6 transition hover:border-accent-secondary"
                >
                  <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold text-accent-secondary uppercase tracking-wider">
                    {auction.status.replaceAll("_", " ")}
                  </span>
                  <p className="mt-4 font-serif text-2xl text-text-primary">Auction Lot</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Ends {new Date(auction.endsAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <span className="button-outline mt-5 text-xs !py-1.5 !px-3 inline-block">
                    Enter bidding room
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3. PUBLISHED EXHIBITION WORKS */}
        <section className="section-shell py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Catalogue Raisonné</p>
              <h2 className="font-serif text-4xl sm:text-5xl mt-2 text-text-primary">
                Available <i>works.</i>
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              {result.artworks.length} {result.artworks.length === 1 ? "exhibition piece" : "exhibition pieces"}
            </p>
          </div>

          {result.artworks.length ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.artworks.map((artwork) => (
                <Link
                  href={`/artwork/${artwork.slug}`}
                  key={artwork.id}
                  className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-accent-secondary/50 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-bg-secondary">
                    <Image
                      src={artwork.image}
                      alt={`${artwork.title} by ${result.artist.name}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-black/10 opacity-70 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                      {artwork.year}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-xl text-text-primary group-hover:text-accent-secondary transition-colors">
                          {artwork.title}
                        </h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          {artwork.medium} · {artwork.likes} saves
                        </p>
                      </div>
                      <span className="font-medium text-sm text-text-primary">
                        {formatPrice(artwork.price)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-border p-12 text-center text-text-secondary">
              <Layers size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-serif text-2xl text-text-primary">No published artwork yet</p>
              <p className="mt-1 text-xs">This artist has not released public catalogue pieces yet.</p>
            </div>
          )}
        </section>
      </main>
    </GalleryShell>
  );
}
