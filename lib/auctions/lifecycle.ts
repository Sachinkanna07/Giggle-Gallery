import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctionEvents, auctionPaymentAttempts, auctions, artworks, notifications, payments } from "@/db/schema";
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
      const [reservedArtwork] = await tx.select({ status: artworks.status, availability: artworks.availability, stock: artworks.stock, artistId: artworks.artistId }).from(artworks).where(eq(artworks.id, auction.artworkId)).limit(1).for("update");
      if (!reservedArtwork || reservedArtwork.status !== "PUBLISHED" || reservedArtwork.availability !== "RESERVED" || reservedArtwork.stock !== 1 || reservedArtwork.artistId !== auction.sellerId) throw new Error("AUCTION_RESERVATION_CONFLICT");
      const [winningBid] = await tx.select().from(auctionBids).where(eq(auctionBids.auctionId, auction.id)).orderBy(desc(auctionBids.amountPaise), auctionBids.createdAt).limit(1).for("update");
      if (!winningBid) {
        await tx.update(auctions).set({ status: "UNSOLD", updatedAt: now }).where(eq(auctions.id, auction.id));
        await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: now }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.artistId, auction.sellerId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)));
        await tx.insert(auctionEvents).values({ auctionId: auction.id, type: "UNSOLD", reason: "No bids received" });
        const [seller] = await tx.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, auction.sellerId)).limit(1);
        if (seller) await tx.insert(notifications).values({ userId: seller.userId, type: "AUCTION_UNSOLD", title: "Auction ended", message: "Your auction ended without a bid.", data: { url: `/auctions/${auction.id}` } });
        return { state: "UNSOLD" as const };
      }
      if (auction.currentBidPaise !== winningBid.amountPaise) throw new Error("AUCTION_BID_STATE_CONFLICT");
      const deadline = new Date(now.getTime() + AUCTION_PAYMENT_WINDOW_MS);
      await tx.update(auctions).set({ status: "PAYMENT_PENDING", winnerId: winningBid.bidderId, winningBidPaise: winningBid.amountPaise, currentBidPaise: winningBid.amountPaise, paymentDeadlineAt: deadline, updatedAt: now }).where(eq(auctions.id, auction.id));
      await tx.insert(auctionPaymentAttempts).values({ auctionId: auction.id, winnerId: winningBid.bidderId, winningBidPaise: winningBid.amountPaise, deadlineAt: deadline });
      await tx.insert(auctionEvents).values({ auctionId: auction.id, actorId: winningBid.bidderId, type: "WINNER_SELECTED", data: { winningBidPaise: winningBid.amountPaise.toString() } });
      await tx.insert(notifications).values({ userId: winningBid.bidderId, type: "AUCTION_WON", title: "You won an auction", message: "Complete your test-mode payment within 24 hours.", data: { url: "/auctions/won" } });
      return { state: "PAYMENT_PENDING" as const, winnerId: winningBid.bidderId };
    }
    if (auction.status === "PAYMENT_PENDING" && auction.paymentDeadlineAt && auctionPaymentExpired(auction.paymentDeadlineAt, now)) {
      await tx.update(auctions).set({ status: "PAYMENT_EXPIRED", updatedAt: now }).where(and(eq(auctions.id, auction.id), eq(auctions.status, "PAYMENT_PENDING")));
      const [attempt] = await tx.select({ orderId: auctionPaymentAttempts.orderId }).from(auctionPaymentAttempts).where(eq(auctionPaymentAttempts.auctionId, auction.id)).limit(1);
      const pending = attempt?.orderId ? await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, attempt.orderId), inArray(payments.status, ["CREATED", "PENDING"]))).limit(1) : [];
      // A provider payment can still arrive after the deadline. Keep stock
      // and the provider order can still authorize late. Keep both the attempt
      // and stock pending until a verified refund resolves that risk.
      if (!pending.length) {
        await tx.update(auctionPaymentAttempts).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(auctionPaymentAttempts.auctionId, auction.id), eq(auctionPaymentAttempts.status, "PENDING")));
        await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: now }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.artistId, auction.sellerId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)));
      }
      await tx.insert(auctionEvents).values({ auctionId: auction.id, type: "PAYMENT_EXPIRED" });
      await tx.insert(notifications).values({ userId: auction.winnerId!, type: "AUCTION_PAYMENT_EXPIRED", title: "Auction payment window expired", message: "The 24-hour payment window has closed.", data: { url: `/auctions/${auction.id}` } });
      return { state: "PAYMENT_EXPIRED" as const };
    }
    if (auction.status === "PAYMENT_EXPIRED") {
      const [attempt] = await tx.select({ id: auctionPaymentAttempts.id, orderId: auctionPaymentAttempts.orderId, status: auctionPaymentAttempts.status }).from(auctionPaymentAttempts).where(eq(auctionPaymentAttempts.auctionId, auction.id)).limit(1);
      const pending = attempt?.orderId ? await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, attempt.orderId), inArray(payments.status, ["CREATED", "PENDING"]))).limit(1) : [];
      if (!pending.length) {
        if (attempt?.status === "PENDING") await tx.update(auctionPaymentAttempts).set({ status: "EXPIRED", updatedAt: now }).where(eq(auctionPaymentAttempts.id, attempt.id));
        await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: now }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.artistId, auction.sellerId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1)));
      }
    }
    return { state: auction.status };
  });
}

export async function settleDueAuctions(now = new Date()) {
  const db = getDb();
  const due = await db.select({ id: auctions.id }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(sql`(${auctions.status} = 'SCHEDULED' and ${auctions.startsAt} <= ${now}) or (${auctions.status} = 'LIVE' and ${auctions.endsAt} <= ${now}) or (${auctions.status} = 'PAYMENT_PENDING' and ${auctions.paymentDeadlineAt} <= ${now}) or (${auctions.status} = 'PAYMENT_EXPIRED' and ${auctions.paymentDeadlineAt} <= ${now} and ${artworks.availability} = 'RESERVED')`).limit(25);
  return Promise.all(due.map(({ id }) => settleAuctionIfDue(id, now)));
}
