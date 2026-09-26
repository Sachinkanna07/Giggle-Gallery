import { beforeEach, describe, expect, it, vi } from "vitest";
import { auctionPaymentAttempts, auctions, artworks, payments } from "@/db/schema";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getDb: vi.fn(), getRazorpay: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/razorpay", () => ({ getRazorpay: mocks.getRazorpay }));

import { beginAuctionCheckout } from "@/app/actions/checkout";

const auctionId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const address = { fullName: "Buyer One", phone: "9876543210", line1: "1 Gallery Road", city: "Mumbai", state: "MH", postalCode: "400001", country: "IN" };

function auctionCheckoutDatabase(options: { winnerId?: string; existingOrder?: boolean } = {}) {
  const winnerId = options.winnerId ?? "buyer-1";
  const deadline = new Date(Date.now() + 60 * 60_000);
  const sale = { id: auctionId, artworkId: "art-1", sellerId: "artist-1", status: "PAYMENT_PENDING", winnerId, winningBidPaise: 10_000n, paymentDeadlineAt: deadline };
  const obligation = { id: "attempt-1", auctionId, winnerId, winningBidPaise: 10_000n, deadlineAt: deadline, status: "PENDING", orderId: options.existingOrder ? "order-1" : null, amountPaise: options.existingOrder ? 45_000n : null };
  const inserted: Array<{ table: unknown; value: unknown }> = [];
  const artwork = { id: "art-1", artistId: "artist-1", displayName: "Artist", title: "Artwork", type: "PHYSICAL", status: "PUBLISHED", availability: "RESERVED", stock: 1 };
  const selectFrom = (table: unknown, locked: boolean) => ({
    where: () => ({
      limit: () => locked && (table === auctions || table === auctionPaymentAttempts)
        ? { for: async () => [table === auctions ? sale : obligation] }
        : Promise.resolve(table === auctions ? [sale] : table === auctionPaymentAttempts ? [obligation] : table === artworks ? [artwork] : table === payments && options.existingOrder ? [{ providerOrderId: "order_provider_existing", status: "PENDING" }] : []),
    }),
    innerJoin: () => ({ where: () => ({ limit: () => ({ for: async () => [artwork] }) }) }),
  });
  const tx = {
    select: vi.fn().mockImplementation(() => ({ from: (table: unknown) => selectFrom(table, true) })),
    insert: vi.fn().mockImplementation((table: unknown) => ({ values: (value: unknown) => {
      inserted.push({ table, value });
      if (table === payments) return Promise.resolve(undefined);
      if ((value as Record<string, unknown>).userId) return { returning: async () => [{ id: "address-1" }] };
      if ((value as Record<string, unknown>).orderNumber) return { returning: async () => [{ id: "order-1" }] };
      return Promise.resolve(undefined);
    } })),
    update: vi.fn().mockReturnValue({ set: (value: { orderId?: string; amountPaise?: bigint }) => ({ where: async () => Object.assign(obligation, value) }) }),
  };
  const db = {
    select: vi.fn().mockImplementation(() => ({ from: (table: unknown) => selectFrom(table, false) })),
    transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  mocks.getDb.mockReturnValue(db);
  return { inserted, obligation };
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.AUCTIONS_ENABLED = "true";
  process.env.AUCTIONS_TEST_MODE = "true";
  process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  process.env.GST_RATE_BPS = "0";
  mocks.requireUser.mockResolvedValue({ id: "buyer-1", name: "Buyer", email: "buyer@example.com" });
  mocks.getRazorpay.mockReturnValue({ orders: { create: vi.fn().mockResolvedValue({ id: "order_provider_new" }) } });
});

describe("auction winner checkout", () => {
  it("derives winning bid and shipping on the server and binds one provider order", async () => {
    const db = auctionCheckoutDatabase();
    const result = await beginAuctionCheckout(auctionId, address);
    expect(result).toMatchObject({ ok: true, amountPaise: 45_000, providerOrderId: "order_provider_new" });
    expect(db.obligation).toMatchObject({ orderId: "order-1", amountPaise: 45_000n });
    expect(db.inserted.some((entry) => entry.table === payments)).toBe(true);
  });

  it("returns the already-bound pending provider order instead of creating a duplicate", async () => {
    auctionCheckoutDatabase({ existingOrder: true });
    const result = await beginAuctionCheckout(auctionId, address);
    expect(result).toMatchObject({ ok: true, providerOrderId: "order_provider_existing", internalOrderId: "order-1" });
    expect(mocks.getRazorpay().orders.create).not.toHaveBeenCalled();
  });

  it("rejects every user except the persisted winner", async () => {
    auctionCheckoutDatabase({ winnerId: "buyer-2" });
    expect(await beginAuctionCheckout(auctionId, address)).toEqual({ ok: false, error: "This auction payment is no longer available." });
    expect(mocks.getRazorpay().orders.create).not.toHaveBeenCalled();
  });
});
