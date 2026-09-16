import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNotNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users, verificationEvents } from "@/db/schema";
import {
  createEmailVerificationChallenge,
  deliverEmailVerificationChallenge,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSE,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  evaluateEmailVerificationAttempt,
  evaluateEmailVerificationRequest,
  type VerificationEmailProvider,
} from "@/lib/email-verification/core";
import { requireServerEnv } from "@/lib/env";
import { hashDestination, normalizeEmail } from "@/lib/identity/rules";

type RequestResult =
  | { status: "SENT"; eventId: string; email: string }
  | { status: "ALREADY_VERIFIED"; email: string }
  | { status: "COOLDOWN"; email: string }
  | { status: "EMAIL_UNAVAILABLE" | "ACCOUNT_UNAVAILABLE" | "DELIVERY_UNAVAILABLE" };

type VerifyResult =
  | { status: "VERIFIED"; email: string }
  | { status: "INVALID" | "TOO_MANY_ATTEMPTS" | "EXPIRED" | "UNAVAILABLE" | "EMAIL_UNAVAILABLE" | "ACCOUNT_UNAVAILABLE" };

function activeIdentity(identity: { accountStatus: string; disabled: boolean } | undefined): boolean {
  return Boolean(identity && !identity.disabled && identity.accountStatus === "ACTIVE");
}

function emailConflictWhere(userId: string, normalizedEmail: string) {
  return and(
    ne(users.id, userId),
    or(
      sql`lower(${users.email}) = ${normalizedEmail}`,
      and(isNotNull(users.contactEmailVerifiedAt), sql`lower(${users.contactEmail}) = ${normalizedEmail}`),
    ),
  );
}

async function cancelUndeliveredEvent(eventId: string, userId: string): Promise<void> {
  await getDb().update(verificationEvents).set({ status: "CANCELLED", consumedAt: new Date() }).where(and(
    eq(verificationEvents.id, eventId),
    eq(verificationEvents.userId, userId),
    eq(verificationEvents.status, "PENDING"),
  ));
}

