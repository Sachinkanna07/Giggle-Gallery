import Image from "next/image";
import Link from "next/link";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { FollowArtistButton } from "@/app/components/FollowArtistButton";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, artworks, auctions, follows } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { formatPrice } from "@/app/data";
import { Users, Sparkles, Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();

  // 1. Artists followed by the user
  const followedRows = await db
    .select({
      id: artistProfiles.id,
      slug: artistProfiles.slug,
      name: artistProfiles.displayName,
      image: artistProfiles.profileImageUrl,
      discipline: artistProfiles.specialization,
      location: artistProfiles.location,
      bio: artistProfiles.biography,
      followerCount: sql<number>`(select count(*)::int from follows as follower_rows where follower_rows.artist_id = ${artistProfiles.id})`,
      publishedWorkCount: sql<number>`(select count(*)::int from artworks as published_rows where published_rows.artist_id = ${artistProfiles.id} and published_rows.status = 'PUBLISHED')`,
    })
    .from(follows)
    .innerJoin(artistProfiles, eq(follows.artistId, artistProfiles.id))
    .where(eq(follows.followerId, session.user.id));

  const followedIds = followedRows.map((r) => r.id);

  // 2. Recent published works from followed artists
  const recentFromFollowed =
    followedIds.length > 0
      ? await db
          .select({
            id: artworks.id,
            slug: artworks.slug,
            title: artworks.title,
            price: artworks.price,
            image: sql<string>`(select image_url from artwork_images where artwork_images.artwork_id = ${artworks.id} order by sort_order asc limit 1)`,
            artist: artistProfiles.displayName,
            artistId: artworks.artistId,
            year: artworks.year,
            medium: artworks.medium,
          })
          .from(artworks)
          .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
          .where(
            and(
              inArray(artworks.artistId, followedIds),
              eq(artworks.status, "PUBLISHED")
            )
          )
          .limit(6)
      : [];

  // 3. Auctions from followed artists
  const auctionsFromFollowed =
    auctionsEnabled() && followedIds.length > 0
      ? await db
          .select({
            id: auctions.id,
            status: auctions.status,
            current: auctions.currentBidPaise,
            opening: auctions.openingBidPaise,
            endsAt: auctions.endsAt,
            title: artworks.title,
            artist: artistProfiles.displayName,
          })
          .from(auctions)
          .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
          .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
          .where(
            and(
              inArray(auctions.sellerId, followedIds),
              inArray(auctions.status, ["SCHEDULED", "LIVE"])
            )
          )
      : [];

  // 4. Suggested artists (artists user does not follow yet)
  const suggestedRows = await db
    .select({
      id: artistProfiles.id,
      slug: artistProfiles.slug,
      name: artistProfiles.displayName,
      image: artistProfiles.profileImageUrl,
      discipline: artistProfiles.specialization,
      location: artistProfiles.location,
      followerCount: sql<number>`(select count(*)::int from follows as follower_rows where follower_rows.artist_id = ${artistProfiles.id})`,
    })
    .from(artistProfiles)
    .where(
      followedIds.length > 0
        ? notInArray(artistProfiles.id, followedIds)
        : sql`true`
    )
    .limit(3);

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-16">
        {/* Header */}
        <div className="max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <Users size={14} /> Personal Curatorial Circle
          </p>
          <h1 className="section-title mt-4">
            Artists you <i>follow.</i>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Your private gallery stream displaying verified creations and scheduled auction releases from creators in your circle.
          </p>
        </div>

        {/* SECTION A: Auctions from followed artists */}
        {auctionsFromFollowed.length > 0 && (
          <section className="rounded-2xl border border-accent/30 bg-accent/5 p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-secondary">
              <Gavel size={15} /> Active Releases in Your Circle
            </div>
            <h2 className="font-serif text-3xl mt-2 text-text-primary">
              Auctions from artists you follow
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {auctionsFromFollowed.map((auc) => (
                <Link
                  key={auc.id}
                  href={`/auctions/${auc.id}`}
                  className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent-secondary"
                >
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-semibold text-accent-secondary uppercase">
                    {auc.status}
                  </span>
                  <p className="font-serif text-xl mt-3 text-text-primary">{auc.title}</p>
                  <p className="text-xs text-text-secondary mt-1">by {auc.artist}</p>
                  <p className="text-xs text-text-secondary mt-3">
                    Bid: ₹{(Number(auc.current ?? auc.opening) / 100).toLocaleString("en-IN")}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SECTION B: New Works from Artists You Follow */}
        {recentFromFollowed.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface/50 p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-secondary">
              <Sparkles size={15} /> Fresh from the Studio
            </div>
            <h2 className="font-serif text-3xl mt-2 text-text-primary">
              New from artists you follow
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentFromFollowed.map((art) => (
                <Link
                  key={art.id}
                  href={`/artwork/${art.slug}`}
                  className="group rounded-xl border border-border bg-surface overflow-hidden transition hover:border-accent-secondary flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-secondary">
                    <Image
                      src={art.image ?? "/midnight-tide.png"}
                      alt={art.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-serif text-lg text-text-primary group-hover:text-accent-secondary transition-colors">
                        {art.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">by {art.artist}</p>
                    </div>
                    <p className="font-serif text-sm text-text-primary mt-3 font-semibold">
                      {formatPrice(Number(art.price))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SECTION C: Followed Artist Cards */}
        <section>
          <div className="flex items-baseline justify-between border-b border-border pb-4">
            <h2 className="font-serif text-3xl text-text-primary">Following</h2>
            <span className="text-xs text-text-secondary">
              {followedRows.length} {followedRows.length === 1 ? "artist" : "artists"}
            </span>
          </div>

          {followedRows.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {followedRows.map((artist) => (
                <article
                  key={artist.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-border/80 shadow-lg"
                >
                  <Link href={`/artist/${artist.slug}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-bg-secondary">
                      <Image
                        src={artist.image ?? "/blue-thread.png"}
                        alt={`Work by ${artist.name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent opacity-60" />
                    </div>
                    <div className="p-6 pb-2">
                      <p className="text-[11px] uppercase tracking-wider text-accent-secondary">
                        {artist.location ?? "Studio"} · {artist.discipline ?? "Fine Art"}
                      </p>
                      <h3 className="font-serif text-2xl text-text-primary mt-1 group-hover:text-accent-secondary transition-colors">
                        {artist.name}
                      </h3>
                      <p className="mt-2 text-xs text-text-secondary">
                        {artist.publishedWorkCount} published {artist.publishedWorkCount === 1 ? "work" : "works"}
                      </p>
                    </div>
                  </Link>

                  <div className="px-6 pb-6 pt-3 border-t border-border/40 mt-3">
                    <FollowArtistButton
                      artistId={artist.id}
                      initialFollowing
                      initialCount={artist.followerCount}
                      signedIn
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-border p-16 text-center text-text-secondary">
              <Users size={32} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
              <p className="font-serif text-2xl text-text-primary">Your artist circle is empty</p>
              <p className="mt-1 text-xs">
                Explore the gallery or artist index to follow creators whose vision resonates with you.
              </p>
              <Link href="/#artists" className="button-light mt-6 text-xs !py-2 !px-5 inline-block">
                Discover Artists
              </Link>
            </div>
          )}
        </section>

        {/* SECTION C: Suggested Artists (Real Data) */}
        {suggestedRows.length > 0 && (
          <section className="border-t border-border pt-12">
            <h2 className="font-serif text-3xl text-text-primary mb-6">
              Suggested for your collection
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suggestedRows.map((artist) => (
                <div
                  key={artist.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <Link href={`/artist/${artist.slug}`} className="flex items-center gap-3">
                    <div className="relative size-12 overflow-hidden rounded-full bg-bg-secondary">
                      <Image
                        src={artist.image ?? "/blue-thread.png"}
                        alt={artist.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-serif text-lg text-text-primary hover:text-accent-secondary transition">
                        {artist.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {artist.followerCount} followers
                      </p>
                    </div>
                  </Link>
                  <FollowArtistButton
                    artistId={artist.id}
                    initialFollowing={false}
                    initialCount={artist.followerCount}
                    signedIn
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </GalleryShell>
  );
}
