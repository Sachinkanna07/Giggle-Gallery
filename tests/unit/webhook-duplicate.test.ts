import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getWebhookEventIdentity } from "../../lib/webhook-event";

describe("webhook duplicate protection", () => {
  it("derives a stable fallback event identity from the exact body", () => {
    const body = JSON.stringify({ event: "payment.captured", id: "pay_1" });
    expect(getWebhookEventIdentity(body)).toEqual(getWebhookEventIdentity(body));
    expect(getWebhookEventIdentity(`${body} `).providerEventId).not.toBe(getWebhookEventIdentity(body).providerEventId);
  });

  it("persists a provider/event unique key and claims before payment work", () => {
    const schema = readFileSync("db/schema.ts", "utf8");
    const route = readFileSync("app/api/webhooks/razorpay/route.ts", "utf8");
    expect(schema).toContain('uniqueIndex("webhook_events_provider_event_unique").on(table.provider, table.providerEventId)');
    expect(route.indexOf("claimWebhookEvent(")).toBeGreaterThan(-1);
    expect(route.indexOf("claimWebhookEvent(")).toBeLessThan(route.indexOf("finalizeRazorpayPayment("));
    expect(route).toContain("duplicate: true");
  });
});
