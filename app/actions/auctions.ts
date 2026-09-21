"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctionEvents, auctions, orderItems, orders, payments, artworks } from "@/db/schema";
import { requireAdmin, requireSeller, requireUser } from "@/lib/authz";
import { requireAuctionsEnabled } from "@/lib/auctions/feature-flag";
import { minimumAllowedBid } from "@/lib/auctions/rules";

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
    const db = getDb();
    const outcome = await db.transaction(async (tx) => {
      const [artist] = await tx.select({ id: artistProfiles.id }).from(artistProfiles).where(eq(artistProfiles.userId, user.id)).limit(1);
      const [artwork] = artist ? await tx.select().from(artworks).where(and(eq(artworks.id, parsed.artworkId), eq(artworks.artistId, artist.id))).limit(1).for("update") : [];
      if (!artwork) return "NOT_OWNER" as const;
      if (artwork.status !== "PUBLISHED" || artwork.availability !== "AVAILABLE" || artwork.stock !== 1) return "INELIGIBLE" as const;
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
      if (!artwork || artwork.artistId !== auction.sellerId || artwork.status !== "PUBLISHED" || artwork.availability !== "AVAILABLE" || artwork.stock !== 1) return "INELIGIBLE" as const;
      const pending = await tx.select({ id: orders.id }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).innerJoin(payments, eq(payments.orderId, orders.id)).where(and(eq(orderItems.artworkId, artwork.id), inArray(payments.status, ["CREATED", "PENDING"]))).limit(1).for("update");
      if (pending.length) return "PENDING_PAYMENT" as const;
      await tx.update(artworks).set({ availability: "RESERVED", updatedAt: new Date() }).where(and(eq(artworks.id, artwork.id), eq(artworks.availability, "AVAILABLE"), eq(artworks.stock, 1)));
      await tx.update(auctions).set({ status: "SCHEDULED", scheduledAt: new Date(), updatedAt: new Date() }).where(eq(auctions.id, auction.id));
      await tx.insert(auctionEvents).values({ auctionId: auction.id, actorId: admin.id, type: "SCHEDULED" });
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
    const db = getDb();
    const outcome = await db.transaction(async (tx) => {
      const [auction] = await tx.select().from(auctions).where(eq(auctions.id, id)).limit(1).for("update");
      if (!auction) return "NOT_FOUND" as const;
      const now = new Date();
      if (auction.status === "SCHEDULED" && auction.startsAt <= now && auction.endsAt > now) await tx.update(auctions).set({ status: "LIVE", updatedAt: now }).where(eq(auctions.id, id));
      if (!((auction.status === "LIVE" || auction.status === "SCHEDULED") && auction.startsAt <= now && auction.endsAt > now)) return "NOT_LIVE" as const;
      const [artwork] = await tx.select({ availability: artworks.availability, stock: artworks.stock }).from(artworks).where(eq(artworks.id, auction.artworkId)).limit(1).for("update");
      if (!artwork || artwork.availability !== "RESERVED" || artwork.stock !== 1) return "NOT_RESERVED" as const;
      const [seller] = await tx.select({ userId: artistProfiles.userId }).from(artistProfiles).where(eq(artistProfiles.id, auction.sellerId)).limit(1);
      if (seller?.userId === user.id) return "SELLER" as const;
      const minimum = minimumAllowedBid(auction.openingBidPaise, auction.currentBidPaise, auction.minimumIncrementPaise);
      if (amount < minimum) return "LOW" as const;
      const existing = await tx.select({ id: auctionBids.id }).from(auctionBids).where(and(eq(auctionBids.auctionId, id), eq(auctionBids.bidderId, user.id), eq(auctionBids.idempotencyKey, key))).limit(1);
      if (existing.length) return "PLACED" as const;
      await tx.insert(auctionBids).values({ auctionId: id, bidderId: user.id, amountPaise: amount, idempotencyKey: key });
      await tx.update(auctions).set({ status: "LIVE", currentBidPaise: amount, updatedAt: now }).where(eq(auctions.id, id));
      await tx.insert(auctionEvents).values({ auctionId: id, actorId: user.id, type: "BID_PLACED", data: { amountPaise: amount.toString() } });
      return "PLACED" as const;
    });
    const messages: Record<string, string> = { NOT_FOUND: "Auction not found.", NOT_LIVE: "This auction is not accepting bids.", NOT_RESERVED: "This auction no longer owns the artwork reservation.", SELLER: "Sellers cannot bid on their own artwork.", LOW: "Your bid does not meet the minimum increment.", PLACED: "Bid accepted." };
    revalidatePath(`/auctions/${id}`); return { ok: outcome === "PLACED", message: messages[outcome] ?? "Bid failed." };
  } catch (error) { return { ok: false, message: message(error) }; }
}

export async function placeAuctionBidForm(auctionId: string, formData: FormData): Promise<void> {
  await placeAuctionBid(auctionId, BigInt(String(formData.get("amountPaise") ?? "0")), String(formData.get("idempotencyKey") ?? ""));
}

export async function scheduleAuctionForm(formData: FormData): Promise<void> {
  await scheduleAuction(String(formData.get("auctionId") ?? ""));
}

export async function createAuctionDraftForm(formData: FormData): Promise<void> {
  await createAuctionDraft({ artworkId: String(formData.get("artworkId") ?? ""), openingBidPaise: BigInt(String(formData.get("openingBidPaise") ?? "0")), minimumIncrementPaise: BigInt(String(formData.get("minimumIncrementPaise") ?? "0")), startsAt: new Date(String(formData.get("startsAt") ?? "")), endsAt: new Date(String(formData.get("endsAt") ?? "")) });
}
