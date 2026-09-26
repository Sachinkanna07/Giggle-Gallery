import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auctionPaymentExpired, extendedAuctionEnd, minimumAllowedBid } from "@/lib/auctions/rules";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";

describe("auction safety rules", () => {
  it("fails closed unless both flags and a Razorpay test key are present", () => {
    const previous = { enabled: process.env.AUCTIONS_ENABLED, test: process.env.AUCTIONS_TEST_MODE, key: process.env.RAZORPAY_KEY_ID };
    try {
      process.env.AUCTIONS_ENABLED = "false";
      process.env.AUCTIONS_TEST_MODE = "true";
      process.env.RAZORPAY_KEY_ID = "rzp_test_placeholder";
      expect(auctionsEnabled()).toBe(false);
      process.env.AUCTIONS_ENABLED = "true";
      process.env.RAZORPAY_KEY_ID = "rzp_live_placeholder";
      expect(auctionsEnabled()).toBe(false);
      process.env.RAZORPAY_KEY_ID = "rzp_test_placeholder";
      expect(auctionsEnabled()).toBe(true);
    } finally {
      if (previous.enabled === undefined) delete process.env.AUCTIONS_ENABLED; else process.env.AUCTIONS_ENABLED = previous.enabled;
      if (previous.test === undefined) delete process.env.AUCTIONS_TEST_MODE; else process.env.AUCTIONS_TEST_MODE = previous.test;
      if (previous.key === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previous.key;
    }
  });
  it("requires opening bid first, then the persisted increment", () => {
    expect(minimumAllowedBid(10_000n, null, 500n)).toBe(10_000n);
    expect(minimumAllowedBid(10_000n, 15_000n, 500n)).toBe(15_500n);
  });
  it("expires payment at the 24-hour deadline without a runner-up path", () => {
    const deadline = new Date("2026-01-02T00:00:00.000Z");
    expect(auctionPaymentExpired(deadline, new Date("2026-01-01T23:59:59.999Z"))).toBe(false);
    expect(auctionPaymentExpired(deadline, deadline)).toBe(true);
  });
  it("extends only bids accepted in the final two minutes", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(extendedAuctionEnd(new Date("2026-01-01T00:01:59.000Z"), now)?.toISOString()).toBe("2026-01-01T00:03:59.000Z");
    expect(extendedAuctionEnd(new Date("2026-01-01T00:02:01.000Z"), now)).toBeNull();
    expect(extendedAuctionEnd(now, now)).toBeNull();
  });
  it("keeps fixed-price checkout availability strict and documents auction finalization guards", () => {
    const checkout = readFileSync("app/actions/checkout.ts", "utf8");
    const finalizer = readFileSync("lib/payments/finalize.ts", "utf8");
    expect(checkout).toContain('row.availability !== "AVAILABLE"');
    expect(finalizer).toContain('eq(artworks.availability, "RESERVED")');
    expect(finalizer).toContain('auction.winnerId !== order.buyerId');
    expect(finalizer).toContain('eq(auctions.status, "PAYMENT_PENDING")');
  });
  it("keeps public bid history anonymous", () => {
    const stateRoute = readFileSync("app/api/auctions/[id]/state/route.ts", "utf8");
    const publicHistory = stateRoute.match(/recentBids:\s*latest\.map\(\(bid\)\s*=>\s*\(\{([^}]*)\}\)\)/)?.[1];
    expect(publicHistory).toBeDefined();
    expect(publicHistory).not.toMatch(/email|phone|bidderId/);
    expect(publicHistory).toContain("amountPaise");
    expect(publicHistory).toContain("createdAt");
  });
});
