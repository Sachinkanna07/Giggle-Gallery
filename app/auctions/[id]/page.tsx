import Image from "next/image";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { AuctionLivePanel, type AuctionLiveState } from "@/app/components/AuctionLivePanel";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctions, artworkImages, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleAuctionIfDue } from "@/lib/auctions/lifecycle";
import { minimumAllowedBid } from "@/lib/auctions/rules";

export const dynamic = "force-dynamic";
export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!auctionsEnabled()) notFound();
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const id = parsed.data;
  await settleAuctionIfDue(id);
  const db = getDb();
  const [row] = await db.select({ id: auctions.id, status: auctions.status, opening: auctions.openingBidPaise, current: auctions.currentBidPaise, increment: auctions.minimumIncrementPaise, startsAt: auctions.startsAt, endsAt: auctions.endsAt, deadline: auctions.paymentDeadlineAt, winnerId: auctions.winnerId, title: artworks.title, slug: artworks.slug, artist: artistProfiles.displayName, image: artworkImages.url }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).innerJoin(artistProfiles, eq(artworks.artistId, artistProfiles.id)).leftJoin(artworkImages, and(eq(artworkImages.artworkId, artworks.id), eq(artworkImages.sortOrder, 0))).where(eq(auctions.id, id)).limit(1);
  if (!row || row.status === "DRAFT" || row.status === "CANCELLED") notFound();
  const session = await auth();
  const [bids, totals, viewerBid] = await Promise.all([
    db.select({ bidderId: auctionBids.bidderId, amount: auctionBids.amountPaise, createdAt: auctionBids.createdAt }).from(auctionBids).where(eq(auctionBids.auctionId, id)).orderBy(desc(auctionBids.amountPaise), auctionBids.createdAt).limit(10),
    db.select({ value: count() }).from(auctionBids).where(eq(auctionBids.auctionId, id)),
    session?.user?.id ? db.select({ id: auctionBids.id }).from(auctionBids).where(and(eq(auctionBids.auctionId, id), eq(auctionBids.bidderId, session.user.id))).limit(1) : Promise.resolve([]),
  ]);
  const initial: AuctionLiveState = { status: row.status, currentBidPaise: String(row.current ?? row.opening), nextMinimumBidPaise: String(minimumAllowedBid(row.opening, row.current, row.increment)), bidCount: Number(totals[0]?.value ?? 0), startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), deadlineAt: row.deadline?.toISOString() ?? null, serverNow: new Date().toISOString(), viewerHasBid: viewerBid.length > 0, viewerIsHighestBidder: Boolean(session?.user?.id && bids[0]?.bidderId === session.user.id), viewerWon: Boolean(session?.user?.id && row.winnerId === session.user.id), recentBids: bids.map((bid) => ({ amountPaise: String(bid.amount), createdAt: bid.createdAt.toISOString() })) };
  return <GalleryShell><main className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-12"><nav className="mb-6 text-xs text-white/40"><Link href="/auctions" className="hover:text-white">Auctions</Link><span className="mx-2">/</span><span className="text-white/70">{row.title}</span></nav><div className="grid gap-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,.8fr)] lg:gap-12">{row.image ? <div className="relative min-h-[65vh] overflow-hidden bg-black lg:min-h-[78vh]"><Image src={row.image} alt={row.title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-contain" /></div> : <div className="min-h-[65vh] bg-white/5" />}<aside className="h-fit lg:sticky lg:top-24"><div className="flex items-center justify-between gap-4"><p className="eyebrow">Test-mode auction</p><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-[#5ec894]"><span className="size-2 rounded-full bg-current"/>{row.status.replaceAll("_", " ")}</span></div><h1 className="mt-5 font-serif text-5xl leading-[.93] tracking-[-.055em]">{row.title}</h1><p className="mt-4 text-white/50">by {row.artist}</p><Link href={`/artwork/${row.slug}`} className="mt-4 inline-block text-sm text-white/60 underline underline-offset-4">View artwork details</Link><AuctionLivePanel auctionId={id} initial={initial} signedIn={Boolean(session?.user)} /></aside></div><section className="mt-14 grid gap-8 border-t border-white/10 py-12 md:grid-cols-3"><div><p className="eyebrow">How bidding works</p><h2 className="mt-3 font-serif text-3xl">Bid with clarity.</h2></div><p className="text-sm leading-relaxed text-white/55">Every bid is validated by the server against the current price and minimum increment. Bids placed in the final two minutes extend the close by two minutes.</p><p className="text-sm leading-relaxed text-white/55">The winner receives a 24-hour test-payment window. The artwork remains reserved while the auction lifecycle completes.</p></section></main></GalleryShell>;
}
