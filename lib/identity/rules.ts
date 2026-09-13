import { createHmac } from "node:crypto";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(320);
const e164Schema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Phone number must already include a valid international country code.");

export type VerificationDestinationType = "EMAIL" | "PHONE";

export function normalizeEmail(value: string): string {
  return emailSchema.parse(value.normalize("NFKC")).toLowerCase();
}

export function normalizePhoneE164(value: string): string {
  const compact = value.normalize("NFKC").trim().replace(/[\s().-]/g, "");
  return e164Schema.parse(compact);
}

export function hashDestination(type: VerificationDestinationType, rawDestination: string, pepper: string): string {
  if (pepper.length < 32) throw new Error("Identity hash pepper must contain at least 32 characters.");
  const normalized = type === "EMAIL" ? normalizeEmail(rawDestination) : normalizePhoneE164(rawDestination);
  return `v1:${createHmac("sha256", pepper).update(`${type}:${normalized}`).digest("hex")}`;
}

type EmailIdentity = { id: string; email: string | null; emailVerified: Date | null };
type PhoneIdentity = { id: string; phoneE164: string | null; phoneVerifiedAt: Date | null };

export function hasVerifiedEmailConflict(records: EmailIdentity[], currentUserId: string, candidate: string): boolean {
  const normalized = normalizeEmail(candidate);
  return records.some((record) => record.id !== currentUserId && Boolean(record.emailVerified) && record.email !== null && normalizeEmail(record.email) === normalized);
}

export function hasVerifiedPhoneConflict(records: PhoneIdentity[], currentUserId: string, candidate: string): boolean {
  const normalized = normalizePhoneE164(candidate);
  return records.some((record) => record.id !== currentUserId && Boolean(record.phoneVerifiedAt) && record.phoneE164 !== null && normalizePhoneE164(record.phoneE164) === normalized);
}

export type ProviderLinkDecision =
  | { allowed: true; reason: "ALREADY_LINKED" | "EXPLICIT_RECENT_AUTH" | "VERIFIED_EMAIL_MATCH" }
  | { allowed: false; reason: "PROVIDER_ACCOUNT_IN_USE" | "RECENT_AUTH_REQUIRED" | "VERIFIED_EMAIL_REQUIRED" | "EMAIL_MISMATCH" };

type ProviderLinkContext = {
  targetUserId: string;
  targetEmail: string | null;
  targetEmailVerified: boolean;
  existingAccountUserId?: string | null;
  providerEmail?: string | null;
  providerEmailVerified: boolean;
  mode: "AUTOMATIC" | "EXPLICIT";
  authenticatedTargetUser: boolean;
  recentAuthentication: boolean;
};

export function evaluateProviderLink(context: ProviderLinkContext): ProviderLinkDecision {
  if (context.existingAccountUserId === context.targetUserId) return { allowed: true, reason: "ALREADY_LINKED" };
  if (context.existingAccountUserId) return { allowed: false, reason: "PROVIDER_ACCOUNT_IN_USE" };

  if (context.mode === "EXPLICIT") {
    return context.authenticatedTargetUser && context.recentAuthentication
      ? { allowed: true, reason: "EXPLICIT_RECENT_AUTH" }
      : { allowed: false, reason: "RECENT_AUTH_REQUIRED" };
  }

  if (!context.targetEmailVerified || !context.providerEmailVerified || !context.targetEmail || !context.providerEmail) {
    return { allowed: false, reason: "VERIFIED_EMAIL_REQUIRED" };
  }
  return normalizeEmail(context.targetEmail) === normalizeEmail(context.providerEmail)
    ? { allowed: true, reason: "VERIFIED_EMAIL_MATCH" }
    : { allowed: false, reason: "EMAIL_MISMATCH" };
}
