import "server-only";

import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { accounts, profiles, users, verificationEvents } from "@/db/schema";
import { requireServerEnv } from "@/lib/env";
import {
  evaluateProviderLink,
  hashDestination,
  normalizeEmail,
  normalizePhoneE164,
  type VerificationDestinationType,
} from "@/lib/identity/rules";

export { evaluateProviderLink, hashDestination, normalizeEmail, normalizePhoneE164 } from "@/lib/identity/rules";

export class IdentityConflictError extends Error {
  constructor(readonly code: "VERIFIED_EMAIL_IN_USE" | "VERIFIED_PHONE_IN_USE" | "UNSAFE_PROVIDER_LINK") {
    super(code);
    this.name = "IdentityConflictError";
  }
}

export async function getIdentityOverview(userId: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [[identity], providerRows] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      displayName: profiles.displayName,
      email: users.email,
      emailVerified: users.emailVerified,
      contactEmail: users.contactEmail,
      contactEmailVerifiedAt: users.contactEmailVerifiedAt,
      phoneE164: users.phoneE164,
      phoneVerifiedAt: users.phoneVerifiedAt,
      image: users.image,
      role: users.role,
      accountStatus: users.accountStatus,
      disabled: users.disabled,
    }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, userId)).limit(1),
    db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, userId)),
  ]);
  if (!identity) return null;
  return { ...identity, providers: [...new Set(providerRows.map((row) => row.provider))] };
}

export async function assertNoVerifiedEmailConflict(userId: string, candidate: string): Promise<string> {
  const normalized = normalizeEmail(candidate);
  const [conflict] = await getDb().select({ id: users.id }).from(users).where(and(ne(users.id, userId), isNotNull(users.emailVerified), sql`lower(${users.email}) = ${normalized}`)).limit(1);
  if (conflict) throw new IdentityConflictError("VERIFIED_EMAIL_IN_USE");
  return normalized;
}

export async function assertNoVerifiedPhoneConflict(userId: string, candidate: string): Promise<string> {
  const normalized = normalizePhoneE164(candidate);
  const [conflict] = await getDb().select({ id: users.id }).from(users).where(and(ne(users.id, userId), isNotNull(users.phoneVerifiedAt), eq(users.phoneE164, normalized))).limit(1);
  if (conflict) throw new IdentityConflictError("VERIFIED_PHONE_IN_USE");
  return normalized;
}

type SafeProviderLinkInput = {
  targetUserId: string;
  provider: string;
  providerAccountId: string;
  accountType: "oauth" | "oidc";
  providerEmail?: string | null;
  providerEmailVerified: boolean;
  mode: "AUTOMATIC" | "EXPLICIT";
  authenticatedTargetUser: boolean;
  recentAuthentication: boolean;
};

export async function linkProviderAccountSafely(input: SafeProviderLinkInput) {
  const parsed = z.object({ provider: z.string().trim().min(1).max(100), providerAccountId: z.string().trim().min(1).max(300) }).parse(input);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [target] = await tx.select({ id: users.id, email: users.email, emailVerified: users.emailVerified }).from(users).where(eq(users.id, input.targetUserId)).limit(1).for("update");
    if (!target) throw new IdentityConflictError("UNSAFE_PROVIDER_LINK");
    const [existing] = await tx.select({ userId: accounts.userId }).from(accounts).where(and(eq(accounts.provider, parsed.provider), eq(accounts.providerAccountId, parsed.providerAccountId))).limit(1);
    const decision = evaluateProviderLink({
      targetUserId: target.id,
      targetEmail: target.email,
      targetEmailVerified: Boolean(target.emailVerified),
      existingAccountUserId: existing?.userId,
      providerEmail: input.providerEmail,
      providerEmailVerified: input.providerEmailVerified,
      mode: input.mode,
      authenticatedTargetUser: input.authenticatedTargetUser,
      recentAuthentication: input.recentAuthentication,
    });
    if (!decision.allowed) throw new IdentityConflictError("UNSAFE_PROVIDER_LINK");
    if (decision.reason === "ALREADY_LINKED") return decision;
    if (input.providerEmailVerified && input.providerEmail) {
      const normalizedProviderEmail = normalizeEmail(input.providerEmail);
      const [conflict] = await tx.select({ id: users.id }).from(users).where(and(ne(users.id, target.id), isNotNull(users.emailVerified), sql`lower(${users.email}) = ${normalizedProviderEmail}`)).limit(1);
      if (conflict) throw new IdentityConflictError("VERIFIED_EMAIL_IN_USE");
    }

    const [created] = await tx.insert(accounts).values({ userId: target.id, type: input.accountType, provider: parsed.provider, providerAccountId: parsed.providerAccountId }).onConflictDoNothing().returning({ userId: accounts.userId });
    if (!created) throw new IdentityConflictError("UNSAFE_PROVIDER_LINK");
    return decision;
  });
}

type VerificationEventInput = {
  userId?: string | null;
  type: VerificationDestinationType;
  destination: string;
  provider: string;
  purpose: "SIGN_IN" | "LINK" | "CHANGE_CONTACT" | "RECOVERY";
  expiresAt: Date;
};

export async function createVerificationEventFoundation(input: VerificationEventInput) {
  if (input.expiresAt <= new Date()) throw new Error("Verification expiry must be in the future.");
  if (input.userId && input.type === "EMAIL") await assertNoVerifiedEmailConflict(input.userId, input.destination);
  if (input.userId && input.type === "PHONE") await assertNoVerifiedPhoneConflict(input.userId, input.destination);
  const destinationHash = hashDestination(input.type, input.destination, requireServerEnv("IDENTITY_HASH_PEPPER"));
  const [created] = await getDb().insert(verificationEvents).values({
    userId: input.userId ?? null,
    type: input.type,
    destinationHash,
    provider: z.string().trim().min(1).max(100).parse(input.provider),
    purpose: input.purpose,
    expiresAt: input.expiresAt,
  }).returning({ id: verificationEvents.id });
  return created;
}
