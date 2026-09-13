import { describe, expect, it } from "vitest";
import {
  createRazorpayPaymentSignature,
  createRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../../lib/razorpay-signatures";

describe("Razorpay signature verification", () => {
  it("accepts the expected payment signature and rejects tampering", () => {
    const signature = createRazorpayPaymentSignature("order_test", "pay_test", "test-secret");
    expect(verifyRazorpayPaymentSignature("order_test", "pay_test", signature, "test-secret")).toBe(true);
    expect(verifyRazorpayPaymentSignature("order_test", "pay_changed", signature, "test-secret")).toBe(false);
  });

  it("verifies the exact raw webhook body", () => {
    const body = JSON.stringify({ event: "payment.captured", value: 1 });
    const signature = createRazorpayWebhookSignature(body, "webhook-secret");
    expect(verifyRazorpayWebhookSignature(body, signature, "webhook-secret")).toBe(true);
    expect(verifyRazorpayWebhookSignature(`${body} `, signature, "webhook-secret")).toBe(false);
  });
});
