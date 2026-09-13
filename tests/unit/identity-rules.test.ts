import { describe, expect, it } from "vitest";
import {
  evaluateProviderLink,
  hashDestination,
  hasVerifiedEmailConflict,
  hasVerifiedPhoneConflict,
  normalizeEmail,
  normalizePhoneE164,
} from "../../lib/identity/rules";

const pepper = "unit-test-only-pepper-with-more-than-32-characters";

describe("identity normalization and hashing", () => {
  it("normalizes email consistently", () => {
    expect(normalizeEmail("  Artist.Name@EXAMPLE.COM ")).toBe("artist.name@example.com");
  });

  it("creates deterministic destination hashes without embedding raw contact data", () => {
    const email = "artist@example.com";
    const digest = hashDestination("EMAIL", email, pepper);
    expect(digest).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(digest).not.toContain(email);
    expect(digest).toBe(hashDestination("EMAIL", " ARTIST@example.com ", pepper));
  });

  it("normalizes already international phone input without guessing a country", () => {
    expect(normalizePhoneE164("+91 (98765) 43210")).toBe("+919876543210");
    expect(() => normalizePhoneE164("9876543210")).toThrow(/country code/);
  });
});

describe("verified destination conflicts", () => {
  it("detects another user's verified normalized email", () => {
    const records = [
      { id: "current", email: "current@example.com", emailVerified: new Date() },
      { id: "other", email: "ARTIST@example.com", emailVerified: new Date() },
      { id: "unverified", email: "pending@example.com", emailVerified: null },
    ];
    expect(hasVerifiedEmailConflict(records, "current", "artist@EXAMPLE.com")).toBe(true);
    expect(hasVerifiedEmailConflict(records, "current", "pending@example.com")).toBe(false);
  });

  it("detects another user's verified normalized phone", () => {
    const records = [
      { id: "current", phoneE164: "+14155550100", phoneVerifiedAt: new Date() },
      { id: "other", phoneE164: "+919876543210", phoneVerifiedAt: new Date() },
      { id: "unverified", phoneE164: "+442071838750", phoneVerifiedAt: null },
    ];
    expect(hasVerifiedPhoneConflict(records, "current", "+91 98765 43210")).toBe(true);
    expect(hasVerifiedPhoneConflict(records, "current", "+44 20 7183 8750")).toBe(false);
  });
});

describe("provider account linking policy", () => {
  const base = {
    targetUserId: "user-1",
    targetEmail: "collector@example.com",
    targetEmailVerified: true,
    providerEmail: "COLLECTOR@example.com",
    providerEmailVerified: true,
    mode: "AUTOMATIC" as const,
    authenticatedTargetUser: false,
    recentAuthentication: false,
  };

  it("allows automatic linking only for matching verified email identities", () => {
    expect(evaluateProviderLink(base)).toEqual({ allowed: true, reason: "VERIFIED_EMAIL_MATCH" });
    expect(evaluateProviderLink({ ...base, providerEmail: "attacker@example.com" })).toEqual({ allowed: false, reason: "EMAIL_MISMATCH" });
    expect(evaluateProviderLink({ ...base, providerEmailVerified: false })).toEqual({ allowed: false, reason: "VERIFIED_EMAIL_REQUIRED" });
  });

  it("refuses a provider identity already connected to another user", () => {
    expect(evaluateProviderLink({ ...base, existingAccountUserId: "user-2" })).toEqual({ allowed: false, reason: "PROVIDER_ACCOUNT_IN_USE" });
  });

  it("requires a recent authenticated session for explicit linking", () => {
    expect(evaluateProviderLink({ ...base, mode: "EXPLICIT", authenticatedTargetUser: true, recentAuthentication: true })).toEqual({ allowed: true, reason: "EXPLICIT_RECENT_AUTH" });
    expect(evaluateProviderLink({ ...base, mode: "EXPLICIT", authenticatedTargetUser: true, recentAuthentication: false })).toEqual({ allowed: false, reason: "RECENT_AUTH_REQUIRED" });
  });
});
