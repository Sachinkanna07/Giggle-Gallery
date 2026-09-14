import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  createEmailVerificationChallenge,
  deliverEmailVerificationChallenge,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSE,
  EMAIL_VERIFICATION_TTL_MS,
  evaluateEmailVerificationAttempt,
  evaluateEmailVerificationRequest,
  generateNumericOtp,
  hashEmailVerificationChallenge,
  parseEmailVerificationAttempt,
  parseEmailVerificationCancellation,
  parseEmailVerificationRequest,
  type EmailVerificationEventRecord,
  type EmailVerificationIdentity,
  type VerificationEmailProvider,
} from "../../lib/email-verification/core";
import { verificationEmailContent } from "../../lib/email/templates";
import { consumeRateLimit } from "../../lib/security/rate-limit";

const pepper = "email-verification-test-pepper-longer-than-32-characters";
const eventId = "55d95ab4-ce02-4cd4-9e21-9e62daf1188a";
const userId = "user-1";
const destinationHash = "v1:destination-hash";
const now = new Date("2026-09-14T10:00:00.000Z");

const activeIdentity: EmailVerificationIdentity = {
  id: userId,
  email: "collector@example.com",
  emailVerified: new Date("2026-09-01T00:00:00.000Z"),
  contactEmail: null,
  contactEmailVerifiedAt: null,
  accountStatus: "ACTIVE",
  disabled: false,
};

function challenge(code = "123456") {
  return createEmailVerificationChallenge({
    eventId,
    userId,
    destinationHash,
    pepper,
    now,
    randomInteger: () => Number(code),
  });
}

function pendingEvent(code = "123456", overrides: Partial<EmailVerificationEventRecord> = {}): EmailVerificationEventRecord {
  return { ...challenge(code).persisted, ...overrides };
}

function attempt(event: EmailVerificationEventRecord | null, code = "123456", overrides: Partial<Parameters<typeof evaluateEmailVerificationAttempt>[0]> = {}) {
  return evaluateEmailVerificationAttempt({
    event,
    authenticatedUserId: userId,
    destinationHash,
    challenge: code,
    pepper,
    now,
    ...overrides,
  });
}

describe("email verification request policy", () => {
  it("normalizes an email verification request", () => {
    expect(parseEmailVerificationRequest({ email: "  Collector@EXAMPLE.COM " })).toEqual({ email: "collector@example.com" });
  });

  it("recognizes an already verified primary email", () => {
    expect(evaluateEmailVerificationRequest(activeIdentity, "collector@example.com", false)).toBe("ALREADY_VERIFIED");
  });

  it("recognizes an already verified contact email", () => {
    const identity = { ...activeIdentity, contactEmail: "contact@example.com", contactEmailVerifiedAt: now };
    expect(evaluateEmailVerificationRequest(identity, "contact@example.com", false)).toBe("ALREADY_VERIFIED");
  });

  it("rejects a verified normalized email conflict without identifying its owner", () => {
    expect(evaluateEmailVerificationRequest(activeIdentity, "TAKEN@example.com".toLowerCase(), true)).toBe("EMAIL_UNAVAILABLE");
  });

  it("rejects a conflict with another unverified authentication identity", () => {
    expect(evaluateEmailVerificationRequest(activeIdentity, "pending@example.com", true)).toBe("EMAIL_UNAVAILABLE");
  });

  it("allows a different contact email without changing the identity object", () => {
    const before = structuredClone(activeIdentity);
    expect(evaluateEmailVerificationRequest(activeIdentity, "contact@example.com", false)).toBe("READY");
    expect(activeIdentity).toEqual(before);
    expect(activeIdentity.email).toBe("collector@example.com");
  });

  it.each(["SUSPENDED", "DISABLED", "PENDING_DELETION"] as const)("blocks %s accounts", (accountStatus) => {
    expect(evaluateEmailVerificationRequest({ ...activeIdentity, accountStatus }, "contact@example.com", false)).toBe("ACCOUNT_UNAVAILABLE");
  });

  it("blocks an identity disabled by the legacy kill switch", () => {
    expect(evaluateEmailVerificationRequest({ ...activeIdentity, disabled: true }, "contact@example.com", false)).toBe("ACCOUNT_UNAVAILABLE");
  });

  it("blocks an unauthenticated request", () => {
    expect(evaluateEmailVerificationRequest(null, "contact@example.com", false)).toBe("ACCOUNT_UNAVAILABLE");
  });

  it("does not accept an arbitrary client userId in request input", () => {
    expect(() => parseEmailVerificationRequest({ email: "contact@example.com", userId: "attacker-selected" })).toThrow();
  });

  it("does not accept an arbitrary client userId in verification input", () => {
    expect(() => parseEmailVerificationAttempt({ eventId, email: "contact@example.com", code: "123456", userId: "attacker-selected" })).toThrow();
  });

  it("accepts only an event id for cancellation", () => {
    expect(parseEmailVerificationCancellation({ eventId })).toEqual({ eventId });
    expect(() => parseEmailVerificationCancellation({ eventId, userId })).toThrow();
  });
});

