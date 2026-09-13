import { describe, expect, it } from "vitest";
import { applyBasisPoints, majorToMinorUnits, minorToMajorUnits, toSafeProviderAmount } from "../../lib/money";

describe("integer money helpers", () => {
  it("converts decimal major units to paise without floating-point arithmetic", () => {
    expect(majorToMinorUnits("1234.56")).toBe(BigInt(123_456));
    expect(minorToMajorUnits(BigInt(123_456))).toBe("1234.56");
  });

  it("rounds basis-point calculations to the nearest paise", () => {
    expect(applyBasisPoints(BigInt(10_001), 1_500)).toBe(BigInt(1_500));
  });

  it("rejects malformed or provider-unsafe amounts", () => {
    expect(() => majorToMinorUnits("12.345")).toThrow(/Invalid money/);
    expect(() => toSafeProviderAmount(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1))).toThrow(/provider-safe/);
  });
});
