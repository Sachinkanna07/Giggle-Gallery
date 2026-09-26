import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { auctionBids, auctions } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleAuctionIfDue } from "@/lib/auctions/lifecycle";
import { minimumAllowedBid } from "@/lib/auctions/rules";
import { rateLimitRequest, rateLimitResponse } from "@/lib/security/request";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!auctionsEnabled()) return Response.json({ error: "Not found" }, { status: 404 });
  const limited = rateLimitRequest(request, "auction-live-state", 60, 60_000);
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterSeconds);
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: "Invalid auction" }, { status: 400 });
  await settleAuctionIfDue(parsed.data);
  const db = getDb();
  const [auction] = await db.select({ status: auctions.status, opening: auctions.openingBidPaise, current: auctions.currentBidPaise, increment: auctions.minimumIncrementPaise, startsAt: auctions.startsAt, endsAt: auctions.endsAt, deadline: auctions.paymentDeadlineAt, winnerId: auctions.winnerId }).from(auctions).where(eq(auctions.id, parsed.data)).limit(1);
  if (!auction || auction.status === "DRAFT" || auction.status === "CANCELLED") return Response.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  const [totals, latest, viewerBid] = await Promise.all([
    db.select({ value: count() }).from(auctionBids).where(eq(auctionBids.auctionId, parsed.data)),
    db.select({ bidderId: auctionBids.bidderId, amountPaise: auctionBids.amountPaise, createdAt: auctionBids.createdAt }).from(auctionBids).where(eq(auctionBids.auctionId, parsed.data)).orderBy(desc(auctionBids.amountPaise), auctionBids.createdAt).limit(10),
    session?.user?.id ? db.select({ id: auctionBids.id }).from(auctionBids).where(and(eq(auctionBids.auctionId, parsed.data), eq(auctionBids.bidderId, session.user.id))).limit(1) : Promise.resolve([]),
  ]);
  return Response.json({ status: auction.status, currentBidPaise: String(auction.current ?? auction.opening), nextMinimumBidPaise: String(minimumAllowedBid(auction.opening, auction.current, auction.increment)), bidCount: Number(totals[0]?.value ?? 0), startsAt: auction.startsAt.toISOString(), endsAt: auction.endsAt.toISOString(), deadlineAt: auction.deadline?.toISOString() ?? null, serverNow: new Date().toISOString(), viewerHasBid: viewerBid.length > 0, viewerIsHighestBidder: Boolean(session?.user?.id && latest[0]?.bidderId === session.user.id), viewerWon: Boolean(session?.user?.id && auction.winnerId === session.user.id), recentBids: latest.map((bid) => ({ amountPaise: String(bid.amountPaise), createdAt: bid.createdAt.toISOString() })) }, { headers: { "Cache-Control": "private, no-store" } });
}
