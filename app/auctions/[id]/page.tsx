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
  return <GalleryShell><main className="section-shell py-16"><p className="eyebrow">Test auction</p><div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">{row.image ? <div className="relative aspect-[4/5] overflow-hidden bg-white/5"><Image src={row.image} alt={row.title} fill priority sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" /></div> : <div className="aspect-[4/5] bg-white/5" />}<div><h1 className="section-title">{row.title}</h1><p className="mt-3 text-white/50">by {row.artist}</p><Link href={`/artwork/${row.slug}`} className="mt-4 inline-block text-sm text-white/60 underline underline-offset-4">View fixed-price artwork record</Link><AuctionLivePanel auctionId={id} initial={initial} signedIn={Boolean(session?.user)} /></div></div></main></GalleryShell>;
}
