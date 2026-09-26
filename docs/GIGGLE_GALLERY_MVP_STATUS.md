# Giggle Gallery MVP status

## Current state

The fixed-price marketplace is implemented and deployed. The auction/social/notification completion pass is implemented in code but is subject to the release gates below; code validation is not a substitute for a deployed browser test. Auction UI and actions fail closed unless `AUCTIONS_ENABLED=true`, `AUCTIONS_TEST_MODE=true`, and the server has a Razorpay test key ID. Production auctions must remain off until those gates are deliberately completed.

The production Neon branch was checked read-only: `auctions`, `auction_bids`, `auction_events`, and `auction_payment_attempts` exist, and the Drizzle journal includes migration `0005_tiny_firebrand.sql`. No production records were created or edited by verification. The migration is additive and does not drop historical marketplace tables or orders.

## Completed phases

- Phase 4: seller upload, seller-owned Blob intent, and pending review.
- Phase 5A: admin review, approval, and publication.
- Phase 5B: unpaid buyer checkout verification and ownership checks.
- Phase 6: polish review, discovery, artist pages, favorites/collections, fulfillment, SEO, and mobile navigation.
- Current code: feature-flagged test-mode auctions, followers, real social counters, in-app notifications, and dashboard views. See `AUCTION_SYSTEM_DESIGN.md` for state and payment rules.

## Historical manual production checks

Earlier manual QA covered seller submission/review/publishing and an unpaid buyer checkout path. A real paid Razorpay test was intentionally skipped. Do not reinterpret that historical check as verification of this new auction implementation, a Razorpay capture, webhook delivery, or current mobile browser behavior.

Known production test data: published artwork `qwsedregthywrteyrut` uses a public image with a real face; a pending unpaid order may exist. Do not delete, rewrite, or invent production data for a passing test. Ask the owner before removing the face image.

## Security rules

- Never commit `.env*` files, secrets, payment credentials, production DB URLs, scratch files, or `.kilo` worktrees.
- Keep Google/Auth.js identity and active-account/role checks server-side. Enforce ownership on orders, follows, notifications, artwork, bids, and winner checkout.
- Only provider-verified signed payment callbacks/webhooks may confirm payment. Never mark `PAID` manually or accept client-supplied totals.
- Never let fixed-price checkout consume `RESERVED` artwork; never release an auction reservation while an unresolved provider capture could still arrive.
- Do not fabricate views, favorites, followers, bids, orders, revenue, or popularity. Public profiles must not expose email, phone, shipping data, or moderation notes.
- Keep production auction flags off until migration, deploy, Razorpay test mode, and manual auction QA pass.

## Known operational risks

- Payment capture/refund and PostgreSQL cannot be one atomic transaction. A failed external refund or missed webhook requires provider/database reconciliation before releasing inventory.
- On the Vercel Hobby plan, Cron runs at most daily. Lazy settlement on reads/actions gives prompt updates while an auction page is active; an auction with no traffic may be settled late. The winner's 24-hour payment window starts when winner selection is persisted.
- `CRON_SECRET` must be configured for the protected settlement route; without it the cron call is rejected. Lazy settlement still operates when the feature is enabled and pages are used.
- Rate limiting is per process, not a distributed abuse control. Test-mode auctions are not approved for real-money, high-value, or regulated use.
- A pending fixed-price order blocks auction scheduling by policy until resolved through the existing marketplace path; it is not auto-cancelled.
- Automated tests and build do not prove Google sign-in, provider webhook delivery, device layouts, or a complete paid test transaction in production.

## Next manual test checklist

1. Review the deployment and environment-variable **names** without printing values. Confirm `DATABASE_URL`, Auth, Blob, Razorpay test credentials, flags, and optional `CRON_SECRET`. Keep flags off until approved.
2. On a phone and desktop, browse home, gallery filters, artwork, artist profile, auctions, notifications, buyer account, seller, and admin pages. Check keyboard focus, wrapping, and horizontal overflow.
3. With distinct test buyer/seller/admin accounts, follow and unfollow an artist; like/unlike and save artwork; verify persisted counts, private collections, notification ownership, and refresh behavior.
4. Create a published single-stock test artwork through normal seller/admin flows. Check that a draft does not reserve inventory, a pending fixed-price payment blocks scheduling, and scheduling reserves stock from fixed-price checkout.
5. With two buyer accounts, bid in test mode. Confirm a stale/lower competing bid loses, outbid notification arrives, counts update within polling interval, and no bidder identity leaks publicly.
6. Let the auction end, verify one winner and a 24-hour test payment window. Complete only an approved Razorpay **test-mode** payment; verify exact server amount, signed confirmation, one stock decrement, paid-only revenue, and duplicate webhook/browser callback behavior.
7. On a separate unpaid test auction, verify expiry, no runner-up, no seller revenue, and safe reservation behavior. Inspect provider state before expecting inventory release.
8. Check recent production runtime errors and webhook failures. Reconcile discrepancies before enabling new auctions broadly.
9. Separately, with explicit human approval, perform the previously skipped ₹1 paid-flow test if needed; do not use real credentials in automated checks.

## Local verification

Use Node 22 and the intended non-production credentials for tests. Run:

```text
npm run lint
npm run typecheck
npx vitest run --exclude ".kilo/**"
npm run build
git diff --check
npm audit
npx dotenv -e .env.local -- npm run db:verify
```

The last command is read-only but `.env.local` may target production: confirm the target without displaying the URL. Never run a migration merely because a verification command is quiet; check its journal first.
