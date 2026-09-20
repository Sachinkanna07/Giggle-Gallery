# Giggle Gallery MVP Status

Last reviewed: 2026-09-20
Production: https://giggle-gallery-pi.vercel.app

## Current MVP status

Giggle Gallery is a connected, server-authorized art-marketplace MVP. The public catalog, authentication, seller onboarding, guarded artwork upload, admin moderation, favorites and collections, persistent cart, checkout creation, buyer orders, seller fulfillment, admin oversight, and paid-only seller reporting are implemented.

The codebase is launch-candidate quality after local lint, typecheck, unit-test, build, diff, and dependency-audit validation. The newly completed discovery, order-management, navigation, accessibility, and SEO changes still require human production QA. The final dedicated ₹1 Razorpay test-mode payment remains intentionally unperformed and must happen only after that QA.

## Completed phases

### Phase 4 — Seller upload and pending review

- Approved sellers upload JPG, PNG, or WebP images up to 12 MB through short-lived, seller-owned Vercel Blob intents.
- Artwork creation accepts only the exact completed Blob URL associated with the authenticated seller and intent.
- New artwork is `PENDING_REVIEW`, visible to its seller, and absent from the public catalog.

### Phase 5A — Admin review and publish

- `/admin` is restricted to `ADMIN`.
- Admins can publish or reject pending artwork and safely unpublish published artwork without deleting history.
- Only `PUBLISHED` artwork is returned by the public catalog.

### Phase 5B — Unpaid buyer checkout verification

- Buyers can add published, available stock to a persisted cart and open Razorpay checkout.
- Price, quantity, stock, shipping, tax, and currency are calculated from PostgreSQL on the server.
- Closing Razorpay without payment leaves an unpaid order; it does not decrement stock or count as seller revenue.

### Phase 6 — Polish review

- Search supports title/artist text, medium, format, dominant color, availability, year, price, and sorting with shareable URL state.
- Public artist pages show safe profile data and published works only.
- Favorites remain authenticated and persisted; rejected/unpublished work does not enter the public collection catalog.
- Sellers see only their paid order items and fulfillment data, and can move seller-owned single-seller orders only through `CONFIRMED → PROCESSING → SHIPPED → DELIVERED`.
- Buyers see only their own orders and delivery destination summary.
- Admin order oversight is read-only and cannot mark payments paid.
- Seller analytics are labeled and derived from verified paid sales; fabricated charts were removed.
- Mobile/account navigation, unavailable states, payment-modal dismissal messaging, accessible pressed states, metadata, robots, and published-only sitemap routes were added or improved.
- Security, upload, checkout, payment, stock, authorization, and public-data boundaries were reviewed without weakening payment finalization.

## Manual production tests already completed

- Google sign-in and the connected seller/admin workflow were exercised in production during earlier phases.
- A seller image uploaded through Vercel Blob.
- Submitted artwork appeared as `PENDING_REVIEW` and stayed out of the public catalog.
- Admin review published the artwork and made it public.
- Buyer checkout opened the Razorpay test-mode popup.
- Closing the popup without payment left the order unpaid and excluded it from seller sales/revenue.

These earlier checks do not verify the newest code until the human QA checklist below is completed.

## Known skipped item

- A real paid Razorpay test was intentionally skipped. Checkout opening is not proof of capture, webhook delivery, stock decrement, payout creation, or paid-order rendering.

## Known production test data

- Dedicated published test artwork: `GG Paid Flow Test ₹1`, price ₹1, intended only for the final test-mode paid flow.
- Older published artwork: `qwsedregthywrteyrut`; its public image contains a real face and must be cleaned up only through the approved admin workflow after evidence is preserved.
- One or more pending unpaid orders may exist from abandoned Razorpay checkout attempts.
- Historical order/payment records must not be deleted or manually rewritten.

## Security rules that must not be weakened

- Derive identity, role, and ownership from active Auth.js/PostgreSQL state; never accept client-controlled user IDs or roles.
- Keep `/admin` admin-only and seller tools seller/admin-only.
- Keep new artwork pending until an admin decision and public catalog reads `PUBLISHED`-only.
- Keep upload intent ownership, expiry, filename, content type, size, Blob hostname, and exact pathname validation.
- Calculate price, quantity, availability, stock, tax, and currency on the server.
- Mark payments paid only after a valid Razorpay signature or verified webhook.
- Preserve webhook/payment idempotency and transactional conditional stock decrement; stock must never become negative.
- Seller revenue and fulfillment views must remain paid-only and seller-scoped.
- Buyer order reads must remain buyer-scoped; shipping data is limited to fulfillment needs.
- Do not add admin or seller “mark paid” controls.
- Never commit or print secrets, `.env` files, provider tokens, customer data, scratch assets, or `.kilo` worktrees.

