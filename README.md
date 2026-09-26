# Giggle Gallery

Giggle Gallery is a cinematic art marketplace built with Next.js, Auth.js, Drizzle ORM, Neon Postgres, Vercel Blob, and Razorpay. Production workflows are persisted and server-authorized; the development-only catalog fallback is never presented as production data.

## Marketplace features

- Published-only catalog with title/artist search, medium, format, color, availability, year, and price filters; filter state is shareable by URL.
- Public artwork and artist pages with metadata, responsive images, safe public profile fields, and published work counts.
- Authenticated favorites, private collections, persistent cart, server-priced checkout, and buyer-owned order history.
- Seller application, guarded artwork upload, pending review, inventory, paid-only revenue, seller-owned paid orders, and forward-only fulfillment updates.
- Admin seller/artwork moderation plus read-only order, payment, and fulfillment oversight. Admin tools cannot mark an unpaid order paid.
- Razorpay signature/webhook verification, duplicate-event protection, transactional stock updates, payout records, and inventory-conflict refunds.
- Feature-flagged, Razorpay-test-key-only single-edition auctions: seller drafts, admin scheduling, inventory reservation, locked bids, winner checkout, expiry, and visible-tab live polling.
- Persisted artist following, real follower/favorite/bid/view counts, buyer auction participation, and in-app owner-scoped notifications.

## Roles

- **Buyer:** save artwork, manage private collections and cart, check out, and view only their own orders.
- **Seller:** all buyer capabilities plus submit artwork, view moderation status, see only their paid order items and fulfillment data, and advance valid fulfillment steps.
- **Admin:** review sellers and artwork, unpublish safely, and inspect marketplace/order status. Payment truth remains provider-verified.

## Architecture

Next.js App Router renders the public and authenticated experiences. Auth.js establishes identity while server actions and route handlers re-check active account and role state. Drizzle accesses Neon PostgreSQL for marketplace state. Vercel Blob client uploads use short-lived seller-owned intents. Razorpay creates provider orders and reports signed browser/webhook events; one transactional finalizer owns payment, inventory, payout, cart, and notification mutations. Resend is used for separately verified contact-email delivery.

Auctions share the payment finalizer but cannot use its fixed-price branch. Admin scheduling locks the artwork and blocks pending fixed-price orders; fixed-price checkout locks the same artwork and requires `AVAILABLE`. Winning bids and payment deadlines are persisted server-side. A winner order can consume `RESERVED` inventory only after the finalizer verifies the exact auction, highest bid, winner, order/payment, deadline, and stock relationship. No automatic runner-up or reserve-price rule exists. Closing and expiry are idempotent via lazy reads/actions and, when securely configured, a protected daily Cron on Vercel Hobby. Public auction pages poll while visible; the browser clock never decides bid acceptance.

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
| `EMAIL_PROVIDER` | Transactional email adapter; Phase 3C supports `resend` |
| `EMAIL_FROM` | Verified sender, for example `Giggle Gallery <verify@YOUR_DOMAIN>` |
| `RESEND_API_KEY` | Server-only Resend API key |
| `GST_RATE_BPS` | Optional GST rate in basis points; defaults to `0` |
| `AUCTIONS_ENABLED` | Set `true` only after auction release gates; default off |
| `AUCTIONS_TEST_MODE` | Must be `true` with a `rzp_test_` Razorpay key to enable auctions |
| `CRON_SECRET` | Server-only bearer secret for protected auction settlement Cron |

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

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, a unique `AUTH_SECRET`, and the canonical root `AUTH_URL` in the matching environment. Roles and account status are loaded server-side from Postgres. Google remains the only sign-in method; authenticated contact-email verification does not add password or email-link authentication, and phone identity remains deferred.

## Email verification and identity roadmap

- Google login is the currently supported sign-in method. Auth.js provider identities are persisted in the `accounts` table, and automatic email-based account linking remains explicitly disabled.
- Phase 3A adds account status, normalized verified-contact uniqueness, hashed verification-event storage, server-only linking policy, and truthful account status UI.
- Phase 3C keeps `users.email` as the stable Google/Auth.js identity. A separately verified `contact_email` can be added or changed without altering Google provider linkage.
- Authenticated email verification uses a six-digit, 10-minute, single-use code delivered through the server-only email-provider adapter. Only a context-bound HMAC is stored in `verification_events`; resends cancel older pending contact-email challenges and five incorrect attempts fail an event.
- Contact-email conflict responses are intentionally generic. Server Actions derive the user from Auth.js, re-check ACTIVE status in PostgreSQL, and rate-limit requests, destinations, IPs, and verification attempts.
- Phone OTP delivery and verification are planned for Phase 3D.
- Verification events store keyed destination and challenge hashes; raw OTPs and raw custom verification tokens must never be persisted or logged.
- `IDENTITY_HASH_PEPPER` is server-only. Use a unique value of at least 32 characters in each environment and never commit it.

