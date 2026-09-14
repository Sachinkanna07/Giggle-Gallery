import "server-only";

import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/security/request";

export async function enforceServerActionRateLimit(scope: string, actorId: string, limit = 120, windowMs = 60_000): Promise<void> {
  const requestHeaders = await headers();
  const client = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const result = consumeRateLimit(`action:${scope}:${actorId}:${client}`, limit, windowMs);
  if (!result.allowed) throw new Error("RATE_LIMITED");
}

type RateLimitDimension = {
  name: "user" | "destination" | "ip";
  key: string;
  limit: number;
  windowMs: number;
};

export async function enforceServerActionRateLimitDimensions(scope: string, dimensions: RateLimitDimension[]): Promise<void> {
  const requestHeaders = await headers();
  const client = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  for (const dimension of dimensions) {
    const key = dimension.name === "ip" ? client : dimension.key;
    const result = consumeRateLimit(`action:${scope}:${dimension.name}:${key}`, dimension.limit, dimension.windowMs);
    if (!result.allowed) throw new Error("RATE_LIMITED");
  }
}
