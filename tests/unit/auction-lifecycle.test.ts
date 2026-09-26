import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistProfiles, auctionBids, auctionEvents, auctionPaymentAttempts, auctions, artworks, notifications, payments } from "@/db/schema";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));

import { settleAuctionIfDue } from "@/lib/auctions/lifecycle";

const auctionId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

function lifecycleDatabase(options: { bids?: Array<{ bidderId: string; amountPaise: bigint }>; paymentPending?: boolean } = {}) {
  const auction = { id: auctionId, artworkId: "art-1", sellerId: "artist-1", status: "LIVE", startsAt: new Date("2026-01-01T00:00:00.000Z"), endsAt: new Date("2026-01-01T01:00:00.000Z"), currentBidPaise: options.bids?.[0]?.amountPaise ?? null, winnerId: null as string | null, winningBidPaise: null as bigint | null, paymentDeadlineAt: null as Date | null };
  const artwork = { status: "PUBLISHED", availability: "RESERVED", stock: 1, artistId: "artist-1" };
  let attempt: { id: string; auctionId: string; orderId: string | null; status: string; deadlineAt: Date; winnerId: string; winningBidPaise: bigint } | undefined;
  const events: string[] = [];
  const notices: string[] = [];
  const tx = {
    select: vi.fn().mockImplementation(() => ({ from: (table: unknown) => ({ where: () => {
      if (table === auctions) return { limit: () => ({ for: async () => [{ ...auction }] }) };
      if (table === artworks) return { limit: () => ({ for: async () => [{ ...artwork }] }) };
      if (table === auctionBids) return { orderBy: () => ({ limit: () => ({ for: async () => options.bids ?? [] }) }) };
      if (table === artistProfiles) return { limit: async () => [{ userId: "seller-user" }] };
      if (table === auctionPaymentAttempts) return { limit: async () => attempt ? [{ ...attempt }] : [] };
      if (table === payments) return { limit: async () => options.paymentPending ? [{ id: "payment-1" }] : [] };
      return { limit: async () => [] };
    } }) })),
    update: vi.fn().mockImplementation((table: unknown) => ({ set: (value: Record<string, unknown>) => ({ where: async () => {
      if (table === auctions) Object.assign(auction, value);
      if (table === artworks && value.availability) artwork.availability = String(value.availability);
      if (table === auctionPaymentAttempts && attempt) attempt.status = String(value.status ?? attempt.status);
    } }) })),
    insert: vi.fn().mockImplementation((table: unknown) => ({ values: async (value: Record<string, unknown>) => {
      if (table === auctionPaymentAttempts) attempt = { id: "attempt-1", auctionId, orderId: null, status: "PENDING", deadlineAt: value.deadlineAt as Date, winnerId: String(value.winnerId), winningBidPaise: value.winningBidPaise as bigint };
      if (table === auctionEvents) events.push(String(value.type));
      if (table === notifications) notices.push(String(value.type));
    } })),
  };
  mocks.getDb.mockReturnValue({ transaction: (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) });
  return { auction, artwork, events, notices, attempt: () => attempt };
}

beforeEach(() => vi.resetAllMocks());

describe("auction finalization lifecycle", () => {
  const afterEnd = new Date("2026-01-01T01:00:01.000Z");

  it("closes a no-bid auction as unsold and releases only its reservation", async () => {
    const db = lifecycleDatabase();
    expect(await settleAuctionIfDue(auctionId, afterEnd)).toEqual({ state: "UNSOLD" });
    expect(db.auction.status).toBe("UNSOLD");
    expect(db.artwork.availability).toBe("AVAILABLE");
    expect(db.events).toContain("UNSOLD");
  });

  it("persists one winner and one 24-hour payment obligation idempotently", async () => {
    const db = lifecycleDatabase({ bids: [{ bidderId: "buyer-1", amountPaise: 15_000n }] });
    expect(await settleAuctionIfDue(auctionId, afterEnd)).toEqual({ state: "PAYMENT_PENDING", winnerId: "buyer-1" });
    expect(db.auction).toMatchObject({ status: "PAYMENT_PENDING", winnerId: "buyer-1", winningBidPaise: 15_000n });
    expect(db.attempt()).toMatchObject({ winnerId: "buyer-1", winningBidPaise: 15_000n, status: "PENDING" });
    expect(db.attempt()?.deadlineAt.getTime()).toBe(afterEnd.getTime() + 24 * 60 * 60 * 1000);
    expect(await settleAuctionIfDue(auctionId, new Date(afterEnd.getTime() + 1_000))).toEqual({ state: "PAYMENT_PENDING" });
    expect(db.events.filter((type) => type === "WINNER_SELECTED")).toHaveLength(1);
  });

  it("expires and releases when no provider order exists", async () => {
    const db = lifecycleDatabase({ bids: [{ bidderId: "buyer-1", amountPaise: 15_000n }] });
    await settleAuctionIfDue(auctionId, afterEnd);
    const deadline = db.attempt()!.deadlineAt;
    expect(await settleAuctionIfDue(auctionId, deadline)).toEqual({ state: "PAYMENT_EXPIRED" });
    expect(db.attempt()?.status).toBe("EXPIRED");
    expect(db.artwork.availability).toBe("AVAILABLE");
  });

  it("keeps an unresolved provider payment and reservation pending after expiry", async () => {
    const db = lifecycleDatabase({ bids: [{ bidderId: "buyer-1", amountPaise: 15_000n }], paymentPending: true });
    await settleAuctionIfDue(auctionId, afterEnd);
    db.attempt()!.orderId = "order-1";
    expect(await settleAuctionIfDue(auctionId, db.attempt()!.deadlineAt)).toEqual({ state: "PAYMENT_EXPIRED" });
    expect(db.attempt()?.status).toBe("PENDING");
    expect(db.artwork.availability).toBe("RESERVED");
  });
});
