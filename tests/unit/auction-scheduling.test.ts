import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistProfiles, auctions, artworks } from "@/db/schema";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), requireSeller: vi.fn(), getDb: vi.fn(), revalidatePath: vi.fn(), requireAuctionsEnabled: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireUser: vi.fn(), requireSeller: mocks.requireSeller, requireAdmin: mocks.requireAdmin }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auctions/feature-flag", () => ({ requireAuctionsEnabled: mocks.requireAuctionsEnabled }));

import { cancelAuction, createAuctionDraft, scheduleAuction } from "../../app/actions/auctions";

const auctionId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

function database(pendingOrder: boolean) {
  const auction = { id: auctionId, artworkId: "art-1", sellerId: "seller-1", status: "DRAFT", startsAt: new Date(Date.now() + 1_800_000), endsAt: new Date(Date.now() + 3_600_000) };
  const artwork = { id: "art-1", artistId: "seller-1", status: "PUBLISHED", availability: "AVAILABLE", stock: 1, currency: "INR" };
  const updates: unknown[] = [];
  const tx = {
    select: vi.fn().mockImplementation(() => ({ from: (table: unknown) => ({
      where: () => ({ limit: () => {
        if (table === auctions) return { for: async () => [auction] };
        if (table === artworks) return { for: async () => [artwork] };
        if (table === artistProfiles) return Promise.resolve([{ userId: "seller-user" }]);
        return Promise.resolve([]);
      } }),
      innerJoin: () => ({ where: () => ({ limit: async () => pendingOrder ? [{ id: "pending-order" }] : [] }) }),
    }) })),
    update: vi.fn().mockImplementation((table: unknown) => ({ set: (value: unknown) => ({ where: () => {
      updates.push({ table, value });
      if (table === artworks) { if ((value as { availability?: string }).availability) artwork.availability = (value as { availability: "AVAILABLE" }).availability; return { returning: async () => [{ id: "art-1" }] }; }
      if (table === auctions && (value as { status?: string }).status) auction.status = (value as { status: string }).status;
      return Promise.resolve(undefined);
    } }) })),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  };
  mocks.getDb.mockReturnValue({ transaction: (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) });
  return { tx, updates, artwork, auction };
}

beforeEach(() => { vi.resetAllMocks(); mocks.requireAdmin.mockResolvedValue({ id: "admin-1" }); mocks.requireSeller.mockResolvedValue({ id: "seller-user" }); });

describe("auction scheduling inventory boundary", () => {
  it("creates a seller-owned eligible auction as a draft without reserving inventory", async () => {
    const inserted: Array<{ table: unknown; value: unknown }> = [];
    const tx = {
      select: vi.fn().mockImplementation(() => ({ from: (table: unknown) => ({ where: () => ({ limit: () => table === artistProfiles ? Promise.resolve([{ id: "seller-1" }]) : { for: async () => [{ id: "art-1", artistId: "seller-1", status: "PUBLISHED", availability: "AVAILABLE", stock: 1, currency: "INR" }] } }) }) })),
      insert: vi.fn().mockImplementation((table: unknown) => ({ values: (value: unknown) => {
        inserted.push({ table, value });
        return table === auctions ? { returning: async () => [{ id: auctionId }] } : Promise.resolve(undefined);
      } })),
    };
    mocks.getDb.mockReturnValue({ transaction: (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) });
    const result = await createAuctionDraft({ artworkId: auctionId, openingBidPaise: 10_000n, minimumIncrementPaise: 500n, startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 3_600_000) });
    expect(result).toMatchObject({ ok: true, auctionId });
    expect(inserted.some((entry) => entry.table === auctions)).toBe(true);
    expect(tx.select).toHaveBeenCalledTimes(2);
  });

  it("does not reserve stock while a fixed-price order has pending payment", async () => {
    const db = database(true);
    const result = await scheduleAuction(auctionId);
    expect(result).toMatchObject({ ok: false });
    expect(result.message).toMatch(/pending fixed-price payment/i);
    expect(db.tx.update).not.toHaveBeenCalled();
    expect(db.artwork.availability).toBe("AVAILABLE");
  });

  it("reserves eligible artwork only when admin schedules the draft", async () => {
    const db = database(false);
    expect(await scheduleAuction(auctionId)).toMatchObject({ ok: true });
    expect(db.updates.some((entry) => (entry as { table: unknown; value: { availability?: string } }).table === artworks && (entry as { value: { availability?: string } }).value.availability === "RESERVED")).toBe(true);
    expect(db.updates.some((entry) => (entry as { table: unknown; value: { status?: string } }).table === auctions && (entry as { value: { status?: string } }).value.status === "SCHEDULED")).toBe(true);
  });

  it("allows admin to cancel a draft without touching inventory", async () => {
    const db = database(false);
    expect(await cancelAuction(auctionId)).toMatchObject({ ok: true });
    expect(db.auction.status).toBe("CANCELLED");
    expect(db.artwork.availability).toBe("AVAILABLE");
  });

  it("releases a scheduled reservation only before start and with no bids", async () => {
    const db = database(false);
    db.auction.status = "SCHEDULED";
    db.artwork.availability = "RESERVED";
    expect(await cancelAuction(auctionId)).toMatchObject({ ok: true });
    expect(db.auction.status).toBe("CANCELLED");
    expect(db.artwork.availability).toBe("AVAILABLE");
  });
});
