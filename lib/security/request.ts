import "server-only";

import { consumeRateLimit } from "@/lib/security/rate-limit";

export { consumeRateLimit } from "@/lib/security/rate-limit";

export function requestClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimitRequest(request: Request, scope: string, limit: number, windowMs: number) {
  return consumeRateLimit(`${scope}:${requestClientKey(request)}`, limit, windowMs);
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}

export function isAllowedBrowserOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const allowed = new Set<string>();
  try { allowed.add(new URL(request.url).origin); } catch { /* invalid request URLs are rejected below */ }
  try {
    if (process.env.NEXT_PUBLIC_APP_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
  } catch { /* environment validation reports the invalid URL separately */ }
  return allowed.has(origin);
}

export function originErrorResponse(): Response {
  return Response.json({ error: "Request origin is not allowed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
