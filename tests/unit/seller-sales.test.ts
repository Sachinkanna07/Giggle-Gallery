import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  hasDatabase: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: mocks.getDb, hasDatabase: mocks.hasDatabase }));
vi.mock("server-only", () => ({}));

import { getSellerSnapshot } from "../../lib/marketplace-data";

function setupDb(sales: Record<string, unknown>[]) {
  let selectCall = 0;
  mocks.getDb.mockReturnValue({
    select: vi.fn(() => {
      selectCall += 1;
      if (selectCall === 1) {
        return { from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([{ id: "artist-1", displayName: "Test Artist" }]) }) }) };
      }
      if (selectCall === 2) {
        return { from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([]) }) }) };
      }
      if (selectCall === 4) {
        return { from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: vi.fn().mockResolvedValue(sales) }) }) }) };
      }
      return { from: () => ({ where: () => ({ orderBy: vi.fn().mockResolvedValue([]) }) }) };
    }),
  });
}

describe("Seller Sales Snapshot", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.hasDatabase.mockReturnValue(true);
  });

  it("does not count a pending unpaid order as a seller sale or revenue", async () => {
    setupDb([{
      id: "pending-sale",
      sellerEarnings: "90.00",
      status: "PENDING",
      paymentStatus: "PENDING",
    }]);

    const snapshot = await getSellerSnapshot("user-1");

    expect(snapshot.sales).toEqual([]);
    expect(snapshot.sales.reduce((total, sale) => total + Number(sale.sellerEarnings), 0)).toBe(0);
  });

  it("counts only paid orders in an active fulfillment state", async () => {
    setupDb([
      { id: "paid-sale", sellerEarnings: "90.00", status: "CONFIRMED", paymentStatus: "PAID" },
      { id: "unpaid-sale", sellerEarnings: "70.00", status: "CONFIRMED", paymentStatus: "PENDING" },
      { id: "cancelled-sale", sellerEarnings: "50.00", status: "CANCELLED", paymentStatus: "PAID" },
    ]);

    const snapshot = await getSellerSnapshot("user-1");

    expect(snapshot.sales.map((sale) => sale.id)).toEqual(["paid-sale"]);
    expect(snapshot.sales.reduce((total, sale) => total + Number(sale.sellerEarnings), 0)).toBe(90);
  });
});
