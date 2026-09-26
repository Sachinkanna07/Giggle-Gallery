import { describe, expect, it } from "vitest";
import { isCapturedExpectedPayment, matchesProviderPaymentIdentity } from "@/lib/payments/provider-state";

const payment = { id: "pay_one", order_id: "order_one", amount: 12_345, currency: "INR", status: "captured" };

describe("provider capture boundary", () => {
  it("requires the exact provider payment and order relationship", () => {
    expect(matchesProviderPaymentIdentity(payment, "pay_one", "order_one")).toBe(true);
    expect(matchesProviderPaymentIdentity(payment, "pay_other", "order_one")).toBe(false);
    expect(matchesProviderPaymentIdentity(payment, "pay_one", "order_other")).toBe(false);
  });

  it("only recognizes captured INR at the persisted paise amount", () => {
    expect(isCapturedExpectedPayment(payment, 12_345n)).toBe(true);
    expect(isCapturedExpectedPayment({ ...payment, status: "authorized" }, 12_345n)).toBe(false);
    expect(isCapturedExpectedPayment({ ...payment, amount: 12_344 }, 12_345n)).toBe(false);
    expect(isCapturedExpectedPayment({ ...payment, currency: "USD" }, 12_345n)).toBe(false);
  });
});
