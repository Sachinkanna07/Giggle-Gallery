# Giggle Gallery

Giggle Gallery is a cinematic art marketplace built with Next.js, Auth.js, Drizzle ORM, Neon Postgres, Vercel Blob, and Razorpay. Production workflows are persisted and server-authorized; the development-only catalog fallback is never presented as production data.

## Local development

1. Install Node.js 22.13 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add development or provider test-mode credentials.
3. Run `npm run db:migrate` and, when starter data is wanted, `npm run db:seed`.
4. Start the app with `npm run dev`.

Without `DATABASE_URL`, local development can render the curated fallback catalog for visual work. Account writes, seller tools, uploads, orders, and payments remain unavailable rather than pretending to persist. Production fails closed on invalid required configuration and never falls back to demo records after a database failure.

## Required environment variables

Configure these in each deployed environment. Only `NEXT_PUBLIC_APP_URL` is safe to expose to the browser.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Neon PostgreSQL connection URL |
| `AUTH_SECRET` | Random Auth.js signing secret, at least 32 characters |
| `AUTH_URL` | Canonical HTTPS Auth.js origin with no path, query, or fragment |
| `AUTH_GOOGLE_ID` | Google OAuth web client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_APP_URL` | Canonical HTTPS application URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob server credential |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay server secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret |
| `IDENTITY_HASH_PEPPER` | Private HMAC key for verification destination hashes |
| `GST_RATE_BPS` | Optional GST rate in basis points; defaults to `0` |

Never commit credentials. `.env.example` contains names and environment guidance only.

## Staging / Preview setup

- Use isolated Neon and Blob resources, Razorpay test mode, and a distinct webhook secret.
- Add the exact preview host to Google OAuth and set matching HTTPS `AUTH_URL` and `NEXT_PUBLIC_APP_URL` origins.
- Apply migrations to staging, then test sign-in, seller upload, signed checkout verification, webhook replay, and the owned-order confirmation page.

## Google OAuth

Create a Google OAuth web client and add these authorized redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Preview: `https://PREVIEW_HOST/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, a unique `AUTH_SECRET`, and the canonical root `AUTH_URL` in the matching environment. Roles and account status are loaded server-side from Postgres. Full email and phone identity flows remain deferred to later Phase 3 subphases.

## Identity roadmap

- Google login is the currently supported sign-in method. Auth.js provider identities are persisted in the `accounts` table, and automatic email-based account linking remains explicitly disabled.
- Phase 3A adds account status, normalized verified-contact uniqueness, hashed verification-event storage, server-only linking policy, and truthful account status UI.
- Verified email delivery and confirmation are planned for Phase 3C.
- Phone OTP delivery and verification are planned for Phase 3D.
- Verification events store keyed destination hashes and may later store challenge hashes; raw OTPs and raw custom verification tokens must never be persisted.
- `IDENTITY_HASH_PEPPER` is server-only. Use a unique value of at least 32 characters in each environment and never commit it.

## Database

Provision Neon through the Vercel Marketplace and use its pooled `DATABASE_URL`. The pooled driver supports the transactions used by seller approval, artwork creation, checkout creation, and payment finalization.

Generate a migration after schema changes with `npm run db:generate`. Apply migrations with `npm run db:migrate`. Seed the starter catalog with `npm run db:seed`.

Payment attempts and webhook events have separate tables. Checkout math uses integer paise in application code, while existing money columns remain fixed-precision SQL numeric values. Migrating every persisted money column to integer minor units is a later, deliberate data migration.

## Artwork storage

Approved sellers upload JPG, PNG, or WebP images up to 12 MB through a short-lived, server-authorized Blob token. Each upload is recorded against the seller and an expiring intent. Artwork creation accepts only the exact completed Blob URL associated with that seller; arbitrary external image URLs are rejected.

## Razorpay

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Configure the production webhook URL as:

`https://YOUR_DOMAIN/api/webhooks/razorpay`

Subscribe to `payment.captured` and `payment.failed`. The handler verifies the exact raw body and deduplicates provider events before processing. Browser callbacks require an authenticated order owner, same-origin request, and valid Razorpay signature. A redirect alone never marks an order paid.

Payment finalization updates payment, attempt, order, inventory, payouts, cart, and database notifications in one database transaction. If paid inventory is unavailable, the service requests a Razorpay refund and records the refunded state. External refunds cannot be atomically committed with PostgreSQL, so production operations still need provider/database reconciliation and alerting.

## Security and operational notes

- Production responses include CSP, HSTS, frame protection, MIME sniffing protection, a strict referrer policy, and a restricted permissions policy.
- Auth POSTs, upload authorization, payment verification, webhooks, and authenticated Server Actions have initial rate limits.
- The limiter is per-process and best-effort. Replace it with a shared durable limiter before horizontal scale or adversarial traffic.
- The web manifest is the PWA foundation. Offline caching, install UX, and a full service-worker strategy are later-phase work.
- Artwork moderation, email/SMS delivery, receipts/certificates, shipping/refund operations, and payout execution remain later phases.

## Deployment checklist

1. Review and apply the generated migration to a backed-up staging database.
2. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
3. Configure every required variable in Vercel Production with production-scoped values.
4. Confirm the production Google callback and Razorpay webhook URL and signing secret.
5. Deploy to Preview, complete the staging smoke tests, then promote the verified build.
6. Verify headers, database connectivity, Blob callbacks, webhook delivery/replay, and an owned test-mode checkout.
7. Enable monitoring for application errors, webhook failures, refund reconciliation, and database health.

## Rollback

Keep the previous Vercel deployment available for traffic rollback. Prefer additive database migrations and prepare a separately reviewed down or forward-fix plan before any destructive migration. Rolling back application code does not roll back Neon data or external Razorpay operations.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=low
```

GitHub Actions runs install, lint, typecheck, unit tests, and build for pushes and pull requests using placeholders only; it never charges real money.
