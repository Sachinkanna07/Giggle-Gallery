"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctionEvents, auctions, notifications, orderItems, orders, artworks } from "@/db/schema";
import { requireAdmin, requireSeller, requireUser } from "@/lib/authz";
import { requireAuctionsEnabled } from "@/lib/auctions/feature-flag";
import { extendedAuctionEnd, minimumAllowedBid } from "@/lib/auctions/rules";
import { toSafeProviderAmount } from "@/lib/money";

type Result = { ok: true; message: string; auctionId?: string } | { ok: false; message: string };
const draftSchema = z.object({ artworkId: z.string().uuid(), openingBidPaise: z.coerce.bigint().positive(), minimumIncrementPaise: z.coerce.bigint().positive(), startsAt: z.coerce.date(), endsAt: z.coerce.date() }).refine((value) => value.endsAt > value.startsAt, "End time must be after start time.");
const idSchema = z.string().uuid();

function message(error: unknown) {
  if (error instanceof Error && error.message === "AUCTIONS_DISABLED") return "Auctions are not enabled for this environment.";
  if (error instanceof Error && error.message === "SELLER_REQUIRED") return "Seller access required.";
  if (error instanceof Error && error.message === "ADMIN_REQUIRED") return "Admin approval is required.";
  if (error instanceof Error && error.message === "AUTH_REQUIRED") return "Sign in to continue.";
  return "We could not complete that auction action. Please try again.";
}

export async function createAuctionDraft(input: z.input<typeof draftSchema>): Promise<Result> {
  try {
    requireAuctionsEnabled();
    const user = await requireSeller();
    const parsed = draftSchema.parse(input);
    if (parsed.startsAt <= new Date()) return { ok: false, message: "Choose a future start time for the auction." };
    toSafeProviderAmount(parsed.openingBidPaise);
    toSafeProviderAmount(parsed.minimumIncrementPaise);
    const db = getDb();
    const outcome = await db.transaction(async (tx) => {
      const [artist] = await tx.select({ id: artistProfiles.id }).from(artistProfiles).where(eq(artistProfiles.userId, user.id)).limit(1);
      const [artwork] = artist ? await tx.select().from(artworks).where(and(eq(artworks.id, parsed.artworkId), eq(artworks.artistId, artist.id))).limit(1).for("update") : [];
      if (!artwork) return "NOT_OWNER" as const;
      if (artwork.status !== "PUBLISHED" || artwork.availability !== "AVAILABLE" || artwork.stock !== 1 || artwork.currency !== "INR") return "INELIGIBLE" as const;
      const [created] = await tx.insert(auctions).values({ artworkId: artwork.id, sellerId: artist!.id, openingBidPaise: parsed.openingBidPaise, minimumIncrementPaise: parsed.minimumIncrementPaise, startsAt: parsed.startsAt, endsAt: parsed.endsAt }).returning({ id: auctions.id });
      await tx.insert(auctionEvents).values({ auctionId: created.id, actorId: user.id, type: "DRAFT_CREATED" });
      return created.id;
    });
    if (outcome === "NOT_OWNER") return { ok: false, message: "You can auction only artwork you own." };
    if (outcome === "INELIGIBLE") return { ok: false, message: "Only published, available, single-stock artwork can be auctioned." };
    revalidatePath("/seller");
    return { ok: true, message: "Auction draft created. An administrator must schedule it before inventory is reserved.", auctionId: outcome };
  } catch (error) { return { ok: false, message: message(error) }; }
}

