import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getDb: vi.fn(),
  revalidate: vi.fn(),
  hasDatabase: vi.fn().mockReturnValue(true),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/db", () => ({ getDb: mocks.getDb, hasDatabase: mocks.hasDatabase }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { setCartQuantity } from "../../app/actions/marketplace";
import { getViewerState } from "../../lib/marketplace-data";

describe("Cart Unavailable Items Handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.hasDatabase.mockReturnValue(true);
  });

  it("allows removing (quantity=0) a rejected or unavailable artwork from cart", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn() }) }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "cart-1" }]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    };
    mocks.getDb.mockReturnValue(db);

    const result = await setCartQuantity("11111111-1111-4111-a111-111111111111", 0);
    expect(result).toEqual({ ok: true, quantity: 0 });
    expect(db.delete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
  });

  it("getViewerState computes isAvailable: false and unavailableReason for rejected or out of stock items", async () => {
    const rawCartRows = [
      {
        artworkId: "art-rejected",
        quantity: 1,
        title: "Rejected Art",
        artist: "Artist A",
        price: "100.00",
        currency: "INR",
        stock: 1,
        availability: "AVAILABLE",
        status: "REJECTED",
        type: "DIGITAL",
      },
      {
        artworkId: "art-soldout",
        quantity: 1,
        title: "Sold Out Art",
        artist: "Artist B",
        price: "200.00",
        currency: "INR",
        stock: 0,
        availability: "SOLD_OUT",
        status: "PUBLISHED",
        type: "PHYSICAL",
      },
      {
        artworkId: "art-valid",
        quantity: 1,
        title: "Valid Art",
        artist: "Artist C",
        price: "300.00",
        currency: "INR",
        stock: 5,
        availability: "AVAILABLE",
        status: "PUBLISHED",
        type: "DIGITAL",
      },
    ];

    const makeQueryObj = (val: unknown) => Object.assign(Promise.resolve(val), {
      limit: vi.fn().mockResolvedValue(val),
      orderBy: vi.fn().mockImplementation(() => makeQueryObj(val)),
    });

    const db = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => makeQueryObj([])),
          innerJoin: vi.fn().mockImplementation(() => ({
            leftJoin: vi.fn().mockImplementation(() => ({
              leftJoin: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockImplementation(() => Promise.resolve(rawCartRows)),
              })),
            })),
          })),
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => makeQueryObj([])),
          })),
        })),
      })),
    };
    mocks.getDb.mockReturnValue(db);

    const viewerState = await getViewerState("user-1");
    expect(viewerState.cart).toHaveLength(3);

    const rejectedItem = viewerState.cart.find((i) => i.artworkId === "art-rejected");
    expect(rejectedItem?.isAvailable).toBe(false);
    expect(rejectedItem?.unavailableReason).toBe("This artwork is no longer listed in the gallery.");

    const soldoutItem = viewerState.cart.find((i) => i.artworkId === "art-soldout");
    expect(soldoutItem?.isAvailable).toBe(false);
    expect(soldoutItem?.unavailableReason).toBe("This artwork is sold out.");

    const validItem = viewerState.cart.find((i) => i.artworkId === "art-valid");
    expect(validItem?.isAvailable).toBe(true);
    expect(validItem?.unavailableReason).toBeUndefined();
  });
});
