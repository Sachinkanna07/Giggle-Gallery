import { desc, eq } from "drizzle-orm";
import Image from "next/image";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { reviewSellerApplicationForm, reviewArtworkForm, unpublishArtworkForm } from "@/app/actions/marketplace";
import { formatPrice } from "@/app/data";
import { getDb } from "@/db";
import { artistApplications, artistProfiles, artworks, artworkImages } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  const db = getDb();
  const [applications, pendingRows, publishedRows] = await Promise.all([
    db.select().from(artistApplications).orderBy(desc(artistApplications.createdAt)),
    db
      .select({
        id: artworks.id,
        title: artworks.title,
        status: artworks.status,
        price: artworks.price,
        currency: artworks.currency,
        medium: artworks.medium,
        year: artworks.year,
        createdAt: artworks.createdAt,
        publishedAt: artworks.publishedAt,
        displayName: artistProfiles.displayName,
        imageUrl: artworkImages.url,
      })
      .from(artworks)
      .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
      .leftJoin(artworkImages, eq(artworks.id, artworkImages.artworkId))
      .where(eq(artworks.status, "PENDING_REVIEW"))
      .orderBy(desc(artworks.createdAt)),
    db
      .select({
        id: artworks.id,
        title: artworks.title,
        status: artworks.status,
        price: artworks.price,
        currency: artworks.currency,
        medium: artworks.medium,
        year: artworks.year,
        createdAt: artworks.createdAt,
        publishedAt: artworks.publishedAt,
        displayName: artistProfiles.displayName,
        imageUrl: artworkImages.url,
      })
      .from(artworks)
      .innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id))
      .leftJoin(artworkImages, eq(artworks.id, artworkImages.artworkId))
      .where(eq(artworks.status, "PUBLISHED"))
      .orderBy(desc(artworks.publishedAt)),
  ]);

  // Deduplicate — one row per artwork (leftJoin may repeat for multi-image artworks)
  const seen = new Set<string>();
  const pendingArtworks = pendingRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  const publishedSeen = new Set<string>();
  const publishedArtworks = publishedRows.filter((row) => {
    if (publishedSeen.has(row.id)) return false;
    publishedSeen.add(row.id);
    return true;
  });

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <p className="eyebrow">Protected administration</p>
        <h1 className="section-title mt-6">Admin <i>review.</i></h1>

        {/* ── Artwork Review ────────────────────────────────────────────── */}
        <section id="artwork-review" className="mt-16">
          <h2 className="font-serif text-4xl">Artwork <i>review</i></h2>
          <p className="mt-2 text-sm text-white/45">
            Artworks submitted by sellers and awaiting review before going public.
          </p>
          <div className="mt-8 space-y-5">
            {pendingArtworks.map((artwork) => (
              <article key={artwork.id} className="border border-white/10 p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {artwork.imageUrl && (
                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-sm bg-white/5">
                      <Image
                        src={artwork.imageUrl}
                        alt={artwork.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <h3 className="font-serif text-2xl">{artwork.title}</h3>
                        <p className="mt-1 text-sm text-white/45">
                          by {artwork.displayName} · {artwork.medium} · {artwork.year}
                        </p>
                        <p className="mt-1 text-sm text-white/45">
                          {formatPrice(Number(artwork.price))} · Submitted {new Date(artwork.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="h-fit rounded-full border border-amber-400/25 px-3 py-1 text-xs text-amber-200">
                        PENDING REVIEW
                      </span>
                    </div>
                    <form action={reviewArtworkForm} className="mt-5 flex flex-wrap gap-3">
                      <input type="hidden" name="artworkId" value={artwork.id} />
                      <button name="decision" value="PUBLISHED" className="button-light">
                        Publish
                      </button>
                      <button
                        name="decision"
                        value="REJECTED"
                        className="rounded-full border border-red-300/25 px-5 py-3 text-sm text-red-100"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
            {!pendingArtworks.length && (
              <p className="border border-white/10 p-12 text-center text-white/45">
                No artworks are awaiting review.
              </p>
            )}
          </div>
        </section>

        {/* ── Seller Applications ───────────────────────────────────────── */}
        <section id="published-artworks" className="mt-20">
          <h2 className="font-serif text-4xl">Published <i>artworks</i></h2>
          <p className="mt-2 text-sm text-white/45">Unpublishing removes an artwork from the public catalog without deleting its image or historical records.</p>
          <div className="mt-8 space-y-5">
            {publishedArtworks.map((artwork) => (
              <article key={artwork.id} className="border border-white/10 p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {artwork.imageUrl && <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-sm bg-white/5"><Image src={artwork.imageUrl} alt={artwork.title} fill className="object-cover" sizes="128px" unoptimized /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div><h3 className="font-serif text-2xl">{artwork.title}</h3><p className="mt-1 text-sm text-white/45">by {artwork.displayName} · {artwork.medium} · {artwork.year}</p><p className="mt-1 text-sm text-white/45">{formatPrice(Number(artwork.price))} · Published {new Date(artwork.publishedAt ?? artwork.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                      <span className="h-fit rounded-full border border-emerald-300/25 px-3 py-1 text-xs text-emerald-100">PUBLISHED</span>
                    </div>
                    <form action={unpublishArtworkForm} className="mt-5"><input type="hidden" name="artworkId" value={artwork.id} /><button className="rounded-full border border-red-300/25 px-5 py-3 text-sm text-red-100">Unpublish</button></form>
                  </div>
                </div>
              </article>
            ))}
            {!publishedArtworks.length && <p className="border border-white/10 p-12 text-center text-white/45">No published artworks found.</p>}
          </div>
        </section>

        <section id="seller-applications" className="mt-20">
          <h2 className="font-serif text-4xl">Seller <i>applications</i></h2>
          <div className="mt-8 space-y-5">
            {applications.map((application) => (
              <article key={application.id} className="border border-white/10 p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h3 className="font-serif text-3xl">{application.displayName}</h3>
                    <p className="mt-1 text-sm text-white/45">
                      {application.fullName} · {application.city}, {application.country} · {application.artStyle}
                    </p>
                  </div>
                  <span className="h-fit rounded-full border border-white/15 px-3 py-1 text-xs">
                    {application.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/60">{application.biography}</p>
                {application.status === "PENDING" || application.status === "NEEDS_REVIEW" ? (
                  <form action={reviewSellerApplicationForm} className="mt-6 flex flex-wrap gap-3">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <button name="decision" value="APPROVED" className="button-light">Approve</button>
                    <button name="decision" value="NEEDS_REVIEW" className="button-outline">Needs review</button>
                    <button name="decision" value="REJECTED" className="rounded-full border border-red-300/25 px-5 py-3 text-sm text-red-100">Reject</button>
                  </form>
                ) : (
                  <p className="mt-6 text-sm text-white/40">Review complete. Resubmission is required before another decision.</p>
                )}
              </article>
            ))}
            {!applications.length && (
              <p className="border border-white/10 p-12 text-center text-white/45">No seller applications are waiting.</p>
            )}
          </div>
        </section>
      </main>
    </GalleryShell>
  );
}
