import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("marketplace role and ownership boundaries", () => {
  it("checks ADMIN access before loading oversight data", () => {
    const source = readFileSync("app/admin/page.tsx", "utf8");
    expect(source.indexOf('session?.user?.role !== "ADMIN"')).toBeGreaterThan(-1);
    expect(source.indexOf('session?.user?.role !== "ADMIN"')).toBeLessThan(source.indexOf("getDb()"));
    expect(source).not.toMatch(/providerPaymentId|providerOrderId|mark as paid/i);
  });

  it("scopes buyer order history to the authenticated buyer id", () => {
    const source = readFileSync("lib/marketplace-data.ts", "utf8");
    const start = source.indexOf("export async function getBuyerOrders");
    const end = source.indexOf("export async function getSellerOrders", start);
    expect(source.slice(start, end)).toContain("eq(orders.buyerId, userId)");
  });

  it("scopes seller orders to the seller artist and paid fulfillment states", () => {
    const source = readFileSync("lib/marketplace-data.ts", "utf8");
    const start = source.indexOf("export async function getSellerOrders");
    const end = source.indexOf("export async function getSellerSnapshot", start);
    const implementation = source.slice(start, end);
    expect(implementation).toContain("eq(orderItems.artistId, artist.id)");
    expect(implementation).toContain('eq(orders.paymentStatus, "PAID")');
    expect(implementation).not.toContain("orders.buyerId");
  });
});
