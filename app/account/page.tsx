import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { EmailSettings } from "@/app/account/EmailSettings";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctions, artworks, follows } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getIdentityOverview } from "@/lib/identity/service";
import { getViewerState } from "@/lib/marketplace-data";
import {
  Heart,
  Users,
  Package,
  Gavel,
  Sliders,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const [viewer, params, identity] = await Promise.all([
    getViewerState(session.user.id),
    searchParams,
    getIdentityOverview(session.user.id),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayName = identity?.displayName ?? identity?.name ?? session.user.name ?? "Collector";
  const googleConnected = identity?.providers.includes("google") ?? false;
  const primaryEmail = identity?.email ?? session.user.email ?? "";

  const db = getDb();
  const [followedArtists, bidRows] = await Promise.all([
    db
      .select({ id: artistProfiles.id, slug: artistProfiles.slug, name: artistProfiles.displayName })
      .from(follows)
      .innerJoin(artistProfiles, eq(follows.artistId, artistProfiles.id))
      .where(eq(follows.followerId, session.user.id)),
    auctionsEnabled()
      ? db
          .select({
            auctionId: auctions.id,
            title: artworks.title,
            status: auctions.status,
            current: auctions.currentBidPaise,
            winnerId: auctions.winnerId,
            ownBid: auctionBids.amountPaise,
          })
          .from(auctionBids)
          .innerJoin(auctions, eq(auctionBids.auctionId, auctions.id))
          .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
          .where(eq(auctionBids.bidderId, session.user.id))
          .orderBy(desc(auctionBids.amountPaise))
      : Promise.resolve([]),
  ]);

  const bidMap = new Map<string, (typeof bidRows)[number]>();
  bidRows.forEach((row) => {
    if (!bidMap.has(row.auctionId)) bidMap.set(row.auctionId, row);
  });

  const wonAuctions = [...bidMap.values()].filter(
    (b) => b.winnerId === session.user.id && (b.status === "SOLD" || b.status === "PAYMENT_PENDING")
  );

  const participationLabel = (auction: (typeof bidRows)[number]) => {
    if (auction.status === "SOLD" && auction.winnerId === session.user.id) return "Completed";
    if (auction.status === "PAYMENT_PENDING" && auction.winnerId === session.user.id) return "Won · Payment required";
    if (auction.status === "PAYMENT_EXPIRED" && auction.winnerId === session.user.id) return "Won · Payment expired";
    if (["SOLD", "UNSOLD", "PAYMENT_EXPIRED"].includes(auction.status)) return "Lost";
    if (auction.status === "LIVE" && auction.ownBid === auction.current) return "Highest bidder";
    if (auction.status === "LIVE" && auction.ownBid < (auction.current ?? 0n)) return "Outbid";
    return auction.status.replaceAll("_", " ");
  };

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-16">
        {params.setup === "database" ? (
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-200">
            Connect the production database before account actions can be stored.
          </div>
        ) : null}

        {/* Greeting Hero */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Sparkles size={14} /> Private Collector Suite
            </p>
            <h1 className="section-title mt-3">
              {greeting}, <i>{displayName.split(" ")[0]}.</i>
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Managing your visual taste profile, active bids, and private art collection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/settings" className="button-outline text-xs !py-2 !px-4 flex items-center gap-1.5">
              <Sliders size={14} /> Display Settings
            </Link>
          </div>
        </div>

        {/* Overview Metric Cards (Phase 18) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/collections"
            className="rounded-2xl border border-border bg-surface p-6 transition hover:border-accent-secondary shadow-lg group"
          >
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-xs uppercase tracking-wider font-semibold">Favorites & Saved</span>
              <Heart size={16} className="text-rose-400" />
            </div>
            <p className="font-serif text-4xl text-text-primary mt-3 group-hover:text-accent-secondary transition-colors">
              {viewer.savedIds.length}
            </p>
            <p className="text-xs text-text-secondary mt-1">Works in private collection</p>
          </Link>

          <Link
            href="/following"
            className="rounded-2xl border border-border bg-surface p-6 transition hover:border-accent-secondary shadow-lg group"
          >
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-xs uppercase tracking-wider font-semibold">Following</span>
              <Users size={16} className="text-accent-secondary" />
            </div>
            <p className="font-serif text-4xl text-text-primary mt-3 group-hover:text-accent-secondary transition-colors">
              {viewer.followedArtistIds.length}
            </p>
            <p className="text-xs text-text-secondary mt-1">Creator studios followed</p>
          </Link>

          <Link
            href="/orders"
            className="rounded-2xl border border-border bg-surface p-6 transition hover:border-accent-secondary shadow-lg group"
          >
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-xs uppercase tracking-wider font-semibold">My Orders</span>
              <Package size={16} className="text-emerald-400" />
            </div>
            <p className="font-serif text-4xl text-text-primary mt-3 group-hover:text-accent-secondary transition-colors">
              Acquisitions
            </p>
            <p className="text-xs text-text-secondary mt-1">Order status & tracking</p>
          </Link>

          <Link
            href={auctionsEnabled() ? "/auctions" : "#"}
            className="rounded-2xl border border-border bg-surface p-6 transition hover:border-accent-secondary shadow-lg group"
          >
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-xs uppercase tracking-wider font-semibold">Auctions & Bids</span>
              <Gavel size={16} className="text-amber-400" />
            </div>
            <p className="font-serif text-4xl text-text-primary mt-3 group-hover:text-accent-secondary transition-colors">
              {bidMap.size}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {wonAuctions.length > 0 ? `${wonAuctions.length} won lots` : "Active room participations"}
            </p>
          </Link>
        </div>

        {/* SECTION: Taste Persona & Security */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Taste Persona Card */}
          <div className="taste-panel">
            <p className="eyebrow flex items-center gap-2">
              <Sparkles size={14} /> Visual Personality
            </p>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl text-text-primary">
              {viewer.preferences[0] ? `${viewer.preferences[0]} Visionary` : "The Curated Collector"}
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {viewer.preferences.length ? (
                viewer.preferences.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-text-primary"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <p className="text-sm text-text-secondary">
                  Complete the visual discovery test to build your taste DNA.
                </p>
              )}
            </div>
            <div className="mt-8">
              <Link href="/#for-you" className="text-link text-xs">
                Refine my taste profile <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Account Details & Verified Credentials */}
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl">
            <p className="eyebrow flex items-center gap-2">
              <ShieldCheck size={14} /> Security & Identity
            </p>
            <h2 className="mt-4 font-serif text-3xl text-text-primary">{displayName}</h2>
            <p className="mt-1 text-xs text-text-secondary">{primaryEmail}</p>

            <div className="mt-6 divide-y divide-border border-y border-border">
              <div className="flex items-center justify-between py-3.5 text-xs">
                <div>
                  <p className="font-medium text-text-primary">Google Identity</p>
                  <p className="text-text-secondary">{googleConnected ? "Linked to account" : "Not connected"}</p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-[11px] text-text-secondary">
                  {googleConnected ? "Connected" : "Optional"}
                </span>
              </div>

              <div className="py-3.5">
                <div className="flex items-center justify-between text-xs mb-3">
                  <div>
                    <p className="font-medium text-text-primary">Email Verification</p>
                    <p className="text-text-secondary">
                      {identity?.emailVerified ? "Primary email verified" : "Verification pending"}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] text-text-secondary">
                    {identity?.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>

                {identity && primaryEmail && (
                  <EmailSettings
                    primaryEmail={primaryEmail}
                    primaryEmailVerified={Boolean(identity.emailVerified)}
                    contactEmail={identity.contactEmail}
                    contactEmailVerified={Boolean(identity.contactEmailVerifiedAt)}
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <Link href="/orders" className="button-outline text-xs !py-1.5 !px-3">
                Orders
              </Link>
              <Link href="/collections" className="button-outline text-xs !py-1.5 !px-3">
                Collections
              </Link>
              <Link href="/following" className="button-outline text-xs !py-1.5 !px-3">
                Followed Artists
              </Link>
              <Link href="/notifications" className="button-outline text-xs !py-1.5 !px-3">
                Notifications
              </Link>
              {auctionsEnabled() && (
                <Link href="/auctions/won" className="button-outline text-xs !py-1.5 !px-3">
                  Won Auction Payments
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* SECTION: Recent Auction Activity & Followed Artists */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Followed Artists Quick View */}
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-serif text-2xl text-text-primary">Artists You Follow</h2>
              <Link href="/following" className="text-xs text-accent-secondary hover:underline">
                View all ({followedArtists.length})
              </Link>
            </div>
            <ul className="mt-6 space-y-3">
              {followedArtists.slice(0, 5).map((artist) => (
                <li key={artist.id} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="text-text-primary hover:text-accent-secondary transition underline decoration-border"
                  >
                    {artist.name}
                  </Link>
                  <ArrowRight size={13} className="text-text-secondary" />
                </li>
              ))}
              {!followedArtists.length && (
                <li className="text-xs text-text-secondary">You have not followed any creators yet.</li>
              )}
            </ul>
          </div>

          {/* Auction Room History */}
          {auctionsEnabled() && (
            <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="font-serif text-2xl text-text-primary">Joined Auctions</h2>
                <Link href="/auctions" className="text-xs text-accent-secondary hover:underline">
                  Live Rooms
                </Link>
              </div>
              <ul className="mt-6 space-y-3">
                {[...bidMap.values()].slice(0, 5).map((auction) => (
                  <li key={auction.auctionId} className="border-b border-border/40 pb-3 text-xs">
                    <Link
                      href={`/auctions/${auction.auctionId}`}
                      className="font-serif text-base text-text-primary hover:text-accent-secondary transition"
                    >
                      {auction.title}
                    </Link>
                    <p className="mt-1 text-text-secondary">
                      {participationLabel(auction)} · Your Bid: ₹{Number(auction.ownBid) / 100} · Room High: ₹{Number(auction.current ?? auction.ownBid) / 100}
                    </p>
                  </li>
                ))}
                {!bidMap.size && (
                  <li className="text-xs text-text-secondary">You have not joined any live auction rooms yet.</li>
                )}
              </ul>
            </div>
          )}
        </section>
      </main>
    </GalleryShell>
  );
}
