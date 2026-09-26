import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Sparkles, Gavel, ArrowLeft, ArrowUpRight } from "lucide-react";
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
  return {
    title: `${artwork.title} by ${artwork.artist}`,
    description: artwork.description,
    alternates: { canonical: `/artwork/${artwork.slug}` },
    openGraph: {
      title: `${artwork.title} by ${artwork.artist}`,
      description: artwork.description,
      type: "article",
      images: [artwork.image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artwork.title} by ${artwork.artist}`,
      description: artwork.description,
      images: [artwork.image],
    },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([getMarketplaceCatalog(), auth()]);
  const artwork = catalog.artworks.find((item) => item.slug === slug);
  if (!artwork) notFound();

  const viewer = await getViewerState(session?.user?.id);
  const artist = catalog.artists.find((item) => item.id === artwork.artistId);
  const [auction] =
    auctionsEnabled() && artwork.availability === "RESERVED"
      ? await getDb()
          .select({ id: auctions.id, status: auctions.status })
          .from(auctions)
          .where(
            and(
              eq(auctions.artworkId, artwork.id),
              inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING"])
            )
          )
          .limit(1)
      : [];

  const shipping = artwork.type === "PHYSICAL" ? 350 : 0;
  const total = artwork.price + shipping;

  // Phase 24: Dynamic Ambient Tint derived from dominant colors
  const primaryColor = artwork.colors[0]?.toLowerCase() ?? "blue";
  const glowStyle = primaryColor.includes("coral") || primaryColor.includes("red")
    ? "rgba(225, 91, 72, 0.18)"
    : primaryColor.includes("gold") || primaryColor.includes("cream")
    ? "rgba(212, 163, 115, 0.18)"
    : primaryColor.includes("teal") || primaryColor.includes("green")
    ? "rgba(31, 109, 102, 0.2)"
    : "rgba(39, 87, 255, 0.2)";

  return (
    <GalleryShell>
      <main className="relative min-h-[calc(100vh-5rem)]">
        {/* Dynamic artwork ambient spotlight */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] rounded-full blur-[140px] opacity-60"
          style={{ background: glowStyle }}
          aria-hidden="true"
        />

        <div className="section-shell py-8 lg:py-12">
          {/* Back link */}
          <Link
            href="/#gallery"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary mb-8"
          >
            <ArrowLeft size={14} /> Back to Gallery
          </Link>

          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            {/* Left: Dramatic Artwork Viewport */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black/90 shadow-2xl">
              <div className="relative aspect-[4/5] min-h-[50vh] sm:min-h-[65vh] w-full">
                <Image
                  src={artwork.image}
                  alt={`${artwork.title} by ${artwork.artist}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-contain p-4 sm:p-8"
                  style={{ objectPosition: artwork.imagePosition ?? "center" }}
                />
              </div>

              {/* Viewport Floating Badges */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/70">
                <span className="rounded-full bg-black/50 px-3 py-1 backdrop-blur-md">
                  {artwork.dimensions}
                </span>
                <span className="rounded-full bg-black/50 px-3 py-1 backdrop-blur-md">
                  {artwork.type === "DIGITAL" ? "Digital Edition" : "Original Work"}
                </span>
              </div>
            </div>

            {/* Right: Sticky Details & Acquisition Panel */}
            <article className="flex flex-col lg:sticky lg:top-28">
              {/* Category, Mood & Status */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">{artwork.style} · {artwork.mood}</span>
                {auction && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                    <Gavel size={11} /> Live Auction Reserve
                  </span>
                )}
              </div>

              {/* Title & Artist */}
              <h1 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.04em] sm:text-6xl text-text-primary">
                {artwork.title}
              </h1>

              <div className="mt-4 flex items-center gap-2 text-base text-text-secondary">
                <span>By</span>
                <Link
                  href={artist ? `/artist/${artist.slug}` : "/#artists"}
                  className="font-medium text-text-primary underline decoration-border underline-offset-4 hover:text-accent-secondary transition-colors"
                >
                  {artwork.artist}
                </Link>
                <span>· {artwork.location}</span>
              </div>

              {/* Description */}
              <p className="mt-6 text-base leading-relaxed text-text-secondary">
                {artwork.description}
              </p>

              {/* Artist Statement */}
              {artwork.artistStatement && (
                <blockquote className="my-6 border-l-2 border-accent pl-5 font-serif text-xl italic text-text-primary/90 leading-snug">
                  “{artwork.artistStatement}”
                </blockquote>
              )}

              {/* Artwork Matrix */}
              <dl className="grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-text-secondary">Medium</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.medium}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-text-secondary">Year of Creation</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.year}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-text-secondary">Dimensions</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.dimensions}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-text-secondary">Status</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {auction ? "Reserved for Auction" : artwork.availability?.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-text-secondary">Favorites</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.likes.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-text-secondary">Authenticated Views</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.views.toLocaleString("en-IN")}</dd>
                </div>
              </dl>

              {/* Auction Link if Reserved */}
              {auction && (
                <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="font-serif text-lg text-amber-200">This artwork is scheduled for auction.</p>
                  <p className="mt-1 text-xs text-amber-300/80">
                    Bids determine the winning collector under transparent auction house rules.
                  </p>
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="button-light mt-3 !py-2 !px-4 text-xs inline-flex items-center gap-1.5"
                  >
                    Enter auction room <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}

              {/* Personalization Note */}
              <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-secondary">
                  <Sparkles size={14} /> Curatorial Fit
                </p>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {recommendationReason(artwork, viewer.preferences)}
                </p>
              </div>

              {/* Price Transparency Breakdown & Acquisition Controls */}
              <div className="mt-8 border-t border-border pt-6">
                <div className="mb-6 rounded-xl border border-border bg-surface-elevated/40 p-4">
                  <div className="flex items-baseline justify-between text-text-secondary text-sm">
                    <span>Artwork value</span>
                    <span className="font-serif text-2xl text-text-primary">{formatPrice(artwork.price)}</span>
                  </div>
                  {artwork.type === "PHYSICAL" && (
                    <div className="mt-2 flex justify-between text-xs text-text-secondary">
                      <span>Insured white-glove packaging</span>
                      <span>{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
                    </div>
                  )}
                  <div className="mt-3 flex justify-between border-t border-border/60 pt-3 font-semibold text-text-primary">
                    <span>Collector Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <ArtworkPageActions
                  artworkId={artwork.id}
                  initialLiked={viewer.likedIds.includes(artwork.id)}
                  initialLikeCount={artwork.likes}
                  initialSaved={viewer.savedIds.includes(artwork.id)}
                  signedIn={Boolean(session?.user)}
                  persistenceReady={hasDatabase()}
                  available={artwork.availability === "AVAILABLE" && (artwork.stock ?? 0) > 0}
                />
              </div>
            </article>
          </div>
        </div>
      </main>
    </GalleryShell>
  );
}
