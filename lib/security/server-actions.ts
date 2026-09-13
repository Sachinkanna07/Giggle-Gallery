import "server-only";

import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/security/request";

export async function enforceServerActionRateLimit(scope: string, actorId: string, limit = 120, windowMs = 60_000): Promise<void> {
  const requestHeaders = await headers();
  const client = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const result = consumeRateLimit(`action:${scope}:${actorId}:${client}`, limit, windowMs);
  if (!result.allowed) throw new Error("RATE_LIMITED");
}
