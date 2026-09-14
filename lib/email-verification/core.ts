import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { normalizeEmail } from "../identity/rules";

export const EMAIL_VERIFICATION_PURPOSE = "CHANGE_CONTACT" as const;
export const EMAIL_VERIFICATION_TTL_MS = 10 * 60_000;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60_000;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

const emailInputSchema = z.string().trim().email().max(320);
const eventIdSchema = z.string().uuid();
const otpSchema = z.string().trim().regex(/^\d{6}$/);

const requestInputSchema = z.object({ email: emailInputSchema }).strict();
const verifyInputSchema = z.object({ eventId: eventIdSchema, email: emailInputSchema, code: otpSchema }).strict();
const cancelInputSchema = z.object({ eventId: eventIdSchema }).strict();

export type EmailVerificationIdentity = {
  id: string;
  email: string;
  emailVerified: Date | null;
  contactEmail: string | null;
  contactEmailVerifiedAt: Date | null;
  accountStatus: "ACTIVE" | "SUSPENDED" | "DISABLED" | "PENDING_DELETION";
  disabled: boolean;
};

export type EmailVerificationEventRecord = {
  id: string;
  userId: string | null;
  type: "EMAIL" | "PHONE";
  destinationHash: string;
  challengeHash: string | null;
  status: "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED" | "CANCELLED";
  attempts: number;
  expiresAt: Date;
  purpose: "SIGN_IN" | "LINK" | "CHANGE_CONTACT" | "RECOVERY";
};

export function parseEmailVerificationRequest(input: unknown) {
  const parsed = requestInputSchema.parse(input);
  return { email: normalizeEmail(parsed.email) };
}

export function parseEmailVerificationAttempt(input: unknown) {
  const parsed = verifyInputSchema.parse(input);
  return { ...parsed, email: normalizeEmail(parsed.email) };
}

export function parseEmailVerificationCancellation(input: unknown) {
  return cancelInputSchema.parse(input);
}

export function generateNumericOtp(randomInteger: (min: number, max: number) => number = randomInt): string {
  return randomInteger(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailVerificationChallenge(input: {
  eventId: string;
  userId: string;
  destinationHash: string;
  purpose: typeof EMAIL_VERIFICATION_PURPOSE;
  challenge: string;
  pepper: string;
}): string {
  if (input.pepper.length < 32) throw new Error("Identity hash pepper must contain at least 32 characters.");
  const context = ["EMAIL_OTP_V1", input.eventId, input.userId, input.destinationHash, input.purpose, input.challenge].join("\u0000");
  return `v1:${createHmac("sha256", input.pepper).update(context).digest("hex")}`;
}

function safelyEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createEmailVerificationChallenge(input: {
  eventId: string;
  userId: string;
  destinationHash: string;
  pepper: string;
  now?: Date;
  randomInteger?: (min: number, max: number) => number;
}) {
  const code = generateNumericOtp(input.randomInteger);
  const now = input.now ?? new Date();
  return {
    deliveryCode: code,
    persisted: {
      id: input.eventId,
      userId: input.userId,
      type: "EMAIL" as const,
      destinationHash: input.destinationHash,
      challengeHash: hashEmailVerificationChallenge({
        eventId: input.eventId,
        userId: input.userId,
        destinationHash: input.destinationHash,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        challenge: code,
        pepper: input.pepper,
      }),
      status: "PENDING" as const,
      attempts: 0,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
    },
  };
}

export type RequestDecision = "READY" | "ALREADY_VERIFIED" | "ACCOUNT_UNAVAILABLE" | "EMAIL_UNAVAILABLE";

export function evaluateEmailVerificationRequest(
  identity: EmailVerificationIdentity | null,
  normalizedTarget: string,
  conflict: boolean,
): RequestDecision {
  if (!identity || identity.disabled || identity.accountStatus !== "ACTIVE") return "ACCOUNT_UNAVAILABLE";
  if (conflict) return "EMAIL_UNAVAILABLE";
  if (normalizeEmail(identity.email) === normalizedTarget && identity.emailVerified) return "ALREADY_VERIFIED";
  if (identity.contactEmail && normalizeEmail(identity.contactEmail) === normalizedTarget && identity.contactEmailVerifiedAt) {
    return "ALREADY_VERIFIED";
  }
  return "READY";
}

export type AttemptDecision =
  | { outcome: "VERIFIED"; attempts: number }
  | { outcome: "INVALID"; attempts: number }
  | { outcome: "TOO_MANY_ATTEMPTS"; attempts: number }
  | { outcome: "EXPIRED"; attempts: number }
  | { outcome: "UNAVAILABLE"; attempts: number };

export function evaluateEmailVerificationAttempt(input: {
  event: EmailVerificationEventRecord | null;
  authenticatedUserId: string;
  destinationHash: string;
  challenge: string;
  pepper: string;
  now?: Date;
}): AttemptDecision {
  const { event } = input;
  if (
    !event
    || event.userId !== input.authenticatedUserId
    || event.type !== "EMAIL"
    || event.purpose !== EMAIL_VERIFICATION_PURPOSE
    || !safelyEqual(event.destinationHash, input.destinationHash)
    || event.status !== "PENDING"
    || !event.challengeHash
  ) {
    return { outcome: "UNAVAILABLE", attempts: event?.attempts ?? 0 };
  }
  if (event.expiresAt.getTime() <= (input.now ?? new Date()).getTime()) {
    return { outcome: "EXPIRED", attempts: event.attempts };
  }
  if (event.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    return { outcome: "TOO_MANY_ATTEMPTS", attempts: event.attempts };
  }

  const candidateHash = hashEmailVerificationChallenge({
    eventId: event.id,
    userId: input.authenticatedUserId,
    destinationHash: input.destinationHash,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    challenge: input.challenge,
    pepper: input.pepper,
  });
  if (safelyEqual(event.challengeHash, candidateHash)) return { outcome: "VERIFIED", attempts: event.attempts };

  const attempts = event.attempts + 1;
  return attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS
    ? { outcome: "TOO_MANY_ATTEMPTS", attempts }
    : { outcome: "INVALID", attempts };
}

export type VerificationEmailDelivery = {
  to: string;
  code: string;
  expiresInMinutes: number;
  idempotencyKey: string;
};

export interface VerificationEmailProvider {
  readonly name: string;
  sendVerificationCode(message: VerificationEmailDelivery): Promise<void>;
}

export async function deliverEmailVerificationChallenge(input: {
  provider: VerificationEmailProvider;
  message: VerificationEmailDelivery;
  cancelUndeliveredEvent: () => Promise<void>;
}): Promise<boolean> {
  try {
    await input.provider.sendVerificationCode(input.message);
    return true;
  } catch {
    await input.cancelUndeliveredEvent();
    return false;
  }
}
