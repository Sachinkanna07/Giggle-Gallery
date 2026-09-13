import { createHash } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getWebhookEventIdentity(rawBody: string, providerEventId?: string | null) {
  return {
    providerEventId: providerEventId?.trim() || `body_${sha256(rawBody)}`,
    bodyHash: sha256(rawBody),
  };
}