export async function requestEmailVerification(input: {
  userId: string;
  email: string;
  provider: VerificationEmailProvider;
  now?: Date;
}): Promise<RequestResult> {
  const now = input.now ?? new Date();
  const normalizedEmail = normalizeEmail(input.email);
  const pepper = requireServerEnv("IDENTITY_HASH_PEPPER");
  const destinationHash = hashDestination("EMAIL", normalizedEmail, pepper);
  const eventId = randomUUID();
  const db = getDb();

  const prepared = await db.transaction(async (tx) => {
    const [identity] = await tx.select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      contactEmail: users.contactEmail,
      contactEmailVerifiedAt: users.contactEmailVerifiedAt,
      accountStatus: users.accountStatus,
      disabled: users.disabled,
    }).from(users).where(eq(users.id, input.userId)).limit(1).for("update");

    if (!activeIdentity(identity)) return { status: "ACCOUNT_UNAVAILABLE" as const };
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${normalizedEmail}, 0))`);
    const [conflict] = await tx.select({ id: users.id }).from(users).where(emailConflictWhere(input.userId, normalizedEmail)).limit(1);
    const decision = evaluateEmailVerificationRequest(identity, normalizedEmail, Boolean(conflict));
    if (decision !== "READY") return { status: decision, email: normalizedEmail } as const;

    const cooldownStart = new Date(now.getTime() - EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);
    const [recent] = await tx.select({ id: verificationEvents.id }).from(verificationEvents).where(and(
      eq(verificationEvents.userId, input.userId),
      eq(verificationEvents.type, "EMAIL"),
      eq(verificationEvents.destinationHash, destinationHash),
      eq(verificationEvents.purpose, EMAIL_VERIFICATION_PURPOSE),
      eq(verificationEvents.status, "PENDING"),
      gt(verificationEvents.createdAt, cooldownStart),
    )).orderBy(desc(verificationEvents.createdAt)).limit(1);
    if (recent) return { status: "COOLDOWN" as const, email: normalizedEmail };

    await tx.update(verificationEvents).set({ status: "CANCELLED", consumedAt: now }).where(and(
      eq(verificationEvents.userId, input.userId),
      eq(verificationEvents.type, "EMAIL"),
      eq(verificationEvents.purpose, EMAIL_VERIFICATION_PURPOSE),
      eq(verificationEvents.status, "PENDING"),
    ));
    const challenge = createEmailVerificationChallenge({ eventId, userId: input.userId, destinationHash, pepper, now });
    await tx.insert(verificationEvents).values({
      ...challenge.persisted,
      provider: input.provider.name,
      createdAt: now,
    });
    return { status: "SENT" as const, eventId, email: normalizedEmail, deliveryCode: challenge.deliveryCode };
  });

  if (prepared.status !== "SENT") return prepared;
  const delivered = await deliverEmailVerificationChallenge({
    provider: input.provider,
    message: {
      to: normalizedEmail,
      code: prepared.deliveryCode,
      expiresInMinutes: 10,
      idempotencyKey: `email-verification-${eventId}`,
    },
    cancelUndeliveredEvent: () => cancelUndeliveredEvent(eventId, input.userId),
  });
  return delivered
    ? { status: "SENT", eventId: prepared.eventId, email: prepared.email }
    : { status: "DELIVERY_UNAVAILABLE" };
}

export async function verifyEmailChallenge(input: {
  userId: string;
  eventId: string;
  email: string;
  code: string;
  now?: Date;
}): Promise<VerifyResult> {
  const now = input.now ?? new Date();
  const normalizedEmail = normalizeEmail(input.email);
  const pepper = requireServerEnv("IDENTITY_HASH_PEPPER");
  const destinationHash = hashDestination("EMAIL", normalizedEmail, pepper);

  return getDb().transaction(async (tx) => {
    const [identity] = await tx.select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      contactEmail: users.contactEmail,
      contactEmailVerifiedAt: users.contactEmailVerifiedAt,
      accountStatus: users.accountStatus,
      disabled: users.disabled,
    }).from(users).where(eq(users.id, input.userId)).limit(1).for("update");
    if (!activeIdentity(identity)) return { status: "ACCOUNT_UNAVAILABLE" };

    const [event] = await tx.select().from(verificationEvents).where(eq(verificationEvents.id, input.eventId)).limit(1).for("update");
    const decision = evaluateEmailVerificationAttempt({
      event: event ?? null,
      authenticatedUserId: input.userId,
      destinationHash,
      challenge: input.code,
      pepper,
      now,
    });

    if (decision.outcome === "EXPIRED") {
      await tx.update(verificationEvents).set({ status: "EXPIRED", consumedAt: now }).where(and(
        eq(verificationEvents.id, input.eventId),
        eq(verificationEvents.status, "PENDING"),
      ));
      return { status: "EXPIRED" };
    }
    if (decision.outcome === "INVALID") {
      await tx.update(verificationEvents).set({ attempts: decision.attempts }).where(and(
        eq(verificationEvents.id, input.eventId),
        eq(verificationEvents.status, "PENDING"),
      ));
      return { status: "INVALID" };
    }
    if (decision.outcome === "TOO_MANY_ATTEMPTS") {
      await tx.update(verificationEvents).set({ attempts: decision.attempts, status: "FAILED", consumedAt: now }).where(and(
        eq(verificationEvents.id, input.eventId),
        eq(verificationEvents.status, "PENDING"),
      ));
      return { status: "TOO_MANY_ATTEMPTS" };
    }
    if (decision.outcome === "UNAVAILABLE") return { status: "UNAVAILABLE" };

    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${normalizedEmail}, 0))`);
    const [conflict] = await tx.select({ id: users.id }).from(users).where(emailConflictWhere(input.userId, normalizedEmail)).limit(1);
    if (conflict) {
      await tx.update(verificationEvents).set({ status: "FAILED", consumedAt: now }).where(and(
        eq(verificationEvents.id, input.eventId),
        eq(verificationEvents.status, "PENDING"),
      ));
      return { status: "EMAIL_UNAVAILABLE" };
    }

    const [consumed] = await tx.update(verificationEvents).set({ status: "VERIFIED", consumedAt: now }).where(and(
      eq(verificationEvents.id, input.eventId),
      eq(verificationEvents.userId, input.userId),
      eq(verificationEvents.status, "PENDING"),
      eq(verificationEvents.attempts, decision.attempts),
    )).returning({ id: verificationEvents.id });
    if (!consumed) return { status: "UNAVAILABLE" };

    if (normalizeEmail(identity.email) === normalizedEmail) {
      await tx.update(users).set({ emailVerified: now, updatedAt: now }).where(eq(users.id, input.userId));
    } else {
      await tx.update(users).set({ contactEmail: normalizedEmail, contactEmailVerifiedAt: now, updatedAt: now }).where(eq(users.id, input.userId));
    }
    await tx.update(verificationEvents).set({ status: "CANCELLED", consumedAt: now }).where(and(
      eq(verificationEvents.userId, input.userId),
      eq(verificationEvents.type, "EMAIL"),
      eq(verificationEvents.purpose, EMAIL_VERIFICATION_PURPOSE),
      eq(verificationEvents.status, "PENDING"),
      ne(verificationEvents.id, input.eventId),
    ));
    return { status: "VERIFIED", email: normalizedEmail };
  });
}

export async function cancelEmailChallenge(userId: string, eventId: string, now = new Date()): Promise<boolean> {
  const [cancelled] = await getDb().update(verificationEvents).set({ status: "CANCELLED", consumedAt: now }).where(and(
    eq(verificationEvents.id, eventId),
    eq(verificationEvents.userId, userId),
    eq(verificationEvents.type, "EMAIL"),
    eq(verificationEvents.purpose, EMAIL_VERIFICATION_PURPOSE),
    eq(verificationEvents.status, "PENDING"),
  )).returning({ id: verificationEvents.id });
  return Boolean(cancelled);
}

export async function removeContactEmail(userId: string, now = new Date()): Promise<{ status: "REMOVED" | "ACCOUNT_UNAVAILABLE" }> {
  return getDb().transaction(async (tx) => {
    // Use the same lock as request/verify so an old challenge cannot restore the address.
    const [identity] = await tx.select({
      accountStatus: users.accountStatus,
      disabled: users.disabled,
    }).from(users).where(eq(users.id, userId)).limit(1).for("update");
    if (!activeIdentity(identity)) return { status: "ACCOUNT_UNAVAILABLE" };

    await tx.update(users).set({
      contactEmail: null,
      contactEmailVerifiedAt: null,
      updatedAt: now,
    }).where(eq(users.id, userId));
    await tx.update(verificationEvents).set({ status: "CANCELLED", consumedAt: now }).where(and(
      eq(verificationEvents.userId, userId),
      eq(verificationEvents.type, "EMAIL"),
      eq(verificationEvents.purpose, EMAIL_VERIFICATION_PURPOSE),
      eq(verificationEvents.status, "PENDING"),
    ));
    return { status: "REMOVED" };
  });
}

export { EMAIL_VERIFICATION_MAX_ATTEMPTS };