export async function scheduleAuction(auctionId: string): Promise<Result> {
  try {
    requireAuctionsEnabled();
    const admin = await requireAdmin();
    const id = idSchema.parse(auctionId);
    const db = getDb();
    const outcome = await db.transaction(async (tx) => {
      const [auction] = await tx.select().from(auctions).where(eq(auctions.id, id)).limit(1).for("update");
      if (!auction || auction.status !== "DRAFT") return "NOT_DRAFT" as const;
      const [artwork] = await tx.select().from(artworks).where(eq(artworks.id, auction.artworkId)).limit(1).for("update");
      if (!artwork || artwork.artistId !== auction.sellerId || artwork.status !== "PUBLISHED" || artwork.availability !== "AVAILABLE" || artwork.stock !== 1 || artwork.currency !== "INR" || auction.endsAt <= new Date()) return "INELIGIBLE" as const;
      const pending = await tx.select({ id: orders.id }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(eq(orderItems.artworkId, artwork.id), eq(orders.status, "PENDING"), inArray(orders.paymentStatus, ["CREATED", "PENDING"]))).limit(1);
      if (pending.length) return "PENDING_PAYMENT" as const;
      const [reserved] = await tx.update(artworks).set({ availability: "RESERVED", updatedAt: new Date() }).where(and(eq(artworks.id, artwork.id), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "AVAILABLE"), eq(artworks.stock, 1))).returning({ id: artworks.id });
      if (!reserved) return "INELIGIBLE" as const;
      await tx.update(auctions).set({ status: "SCHEDULED", scheduledAt: new Date(), updatedAt: new Date() }).where(eq(auctions.id, auction.id));
      await tx.insert(auctionEvents).values({ auctionId: auction.id, actorId: admin.id, type: "SCHEDULED" });
      const [seller] = await tx.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, auction.sellerId)).limit(1);
      if (seller) await tx.insert(notifications).values({ userId: seller.userId, type: "AUCTION_SCHEDULED", title: "Auction scheduled", message: "Your artwork is reserved for its upcoming auction.", data: { url: `/auctions/${auction.id}` } });
      return "SCHEDULED" as const;
    });
    if (outcome === "NOT_DRAFT") return { ok: false, message: "Only an auction draft can be scheduled." };
    if (outcome === "INELIGIBLE") return { ok: false, message: "Scheduling is blocked because the artwork is no longer eligible or available." };
    if (outcome === "PENDING_PAYMENT") return { ok: false, message: "Scheduling is blocked by an existing pending fixed-price payment. Resolve that order using the existing marketplace process first." };
    revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/seller"); revalidatePath("/auctions");
    return { ok: true, message: "Auction scheduled and artwork reserved from fixed-price checkout." };
  } catch (error) { return { ok: false, message: message(error) }; }
}

