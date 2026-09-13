import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  pruneExpiredBuckets(now);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
  };
}

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
