import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { AccountShell } from "@/app/components/AccountShell";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctions, artworks, follows } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getIdentityOverview } from "@/lib/identity/service";
import { getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const session = await auth(); if (!session?.user) return null;
  const [viewer, params, identity] = await Promise.all([getViewerState(session.user.id), searchParams, getIdentityOverview(session.user.id)]);
  const db = getDb();
  const [followedArtists, bidRows] = await Promise.all([
    db.select({ id: artistProfiles.id, slug: artistProfiles.slug, name: artistProfiles.displayName }).from(follows).innerJoin(artistProfiles, eq(follows.artistId, artistProfiles.id)).where(eq(follows.followerId, session.user.id)).limit(4),
    auctionsEnabled() ? db.select({ auctionId: auctions.id, title: artworks.title, status: auctions.status, current: auctions.currentBidPaise, ownBid: auctionBids.amountPaise }).from(auctionBids).innerJoin(auctions, eq(auctionBids.auctionId, auctions.id)).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(eq(auctionBids.bidderId, session.user.id)).orderBy(desc(auctionBids.createdAt)).limit(4) : Promise.resolve([]),
  ]);
  const firstName = (identity?.displayName ?? identity?.name ?? session.user.name ?? "Collector").split(" ")[0];
  const seller = session.user.role === "SELLER" || session.user.role === "ADMIN";
  const cards = [
    ["Orders", "Track, view or manage purchases", "/orders"],
    ["Favorites & collections", `${viewer.savedIds.length} saved works and ${viewer.collections.length} collections`, "/favorites"],
    ["Auctions", "Bids, won auctions and payment-required lots", "/account#auctions"],
    ["Following", `${viewer.followedArtistIds.length} artists you follow`, "/following"],
    ["Profile & identity", "Name, email and connected Google account", "/settings#account"],
    ["Security", "Verification and account security", "/settings#security"],
    ["Notifications", "Order, auction, follow and seller activity", "/notifications"],
    [seller ? "Selling" : "Become a seller", seller ? "Seller profile and artwork management" : "Apply to sell original artwork", seller ? "/seller" : "/sell"],
    ["Settings", "Theme, motion, accessibility and gallery density", "/settings"],
  ] as const;
  return <GalleryShell><AccountShell active="Overview">{params.setup === "database" ? <p className="mb-6 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Connect the production database before account actions can be stored.</p> : null}<header><p className="text-sm font-semibold uppercase tracking-[.16em] text-[#C6A66A]">Hello, {firstName}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Your Account</h1><p className="mt-3 text-white/50">Everything personal, collected in one calm place.</p></header><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([title, description, href]) => <Link key={title} href={href} className="group min-h-40 rounded-2xl border border-white/10 bg-[#0C1018] p-6 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-[#111722]"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-white/45">{description}</p><span className="mt-6 inline-block text-sm text-[#8CA4FF]">Open <span aria-hidden="true">→</span></span></Link>)}</section><section className="mt-10 grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#0C1018] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Recently followed</h2><Link href="/following" className="text-sm text-[#8CA4FF]">View all</Link></div>{followedArtists.length ? <ul className="mt-4 divide-y divide-white/10">{followedArtists.map((artist) => <li key={artist.id}><Link href={`/artist/${artist.slug}`} className="block py-3 text-sm text-white/65 hover:text-white">{artist.name}</Link></li>)}</ul> : <p className="mt-4 text-sm text-white/40">No artists followed yet.</p>}</div><div id="auctions" className="rounded-2xl border border-white/10 bg-[#0C1018] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Recent auction activity</h2><Link href="/auctions" className="text-sm text-[#8CA4FF]">Browse auctions</Link></div>{bidRows.length ? <ul className="mt-4 divide-y divide-white/10">{bidRows.map((item) => <li key={`${item.auctionId}-${item.ownBid}`}><Link href={`/auctions/${item.auctionId}`} className="block py-3"><span className="block text-sm text-white/75">{item.title}</span><span className="mt-1 block text-xs text-white/40">{item.status.replaceAll("_", " ")} · Your bid ₹{(Number(item.ownBid) / 100).toLocaleString("en-IN")}</span></Link></li>)}</ul> : <p className="mt-4 text-sm text-white/40">No auction activity yet.</p>}</div></section></AccountShell></GalleryShell>;
}
