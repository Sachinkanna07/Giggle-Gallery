import "server-only";

import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auctionBids, auctionEvents, auctionPaymentAttempts, auctions, artworks } from "@/db/schema";
import { AUCTION_PAYMENT_WINDOW_MS, auctionPaymentExpired } from "@/lib/auctions/rules";

export async function settleAuctionIfDue(auctionId: string, now = new Date()) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1).for("update");
    if (!auction) return { state: "NOT_FOUND" as const };
    if (auction.status === "SCHEDULED" && auction.startsAt <= now && auction.endsAt > now) {
      await tx.update(auctions).set({ status: "LIVE", updatedAt: now }).where(eq(auctions.id, auction.id));
      return { state: "LIVE" as const };
    }
    if ((auction.status === "SCHEDULED" || auction.status === "LIVE") && auction.endsAt <= now) {
      const [winningBid] = await tx.select().from(auctionBids).where(eq(auctionBids.auctionId, auction.id)).orderBy(desc(auctionBids.amountPaise), auctionBids.createdAt).limit(1).for("update");
      if (!winningBid) {
        await tx.update(auctions).set({ status: "UNSOLD", updatedAt: now }).where(eq(auctions.id, auction.id));
        await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: now }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)));
        await tx.insert(auctionEvents).values({ auctionId: auction.id, type: "UNSOLD", reason: "No bids received" });
        return { state: "UNSOLD" as const };
      }
      const deadline = new Date(now.getTime() + AUCTION_PAYMENT_WINDOW_MS);
      await tx.update(auctions).set({ status: "PAYMENT_PENDING", winnerId: winningBid.bidderId, winningBidPaise: winningBid.amountPaise, currentBidPaise: winningBid.amountPaise, paymentDeadlineAt: deadline, updatedAt: now }).where(eq(auctions.id, auction.id));
      await tx.insert(auctionPaymentAttempts).values({ auctionId: auction.id, winnerId: winningBid.bidderId, winningBidPaise: winningBid.amountPaise, deadlineAt: deadline });
      await tx.insert(auctionEvents).values({ auctionId: auction.id, actorId: winningBid.bidderId, type: "WINNER_SELECTED", data: { winningBidPaise: winningBid.amountPaise.toString() } });
      return { state: "PAYMENT_PENDING" as const, winnerId: winningBid.bidderId };
    }
    if (auction.status === "PAYMENT_PENDING" && auction.paymentDeadlineAt && auctionPaymentExpired(auction.paymentDeadlineAt, now)) {
      await tx.update(auctions).set({ status: "PAYMENT_EXPIRED", updatedAt: now }).where(and(eq(auctions.id, auction.id), eq(auctions.status, "PAYMENT_PENDING")));
      await tx.update(auctionPaymentAttempts).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(auctionPaymentAttempts.auctionId, auction.id), eq(auctionPaymentAttempts.status, "PENDING")));
      await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: now }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)));
      await tx.insert(auctionEvents).values({ auctionId: auction.id, type: "PAYMENT_EXPIRED" });
      return { state: "PAYMENT_EXPIRED" as const };
    }
    return { state: auction.status };
  });
}

export async function settleDueAuctions(now = new Date()) {
  const db = getDb();
  const due = await db.select({ id: auctions.id }).from(auctions).where(sql`(${auctions.status} in ('SCHEDULED', 'LIVE') and ${auctions.endsAt} <= ${now}) or (${auctions.status} = 'PAYMENT_PENDING' and ${auctions.paymentDeadlineAt} <= ${now})`);
  return Promise.all(due.map(({ id }) => settleAuctionIfDue(id, now)));
}
