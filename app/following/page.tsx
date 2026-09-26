import Image from "next/image";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { FollowArtistButton } from "@/app/components/FollowArtistButton";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, follows } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await getDb()
    .select({
      id: artistProfiles.id,
      slug: artistProfiles.slug,
      name: artistProfiles.displayName,
      image: artistProfiles.profileImageUrl,
      followerCount: sql<number>`(select count(*)::int from follows as follower_rows where follower_rows.artist_id = ${artistProfiles.id})`,
      publishedWorkCount: sql<number>`(select count(*)::int from artworks as published_rows where published_rows.artist_id = ${artistProfiles.id} and published_rows.status = 'PUBLISHED')`,
    })
    .from(follows)
    .innerJoin(artistProfiles, eq(follows.artistId, artistProfiles.id))
    .where(eq(follows.followerId, session.user.id));

  return <GalleryShell><main className="section-shell py-16 lg:py-24">
    <p className="eyebrow">Personal gallery</p>
    <h1 className="section-title mt-6">Artists you <i>follow.</i></h1>
    <p className="mt-5 max-w-2xl text-white/55">A private list built only from your saved follow relationships.</p>
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((artist) => <article key={artist.id} className="overflow-hidden border border-white/10">
        <Link href={`/artist/${artist.slug}`} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden bg-white/5"><Image src={artist.image ?? "/blue-thread.png"} alt={`Artwork by ${artist.name}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div>
          <div className="p-6 pb-3"><h2 className="font-serif text-3xl">{artist.name}</h2><p className="mt-2 text-sm text-white/50">{artist.publishedWorkCount} published {artist.publishedWorkCount === 1 ? "work" : "works"}</p></div>
        </Link>
        <div className="px-6 pb-6"><FollowArtistButton artistId={artist.id} initialFollowing initialCount={artist.followerCount} signedIn /></div>
      </article>)}
      {!rows.length && <p className="border border-white/10 p-10 text-white/45">You are not following an artist yet. Visit an artist profile to start your list.</p>}
    </div>
  </main></GalleryShell>;
}
