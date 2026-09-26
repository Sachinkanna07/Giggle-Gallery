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

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
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
  const accountState = identity?.disabled ? "DISABLED" : identity?.accountStatus ?? session.user.accountStatus;
  const googleConnected = identity?.providers.includes("google") ?? false;
  const primaryEmail = identity?.email ?? session.user.email ?? "";
  const db = getDb();
  const [followedArtists, bidRows] = await Promise.all([
    db.select({ id: artistProfiles.id, slug: artistProfiles.slug, name: artistProfiles.displayName }).from(follows).innerJoin(artistProfiles, eq(follows.artistId, artistProfiles.id)).where(eq(follows.followerId, session.user.id)),
    auctionsEnabled() ? db.select({ auctionId: auctions.id, title: artworks.title, status: auctions.status, current: auctions.currentBidPaise, winnerId: auctions.winnerId, ownBid: auctionBids.amountPaise }).from(auctionBids).innerJoin(auctions, eq(auctionBids.auctionId, auctions.id)).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(eq(auctionBids.bidderId, session.user.id)).orderBy(desc(auctionBids.amountPaise)) : Promise.resolve([]),
  ]);
  const bidMap = new Map<string, (typeof bidRows)[number]>();
  bidRows.forEach((row) => { if (!bidMap.has(row.auctionId)) bidMap.set(row.auctionId, row); });
  const participationLabel = (auction: (typeof bidRows)[number]) => {
    if (auction.status === "SOLD" && auction.winnerId === session.user.id) return "Completed";
    if (auction.status === "PAYMENT_PENDING" && auction.winnerId === session.user.id) return "Won · payment required";
    if (auction.status === "PAYMENT_EXPIRED" && auction.winnerId === session.user.id) return "Won · payment expired";
    if (["SOLD", "UNSOLD", "PAYMENT_EXPIRED"].includes(auction.status)) return "Lost";
    if (auction.status === "LIVE" && auction.ownBid === auction.current) return "Highest bidder";
    if (auction.status === "LIVE" && auction.ownBid < (auction.current ?? 0n)) return "Outbid";
    return auction.status.replaceAll("_", " ");
  };

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        {params.setup === "database" ? (
          <p className="mb-8 border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
            Connect the production database before account actions can be stored.
          </p>
        ) : null}
        <p className="eyebrow">Personal gallery</p>
        <h1 className="section-title mt-6">{greeting}, <i>{displayName.split(" ")[0]}.</i></h1>
        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-3">
          {[["Liked artwork", viewer.likedIds.length], ["Saved artwork", viewer.savedIds.length], ["Following", viewer.followedArtistIds.length]].map(([label, value]) => (
            <div key={String(label)} className="bg-ink p-8">
              <p className="text-sm text-white/40">{label}</p>
              <p className="mt-3 font-serif text-5xl">{value}</p>
            </div>
          ))}
        </div>
        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="taste-panel">
            <p className="eyebrow">Your art personality</p>
            <h2 className="mt-5 font-serif text-5xl">{viewer.preferences[0] ? `${viewer.preferences[0]} Explorer` : "Curious Collector"}</h2>
            <div className="mt-7 flex flex-wrap gap-2">
              {viewer.preferences.length ? viewer.preferences.map((item) => (
                <span key={item} className="rounded-full border border-white/15 px-4 py-2 text-sm">{item}</span>
              )) : <p className="text-white/45">Complete Discover My Art to build your taste profile.</p>}
            </div>
            <Link href="/#for-you" className="text-link mt-7">Refine my taste</Link>
          </div>
          <div className="border border-white/10 p-8">
            <p className="eyebrow">Account settings</p>
            <h2 className="mt-5 font-serif text-4xl">{displayName}</h2>
            <p className="mt-2 text-white/45">{primaryEmail}</p>
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm">Google account</p>
                  <p className="mt-1 text-xs text-white/40">{googleConnected ? "Connected to this account" : "No Google identity found"}</p>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs">{googleConnected ? "Connected" : "Not connected"}</span>
              </div>
              <div className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm">Email verification</p>
                    <p className="mt-1 text-xs text-white/40">{identity?.emailVerified ? "Primary email verified" : "Primary email not yet verified"}</p>
                  </div>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs">{identity?.emailVerified ? "Verified" : "Unverified"}</span>
                </div>
                {identity && primaryEmail ? (
                  <EmailSettings
                    primaryEmail={primaryEmail}
                    primaryEmailVerified={Boolean(identity.emailVerified)}
                    contactEmail={identity.contactEmail}
                    contactEmailVerified={Boolean(identity.contactEmailVerifiedAt)}
                  />
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm">Phone verification</p>
                  <p className="mt-1 text-xs text-white/40">{identity?.phoneE164 ? `${identity.phoneE164} · ${identity.phoneVerifiedAt ? "Verified" : "Not verified"}` : "No phone linked"}</p>
                </div>
                <button type="button" disabled className="button-outline !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45">Coming in Phase 3D</button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/45">
              <p>Role: {identity?.role ?? session.user.role}</p>
              <p>Account: {accountState}</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/orders" className="button-outline">My orders</Link>
              <Link href="/collections" className="button-outline">Favorites and collections</Link>
              <Link href="/following" className="button-outline">Following artists</Link>
              <Link href="/notifications" className="button-outline">Notifications</Link>
              {auctionsEnabled() && <Link href="/auctions/won" className="button-outline">Auction payments</Link>}
              <Link href="/sell" className="button-outline">Seller profile</Link>
            </div>
          </div>
        </section>
        <section className="mt-16 grid gap-6 lg:grid-cols-2"><div className="border border-white/10 p-7"><div className="flex items-center justify-between gap-4"><h2 className="font-serif text-3xl">Artists you follow</h2><Link href="/following" className="text-link text-sm">Manage</Link></div><ul className="mt-5 space-y-3">{followedArtists.map((artist) => <li key={artist.id}><Link className="underline underline-offset-4" href={`/artist/${artist.slug}`}>{artist.name}</Link></li>)}{!followedArtists.length && <li className="text-sm text-white/45">You have not followed an artist yet.</li>}</ul></div>{auctionsEnabled() && <div className="border border-white/10 p-7"><h2 className="font-serif text-3xl">Auctions you joined</h2><ul className="mt-5 space-y-3">{[...bidMap.values()].map((auction) => <li key={auction.auctionId}><Link className="underline underline-offset-4" href={`/auctions/${auction.auctionId}`}>{auction.title}</Link><p className="mt-1 text-sm text-white/50">{participationLabel(auction)} · Your highest ₹{Number(auction.ownBid) / 100} · Current ₹{Number(auction.current ?? auction.ownBid) / 100}</p></li>)}{!bidMap.size && <li className="text-sm text-white/45">You have not joined an auction yet.</li>}</ul></div>}</section>
      </main>
    </GalleryShell>
  );
}
