import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getDb: vi.fn(),
  getRazorpay: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/razorpay", () => ({ getRazorpay: mocks.getRazorpay }));

import { beginCheckout } from "../../app/actions/checkout";

const validAddress = {
  fullName: "John Doe",
  phone: "1234567890",
  line1: "123 Main St",
  city: "Mumbai",
  state: "MH",
  postalCode: "400001",
  country: "IN",
};

describe("Checkout Flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.RAZORPAY_KEY_ID = "test_key";
    process.env.GST_RATE_BPS = "1800";
  });

  function setupDb(cartRows: Record<string, unknown>[]) {
    const tx = {
      select: vi.fn().mockReturnValue({ from: () => ({ where: () => ({ orderBy: () => ({ for: () => Promise.resolve(cartRows.map((row) => ({ id: row.artworkId, price: row.price, artistId: row.artistId, currency: row.currency, type: row.type, status: row.status, availability: row.availability, stock: row.stock }))) }) }) }) }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "mock-id" }]) }) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    };
    const db = {
      select: vi.fn().mockReturnValue({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                where: vi.fn().mockResolvedValue(cartRows)
              })
            })
          })
        })
      }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ catch: vi.fn() }) }) }),
      transaction: vi.fn(async (cb) => cb(tx)),
    };
    mocks.getDb.mockReturnValue(db);
    return { db, tx };
  }

  it("fails if cart is empty", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user1" });
    setupDb([]);
    const res = await beginCheckout(validAddress);
    expect(res).toEqual({ ok: false, error: "Your cart is empty." });
  });

  it("cannot buy unpublished artwork", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user1" });
    setupDb([{ status: "DRAFT", availability: "AVAILABLE", quantity: 1, stock: 1, currency: "INR" }]);
    const res = await beginCheckout(validAddress);
    expect(res).toEqual({ ok: false, error: "One or more artworks are no longer available in that quantity." });
  });

  it("cannot buy out-of-stock artwork", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user1" });
    setupDb([{ status: "PUBLISHED", availability: "SOLD_OUT", quantity: 1, stock: 0, currency: "INR" }]);
    const res = await beginCheckout(validAddress);
    expect(res).toEqual({ ok: false, error: "One or more artworks are no longer available in that quantity." });
  });

  it("cannot buy more than available stock", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user1" });
    setupDb([{ status: "PUBLISHED", availability: "AVAILABLE", quantity: 2, stock: 1, currency: "INR" }]);
    const res = await beginCheckout(validAddress);
    expect(res).toEqual({ ok: false, error: "One or more artworks are no longer available in that quantity." });
  });

  it("blocks fixed-price checkout when scheduling reserves artwork before the locked read", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user1" });
    const rows = [{ artworkId: "art1", price: "100.00", status: "PUBLISHED", availability: "AVAILABLE", quantity: 1, stock: 1, currency: "INR", type: "DIGITAL" }];
    const { tx } = setupDb(rows);
    tx.select.mockReturnValue({ from: () => ({ where: () => ({ orderBy: () => ({ for: () => Promise.resolve([{ id: "art1", price: "100.00", status: "PUBLISHED", availability: "RESERVED", stock: 1 }]) }) }) }) });
    const result = await beginCheckout(validAddress);
    expect(result).toEqual({ ok: false, error: "An artwork changed availability or price. Review your cart and try again." });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("order creation uses server-side price and creates Razorpay order", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user1", name: "John", email: "john@test.com" });
    const { tx } = setupDb([{ 
      artworkId: "art1", 
      artistId: "artist1",
      title: "Art 1",
      artistName: "Artist 1",
      price: "100.00", 
      status: "PUBLISHED", 
      availability: "AVAILABLE", 
      quantity: 1, 
      stock: 1, 
      currency: "INR",
      type: "DIGITAL" 
    }]);
    
    mocks.getRazorpay.mockReturnValue({
      orders: {
        create: vi.fn().mockResolvedValue({ id: "rzp_order_123" })
      }
    });

    const res = await beginCheckout(validAddress);
    
    // 100 INR = 10000 paise. 18% GST = 1800 paise. Total = 11800 paise.
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.amountPaise).toBe(11800); // Verify total amount
      expect(res.providerOrderId).toBe("rzp_order_123");
    }

    // Verify orderItems insert uses the server price
    expect(tx.insert).toHaveBeenCalledTimes(5); // addresses, orders, orderItems, then payments/paymentAttempts in 2nd tx
    // To find the orderItems, look at all calls to the .values() method on the insert chain mock
    const valuesCalls = tx.insert().values.mock.calls;
    const itemsCall = valuesCalls.find((call: unknown[]) => Array.isArray(call[0]) && call[0][0] && (call[0][0] as Record<string, unknown>).unitPrice === "100.00");
    expect(itemsCall).toBeDefined();
    expect(itemsCall[0][0].lineTotal).toBe("100.00"); // 10000 paise -> 100 major units
  });
});