describe("email verification challenge security", () => {
  it("generates an exactly six-digit code", () => {
    expect(generateNumericOtp(() => 42)).toBe("000042");
    expect(generateNumericOtp(() => 999_999)).toMatch(/^\d{6}$/);
  });

  it("stores only a context-bound hash, never the plaintext code", () => {
    const created = challenge();
    expect(created.deliveryCode).toBe("123456");
    expect(created.persisted.challengeHash).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(created.persisted.challengeHash).not.toContain(created.deliveryCode);
    expect(created.persisted).not.toHaveProperty("code");
    expect(created.persisted).not.toHaveProperty("deliveryCode");
  });

  it("sets a ten-minute expiry", () => {
    expect(challenge().persisted.expiresAt.getTime() - now.getTime()).toBe(EMAIL_VERIFICATION_TTL_MS);
  });

  it("binds the hash to the event, user, destination, purpose, and code", () => {
    const base = { eventId, userId, destinationHash, purpose: EMAIL_VERIFICATION_PURPOSE, challenge: "123456", pepper };
    const digest = hashEmailVerificationChallenge(base);
    expect(hashEmailVerificationChallenge({ ...base, eventId: "20a09a45-5816-4a17-aae8-86c22834dc81" })).not.toBe(digest);
    expect(hashEmailVerificationChallenge({ ...base, userId: "user-2" })).not.toBe(digest);
    expect(hashEmailVerificationChallenge({ ...base, destinationHash: "v1:other" })).not.toBe(digest);
    expect(hashEmailVerificationChallenge({ ...base, challenge: "654321" })).not.toBe(digest);
  });

  it("accepts the correct challenge", () => {
    expect(attempt(pendingEvent())).toEqual({ outcome: "VERIFIED", attempts: 0 });
  });

  it("rejects the wrong challenge and increments attempts", () => {
    expect(attempt(pendingEvent(), "654321")).toEqual({ outcome: "INVALID", attempts: 1 });
  });

  it("fails the event on the maximum incorrect attempt", () => {
    expect(attempt(pendingEvent("123456", { attempts: EMAIL_VERIFICATION_MAX_ATTEMPTS - 1 }), "654321")).toEqual({
      outcome: "TOO_MANY_ATTEMPTS",
      attempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
    });
  });

  it("does not revive an event that already reached maximum attempts", () => {
    expect(attempt(pendingEvent("123456", { attempts: EMAIL_VERIFICATION_MAX_ATTEMPTS }))).toEqual({
      outcome: "TOO_MANY_ATTEMPTS",
      attempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
    });
  });

  it("rejects an expired challenge", () => {
    expect(attempt(pendingEvent("123456", { expiresAt: now }))).toEqual({ outcome: "EXPIRED", attempts: 0 });
  });

  it.each(["VERIFIED", "FAILED", "CANCELLED", "EXPIRED"] as const)("rejects a %s event and prevents replay", (status) => {
    expect(attempt(pendingEvent("123456", { status }))).toEqual({ outcome: "UNAVAILABLE", attempts: 0 });
  });

  it("enforces verification event user ownership", () => {
    expect(attempt(pendingEvent("123456", { userId: "user-2" }))).toEqual({ outcome: "UNAVAILABLE", attempts: 0 });
  });

  it("enforces destination ownership", () => {
    expect(attempt(pendingEvent(), "123456", { destinationHash: "v1:other-destination" })).toEqual({ outcome: "UNAVAILABLE", attempts: 0 });
  });

  it.each(["SIGN_IN", "LINK", "RECOVERY"] as const)("does not consume a %s-purpose event", (purpose) => {
    expect(attempt(pendingEvent("123456", { purpose }))).toEqual({ outcome: "UNAVAILABLE", attempts: 0 });
  });

  it("models double-consumption protection by rejecting the post-consumption state", () => {
    const first = attempt(pendingEvent());
    const second = attempt(pendingEvent("123456", { status: "VERIFIED" }));
    expect(first.outcome).toBe("VERIFIED");
    expect(second.outcome).toBe("UNAVAILABLE");
  });

  it("rejects a previous challenge after resend cancellation", () => {
    expect(attempt(pendingEvent("111111", { status: "CANCELLED" }), "111111").outcome).toBe("UNAVAILABLE");
    expect(attempt(pendingEvent("222222"), "222222").outcome).toBe("VERIFIED");
  });
});

describe("delivery and abuse boundaries", () => {
  it("does not cancel an event after successful mocked delivery", async () => {
    const provider: VerificationEmailProvider = { name: "mock", sendVerificationCode: vi.fn().mockResolvedValue(undefined) };
    const cancel = vi.fn().mockResolvedValue(undefined);
    await expect(deliverEmailVerificationChallenge({
      provider,
      message: { to: "contact@example.com", code: "123456", expiresInMinutes: 10, idempotencyKey: eventId },
      cancelUndeliveredEvent: cancel,
    })).resolves.toBe(true);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("cancels the pending event when mocked email delivery fails", async () => {
    const provider: VerificationEmailProvider = { name: "mock", sendVerificationCode: vi.fn().mockRejectedValue(new Error("offline")) };
    const cancel = vi.fn().mockResolvedValue(undefined);
    await expect(deliverEmailVerificationChallenge({
      provider,
      message: { to: "contact@example.com", code: "123456", expiresInMinutes: 10, idempotencyKey: eventId },
      cancelUndeliveredEvent: cancel,
    })).resolves.toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("enforces a rate-limit window", () => {
    const key = `email-verification-test:${eventId}`;
    expect(consumeRateLimit(key, 2, 60_000, 1_000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000, 1_001).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000, 1_002).allowed).toBe(false);
    expect(consumeRateLimit(key, 2, 60_000, 61_001).allowed).toBe(true);
  });

  it("builds a branded email without account details or tracking pixels", () => {
    const content = verificationEmailContent({ code: "123456", expiresInMinutes: 10 });
    expect(content.subject).toMatch(/Giggle Gallery/);
    expect(content.text).toContain("123456");
    expect(content.html).toContain("10 minutes");
    expect(content.html).not.toContain("<img");
  });

  it("keeps user identity server-controlled in every email action", async () => {
    const source = await readFile(new URL("../../app/actions/email-verification.ts", import.meta.url), "utf8");
    expect(source.match(/await requireUser\(\)/g)).toHaveLength(3);
    expect(source).not.toMatch(/formData\.get\(["']userId["']\)/);
  });
});
