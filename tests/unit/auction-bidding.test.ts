import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { artistProfiles, auctionBids, auctions, artworks, notifications } from "@/db/schema";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getDb: vi.fn(), revalidatePath: vi.fn(), requireAuctionsEnabled: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireUser: mocks.requireUser, requireSeller: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auctions/feature-flag", () => ({ requireAuctionsEnabled: mocks.requireAuctionsEnabled }));

import { placeAuctionBid } from "../../app/actions/auctions";

const id = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const key = () => crypto.randomUUID();
const dialect = new PgDialect();

function bidDatabase() {
  const accepted: Array<{ bidderId: string; amountPaise: bigint; idempotencyKey: string }> = [];
  const notices: Array<{ userId: string }> = [];
  const auction = { id, sellerId: "seller-profile", artworkId: "art-1", status: "LIVE", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 10 * 60_000), openingBidPaise: 10_000n, minimumIncrementPaise: 500n, currentBidPaise: null as bigint | null };
  let queue = Promise.resolve();
  const tx = {
    select: vi.fn().mockImplementation(() => ({ from: (table: unknown) => ({
      where: (condition: SQL) => ({
        limit: () => {
          if (table === auctions) return { for: async () => [{ ...auction }] };
          if (table === artworks) return { for: async () => [{ status: "PUBLISHED", availability: "RESERVED", stock: 1, artistId: "seller-profile" }] };
          if (table === artistProfiles) return Promise.resolve([{ userId: "seller-owner" }]);
          if (table === auctionBids) {
            const params = dialect.sqlToQuery(condition).params.map(String);
            const duplicate = accepted.find((bid) => params.includes(bid.bidderId) && params.includes(bid.idempotencyKey));
            return Promise.resolve(duplicate ? [{ id: "existing-bid" }] : []);
          }
          return Promise.resolve([]);
        },
        orderBy: () => ({ limit: async () => accepted.length ? [{ bidderId: accepted[accepted.length - 1].bidderId }] : [] }),
      }),
    }) })),
    insert: vi.fn().mockImplementation((table: unknown) => ({ values: async (value: { bidderId?: string; amountPaise?: bigint; idempotencyKey?: string; userId?: string }) => {
      if (table === auctionBids) accepted.push(value as { bidderId: string; amountPaise: bigint; idempotencyKey: string });
      if (table === notifications) notices.push(value as { userId: string });
    } })),
    update: vi.fn().mockImplementation((table: unknown) => ({ set: (value: { currentBidPaise?: bigint; endsAt?: Date }) => ({ where: async () => { if (table === auctions && value.currentBidPaise) auction.currentBidPaise = value.currentBidPaise; if (table === auctions && value.endsAt) auction.endsAt = value.endsAt; } }) })),
  };
  mocks.getDb.mockReturnValue({ transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => {
    const previous = queue;
    let unlock = () => {};
    queue = new Promise<void>((resolve) => { unlock = resolve; });
    await previous;
    try { return await callback(tx); } finally { unlock(); }
  } });
  return { accepted, notices, auction };
}

beforeEach(() => { vi.resetAllMocks(); });

describe("locked auction bids", () => {
  it("rejects a stale equal bid after a competing bidder takes the lead", async () => {
    const db = bidDatabase();
    mocks.requireUser.mockResolvedValueOnce({ id: "buyer-a" }).mockResolvedValueOnce({ id: "buyer-b" });
    const [first, second] = await Promise.all([placeAuctionBid(id, 10_000n, key()), placeAuctionBid(id, 10_000n, key())]);
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, message: "Your bid does not meet the minimum increment." });
    expect(db.accepted).toHaveLength(1);
    expect(db.auction.currentBidPaise).toBe(10_000n);
  });

  it("accepts a higher subsequent bid and notifies only the former leader", async () => {
    const db = bidDatabase();
    mocks.requireUser.mockResolvedValueOnce({ id: "buyer-a" }).mockResolvedValueOnce({ id: "buyer-b" });
    expect((await placeAuctionBid(id, 10_000n, key())).ok).toBe(true);
    expect((await placeAuctionBid(id, 10_500n, key())).ok).toBe(true);
    expect(db.auction.currentBidPaise).toBe(10_500n);
    expect(db.accepted).toHaveLength(2);
    expect(db.notices).toHaveLength(1);
    expect(db.notices[0]).toMatchObject({ userId: "buyer-a", type: "AUCTION_OUTBID" });
  });

  it("rejects a bid after server end time", async () => {
    const db = bidDatabase();
    db.auction.endsAt = new Date(Date.now() - 1);
    mocks.requireUser.mockResolvedValue({ id: "buyer-a" });
    expect(await placeAuctionBid(id, 10_000n, key())).toMatchObject({ ok: false });
    expect(db.accepted).toHaveLength(0);
  });

  it("rejects bids before start and from the seller or an unauthenticated account", async () => {
    const beforeStart = bidDatabase();
    beforeStart.auction.startsAt = new Date(Date.now() + 60_000);
    mocks.requireUser.mockResolvedValue({ id: "buyer-a" });
    expect(await placeAuctionBid(id, 10_000n, key())).toMatchObject({ ok: false, message: "This auction is not accepting bids." });

    const seller = bidDatabase();
    mocks.requireUser.mockResolvedValue({ id: "seller-owner" });
    expect(await placeAuctionBid(id, 10_000n, key())).toMatchObject({ ok: false, message: "Sellers cannot bid on their own artwork." });
    expect(seller.accepted).toHaveLength(0);

    mocks.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
    expect(await placeAuctionBid(id, 10_000n, key())).toMatchObject({ ok: false, message: "Sign in to continue." });
  });

  it("treats a repeated idempotency key as one bid", async () => {
    const db = bidDatabase();
    const repeatedKey = key();
    mocks.requireUser.mockResolvedValue({ id: "buyer-a" });
    expect((await placeAuctionBid(id, 10_000n, repeatedKey)).ok).toBe(true);
    expect((await placeAuctionBid(id, 10_000n, repeatedKey)).ok).toBe(true);
    expect(db.accepted).toHaveLength(1);
  });

  it("extends the persisted end by two minutes for a valid final-two-minute bid", async () => {
    const db = bidDatabase();
    const originalEnd = new Date(Date.now() + 90_000);
    db.auction.endsAt = originalEnd;
    mocks.requireUser.mockResolvedValue({ id: "buyer-a" });
    expect((await placeAuctionBid(id, 10_000n, key())).ok).toBe(true);
    expect(db.auction.endsAt.getTime()).toBe(originalEnd.getTime() + 120_000);
  });
});