export async function placeAuctionBid(auctionId: string, amountPaise: bigint, idempotencyKey: string): Promise<Result> {
  try {
    requireAuctionsEnabled();
    const user = await requireUser();
    const id = idSchema.parse(auctionId); const key = z.string().uuid().parse(idempotencyKey); const amount = z.coerce.bigint().positive().parse(amountPaise);
    toSafeProviderAmount(amount);
    const db = getDb();
    const outcome = await db.transaction(async (tx) => {
      const [auction] = await tx.select().from(auctions).where(eq(auctions.id, id)).limit(1).for("update");
      if (!auction) return "NOT_FOUND" as const;
      const now = new Date();
      if (auction.status === "SCHEDULED" && auction.startsAt <= now && auction.endsAt > now) await tx.update(auctions).set({ status: "LIVE", updatedAt: now }).where(eq(auctions.id, id));
      if (!((auction.status === "LIVE" || auction.status === "SCHEDULED") && auction.startsAt <= now && auction.endsAt > now)) return "NOT_LIVE" as const;
      const [artwork] = await tx.select({ availability: artworks.availability, status: artworks.status, stock: artworks.stock, artistId: artworks.artistId }).from(artworks).where(eq(artworks.id, auction.artworkId)).limit(1).for("update");
      if (!artwork || artwork.availability !== "RESERVED" || artwork.status !== "PUBLISHED" || artwork.stock !== 1 || artwork.artistId !== auction.sellerId) return "NOT_RESERVED" as const;
      const [seller] = await tx.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, auction.sellerId)).limit(1);
      if (seller?.userId === user.id) return "SELLER" as const;
      const existing = await tx.select({ id: auctionBids.id }).from(auctionBids).where(and(eq(auctionBids.auctionId, id), eq(auctionBids.bidderId, user.id), eq(auctionBids.idempotencyKey, key))).limit(1);
      if (existing.length) return "PLACED" as const;
      const minimum = minimumAllowedBid(auction.openingBidPaise, auction.currentBidPaise, auction.minimumIncrementPaise);
      if (amount < minimum) return "LOW" as const;
      const [previous] = await tx.select({ bidderId: auctionBids.bidderId }).from(auctionBids).where(eq(auctionBids.auctionId, id)).orderBy(sql`${auctionBids.amountPaise} desc`, auctionBids.createdAt).limit(1);
      await tx.insert(auctionBids).values({ auctionId: id, bidderId: user.id, amountPaise: amount, idempotencyKey: key });
      const extendedEnd = extendedAuctionEnd(auction.endsAt, now);
      await tx.update(auctions).set({ status: "LIVE", currentBidPaise: amount, ...(extendedEnd ? { endsAt: extendedEnd } : {}), updatedAt: now }).where(eq(auctions.id, id));
      await tx.insert(auctionEvents).values({ auctionId: id, actorId: user.id, type: "BID_PLACED", data: { amountPaise: amount.toString() } });
      if (extendedEnd) await tx.insert(auctionEvents).values({ auctionId: id, actorId: user.id, type: "AUCTION_EXTENDED", data: { previousEndsAt: auction.endsAt.toISOString(), endsAt: extendedEnd.toISOString() } });
      if (previous && previous.bidderId !== user.id) await tx.insert(notifications).values({ userId: previous.bidderId, type: "AUCTION_OUTBID", title: "You were outbid", message: "A higher bid was placed on an auction you joined.", data: { url: `/auctions/${id}` } });
      return "PLACED" as const;
    });
    const messages: Record<string, string> = { NOT_FOUND: "Auction not found.", NOT_LIVE: "This auction is not accepting bids.", NOT_RESERVED: "This auction no longer owns the artwork reservation.", SELLER: "Sellers cannot bid on their own artwork.", LOW: "Your bid does not meet the minimum increment.", PLACED: "Bid accepted." };
    revalidatePath(`/auctions/${id}`); return { ok: outcome === "PLACED", message: messages[outcome] ?? "Bid failed." };
  } catch (error) { return { ok: false, message: message(error) }; }
}

export async function cancelAuction(auctionId: string): Promise<Result> {
  try {
    requireAuctionsEnabled();
    const admin = await requireAdmin();
    const id = idSchema.parse(auctionId);
    const now = new Date();
    const outcome = await getDb().transaction(async (tx) => {
      const [auction] = await tx.select().from(auctions).where(eq(auctions.id, id)).limit(1).for("update");
      if (!auction || (auction.status !== "DRAFT" && auction.status !== "SCHEDULED")) return "NOT_CANCELLABLE" as const;
      const bidRows = await tx.select({ id: auctionBids.id }).from(auctionBids).where(eq(auctionBids.auctionId, id)).limit(1);
      if (bidRows.length || (auction.status === "SCHEDULED" && auction.startsAt <= now)) return "NOT_CANCELLABLE" as const;
      if (auction.status === "SCHEDULED") {
        const [released] = await tx.update(artworks).set({ availability: "AVAILABLE", updatedAt: now }).where(and(eq(artworks.id, auction.artworkId), eq(artworks.artistId, auction.sellerId), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "RESERVED"), eq(artworks.stock, 1))).returning({ id: artworks.id });
        if (!released) return "RESERVATION_CONFLICT" as const;
      }
      await tx.update(auctions).set({ status: "CANCELLED", updatedAt: now }).where(and(eq(auctions.id, id), eq(auctions.status, auction.status)));
      await tx.insert(auctionEvents).values({ auctionId: id, actorId: admin.id, type: "CANCELLED", reason: "Cancelled by administrator before bidding opened" });
      return "CANCELLED" as const;
    });
    if (outcome === "NOT_CANCELLABLE") return { ok: false, message: "Only a draft or not-yet-started auction with no bids can be cancelled." };
    if (outcome === "RESERVATION_CONFLICT") return { ok: false, message: "The artwork reservation changed, so the auction was not cancelled." };
    revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/seller"); revalidatePath("/seller/auctions"); revalidatePath("/auctions");
    return { ok: true, message: "Auction cancelled safely." };
  } catch (error) { return { ok: false, message: message(error) }; }
}
