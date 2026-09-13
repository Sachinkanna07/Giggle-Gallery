import "server-only";

import { and, eq, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { webhookEvents } from "@/db/schema";

type WebhookClaim = {
  provider: string;
  providerEventId: string;
  signatureHash: string;
  bodyHash: string;
  eventType: string;
};

const STALE_PROCESSING_MS = 5 * 60 * 1_000;

export type WebhookClaimResult = "CLAIMED" | "PROCESSED" | "IN_PROGRESS";

export async function claimWebhookEvent(input: WebhookClaim): Promise<WebhookClaimResult> {
  const db = getDb();
  const [created] = await db
    .insert(webhookEvents)
    .values(input)
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.providerEventId] })
    .returning({ id: webhookEvents.id });

  if (created) return "CLAIMED";

  const now = new Date();
  const [reclaimed] = await db
    .update(webhookEvents)
    .set({
      status: "PROCESSING",
      attemptCount: sql`${webhookEvents.attemptCount} + 1`,
      processingStartedAt: now,
      failureReason: null,
    })
    .where(and(
      eq(webhookEvents.provider, input.provider),
      eq(webhookEvents.providerEventId, input.providerEventId),
      or(
        eq(webhookEvents.status, "FAILED"),
        and(eq(webhookEvents.status, "PROCESSING"), lt(webhookEvents.processingStartedAt, new Date(now.getTime() - STALE_PROCESSING_MS))),
      ),
    ))
    .returning({ id: webhookEvents.id });

  if (reclaimed) return "CLAIMED";

  const [existing] = await db.select({ status: webhookEvents.status }).from(webhookEvents).where(and(eq(webhookEvents.provider, input.provider), eq(webhookEvents.providerEventId, input.providerEventId))).limit(1);
  return existing?.status === "PROCESSED" ? "PROCESSED" : "IN_PROGRESS";
}

export async function markWebhookEventProcessed(provider: string, providerEventId: string): Promise<void> {
  await getDb().update(webhookEvents).set({ status: "PROCESSED", processedAt: new Date(), failureReason: null }).where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.providerEventId, providerEventId)));
}

export async function markWebhookEventFailed(provider: string, providerEventId: string, error: unknown): Promise<void> {
  const reason = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown webhook processing failure";
  await getDb().update(webhookEvents).set({ status: "FAILED", failureReason: reason }).where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.providerEventId, providerEventId)));
}
