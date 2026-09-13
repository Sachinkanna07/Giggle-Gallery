import { handlers } from "@/auth";
import type { NextRequest } from "next/server";
import { rateLimitRequest, rateLimitResponse } from "@/lib/security/request";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  const rateLimit = rateLimitRequest(request, "auth-post", 60, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  return handlers.POST(request);
}
