import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auctionPaymentExpired, minimumAllowedBid } from "@/lib/auctions/rules";

describe("auction safety rules", () => {
  it("requires opening bid first, then the persisted increment", () => {
    expect(minimumAllowedBid(10_000n, null, 500n)).toBe(10_000n);
    expect(minimumAllowedBid(10_000n, 15_000n, 500n)).toBe(15_500n);
  });
  it("expires payment at the 24-hour deadline without a runner-up path", () => {
    const deadline = new Date("2026-01-02T00:00:00.000Z");
    expect(auctionPaymentExpired(deadline, new Date("2026-01-01T23:59:59.999Z"))).toBe(false);
    expect(auctionPaymentExpired(deadline, deadline)).toBe(true);
  });
  it("keeps fixed-price checkout availability strict and documents auction finalization guards", () => {
    const checkout = readFileSync("app/actions/checkout.ts", "utf8");
    const finalizer = readFileSync("lib/payments/finalize.ts", "utf8");
    expect(checkout).toContain('row.availability !== "AVAILABLE"');
    expect(finalizer).toContain('eq(artworks.availability, "RESERVED")');
    expect(finalizer).toContain('auction.winnerId !== order.buyerId');
    expect(finalizer).toContain('eq(auctions.status, "PAYMENT_PENDING")');
  });
});