### Resend setup

1. Create a Resend account and verify a sending domain you control.
2. Add the DNS records shown by Resend and wait until the domain is verified.
3. Create a restricted sending API key. Do not place it in a committed file.
4. Set `EMAIL_PROVIDER=resend`, `EMAIL_FROM` to a sender on the verified domain, and `RESEND_API_KEY` in the matching Vercel Preview or Production environment.
5. Apply the latest Drizzle migration to a backed-up Preview database, deploy to Preview, and complete the email verification smoke test before applying the migration or promoting the build in Production.

Unit tests mock the delivery provider and never send real email. A successful build does not prove domain verification or inbox delivery; verify those manually in Preview and Production.

## Database

Provision Neon through the Vercel Marketplace and use its pooled `DATABASE_URL`. The pooled driver supports the transactions used by seller approval, artwork creation, checkout creation, and payment finalization.

Generate a migration after schema changes with `npm run db:generate`. Apply migrations with `npm run db:migrate`. Seed the starter catalog with `npm run db:seed`.

The additive auction migration is `drizzle/0005_tiny_firebrand.sql`. Verify the required tables and latest Drizzle journal entry with `npm run db:verify`; it is read-only and prints no credentials. If `.env.local` points at production, do not run migration or seed without explicit migration review and a backup plan. Never reset marketplace tables or edit an applied migration.

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
- Auth POSTs, email verification, upload authorization, payment verification, webhooks, and authenticated Server Actions have initial rate limits.
- The limiter is per-process and best-effort. Replace it with a shared durable limiter before horizontal scale or adversarial traffic.
- The web manifest is the PWA foundation. Offline caching, install UX, and a full service-worker strategy are later-phase work.
- Carrier tracking, returns/refund operations, payout execution, durable distributed rate limiting, SMS delivery, and receipts/certificates remain later phases.

## Known MVP limitations

- The final dedicated ₹1 Razorpay test-mode payment has not yet been completed by a human, so deployed paid-flow behavior remains unverified end to end.
- Fulfillment supports forward order states but not carrier/tracking fields; mixed-seller orders cannot be advanced by one seller while status remains order-level.
- Admin order oversight is intentionally read-only and limited to recent status data; reconciliation and refund tooling are deferred.
- Search is appropriate for the current MVP catalog but still loads the published catalog before in-memory filtering; database-native search/pagination is future scale work.
- Abandoned checkout orders are retained for history; automatic expiry/cleanup is not implemented.
- Auction flags must stay off until a production Razorpay **test** key is independently verified, the deployed migration and manual test auction pass, and the operator explicitly approves enablement. Daily Hobby Cron cannot guarantee a one-to-five-minute close for an inactive auction; lazy settlement handles active reads.
- An expired auction with an unresolved provider payment stays reserved until payment failure/refund is reconciled. Reopening it early could double-sell the artwork.

## Deployment checklist

1. Review the additive auction migration, verify staging and production journals with `npm run db:verify`, and apply only missing migrations through the approved Drizzle path. Never reset or reseed production.
2. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
3. Configure every required variable in Vercel Production with production-scoped values.
4. Confirm the production Google callback and Razorpay webhook URL and signing secret.
5. Deploy to Preview, complete the staging smoke tests, then promote the verified build.
6. Verify headers, database connectivity, Blob callbacks, webhook delivery/replay, and an owned test-mode checkout.
7. Enable monitoring for application errors, webhook failures, refund reconciliation, and database health.
8. Keep auctions off until the release gates in `docs/GIGGLE_GALLERY_MVP_STATUS.md` pass. Confirm `RAZORPAY_KEY_ID` is test-mode without printing it; configure `CRON_SECRET` securely if using the protected daily settlement route.

## Rollback

Keep the previous Vercel deployment available for traffic rollback. Prefer additive database migrations and prepare a separately reviewed down or forward-fix plan before any destructive migration. Rolling back application code does not roll back Neon data or external Razorpay operations.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=low
git diff --check
npm run db:verify
```

GitHub Actions runs install, lint, typecheck, unit tests, and build for pushes and pull requests using placeholders only; it never charges real money.