## Known remaining risks

- The deployed paid flow and webhook behavior are not yet verified by the final human ₹1 test.
- Abandoned checkout attempts have no automatic expiry/cleanup policy.
- Rate limiting is process-local and should become durable before horizontal scale or hostile traffic.
- Razorpay refunds are external side effects and require reconciliation/alerting because they cannot be atomic with PostgreSQL.
- Seller fulfillment uses an order-level state; mixed-seller orders are intentionally blocked from seller updates until a per-item fulfillment model exists.
- Carrier/tracking, returns, admin reconciliation/refunds, payout execution, and audit-event tooling are deferred.
- Search is in-memory over the published catalog and needs database-native pagination/search at larger scale.
- Resend delivery, backup/restore, monitoring alerts, and rollback drills need environment-specific operational evidence.

## Next recommended work

1. Complete the manual no-payment production QA below.
2. Fix only reproduced defects, revalidate, and deploy those fixes.
3. Perform one final human-only ₹1 Razorpay test-mode payment.
4. Verify payment, webhook replay, inventory, buyer order, seller revenue, payout, and duplicate-processing behavior.
5. Preserve sanitized evidence, then clean up the public face artwork through `/admin`.
6. Add monitoring, reconciliation, backup/restore, and rollback evidence before a public launch decision.

## Exact next manual test checklist — do not pay yet

### Public

- Open `/`; verify the gallery loads and the `GG Paid Flow Test ₹1` artwork is present.
- Search by artwork title and artist, exercise format/color/availability/price filters, copy the filtered URL, and confirm a fresh tab restores the filters.
- Open one artwork detail page and its linked artist profile; confirm only published works and safe public fields appear.

### Buyer

- Sign in, save/unsave an artwork, refresh, and confirm persistence in `/collections`.
- Add an available item to cart; confirm an unavailable/rejected item is labeled and removable if an old one remains.
- Confirm checkout stays blocked until unavailable items are removed.
- Open `/orders` and confirm only the signed-in buyer’s order history and address summary appear.
- Stop before opening or completing payment for the ₹1 test item.

### Seller

- Open `/seller`; verify paid-only revenue, status counts, low/out-of-stock count, top artwork data, and paid orders.
- Confirm pending/rejected/published artwork status is accurate.
- For an eligible paid single-seller order, confirm only the next fulfillment action is offered; do not alter production fulfillment unless it is an approved test order.

### Admin

- Open `/admin`; verify non-admin access is denied.
- Verify seller applications, pending artwork review, published artwork unpublish controls, marketplace counts, and read-only recent order statuses.
- Confirm there is no manual “mark paid” control and do not unpublish test data yet.

### Mobile

- Check header/mobile navigation, gallery filters, artwork dialog/page, cart, checkout form layout, seller page, and admin tables for clipping or unusable controls.

## Final ₹1 payment test — human only, after QA approval

1. Remove every old rejected/unavailable cart item.
2. Keep only `GG Paid Flow Test ₹1`, quantity 1.
3. Confirm the Razorpay popup displays TEST MODE; never use real financial credentials.
4. Complete one Razorpay test payment manually.
5. Verify buyer order `PAID`/`CONFIRMED`, stock `1 → 0`, artwork unavailable/sold, seller paid-sale/revenue update, and one payout record.
6. Refresh/replay safely and confirm stock, payout, and notifications are not duplicated; the old unpaid order must still not count as revenue.

## Local validation commands

```bash
npm run lint
npm run typecheck
npx vitest run --exclude ".kilo/**"
npm run build
git diff --check
npm audit
```

The root lint script excludes `.kilo`; do not edit `.kilo` to make project checks pass.

## Do not commit secrets

Never commit `.env*` files except the placeholder-only `.env.example`. Do not commit `.neon`, Vercel state, Blob/Razorpay/Resend credentials, production environment pulls, provider/customer identifiers, PDFs, `scratch/`, temporary assets, or `.kilo/` worktrees.
