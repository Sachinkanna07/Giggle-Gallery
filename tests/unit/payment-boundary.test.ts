import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("payment finalization boundary", () => {
  it("keeps paid-state mutation out of remotely callable Server Actions", () => {
    const actions = readFileSync("app/actions/checkout.ts", "utf8");
    const service = readFileSync("lib/payments/finalize.ts", "utf8");
    expect(actions).toContain('"use server"');
    expect(actions).not.toMatch(/export\s+(async\s+)?function\s+(mark|finalize).*Payment/i);
    expect(service).toContain('import "server-only"');
    expect(service).not.toContain('"use server"');
  });

  it("finalizes only after signature verification in both trusted routes", () => {
    for (const path of ["app/api/payments/razorpay/verify/route.ts", "app/api/webhooks/razorpay/route.ts"]) {
      const source = readFileSync(path, "utf8");
      const verifyIndex = source.indexOf(path.includes("webhooks") ? "verifyRazorpayWebhook(" : "verifyRazorpayPayment(");
      expect(verifyIndex).toBeGreaterThan(-1);
      expect(source.indexOf("finalizeRazorpayPayment(")).toBeGreaterThan(verifyIndex);
    }
  });
});
