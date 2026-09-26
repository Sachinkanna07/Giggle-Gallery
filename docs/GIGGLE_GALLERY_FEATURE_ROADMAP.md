# Giggle Gallery feature roadmap

Status reflects code in this repository, not a claim that every production browser flow or provider operation has been manually exercised. The final release gate is documented in `GIGGLE_GALLERY_MVP_STATUS.md`.

## Implemented marketplace core

- Auth.js Google sign-in with server-side active-user and role checks; buyer, seller, and admin views.
- Seller application, artwork upload authorization, moderation, published catalog, stock state, and guarded unpublishing.
- Shareable artwork search and filters, public artist/artwork pages, responsive imagery, metadata, sitemap, and robots rules.
- Persisted private collections, favorites, cart, followed artists, authenticated view events, real counts, and buyer-owned orders.
- Server-priced INR fixed-price checkout, Razorpay signature/webhook verification, idempotent payment finalization, paid-only revenue, and seller fulfillment.
- Persisted in-app notifications and unread badge for auction, review, sale, and fulfillment events.
- Test-only, feature-flagged single-edition auctions with seller drafts, admin scheduling, inventory reservation, server-authoritative bidding, live polling, winner payment, and expiry.
- Read-only admin oversight of orders/payments and auctions; no administrative payment override or hand-picked winner.

## Release gates, not code features

1. Keep auction flags off until a verified `rzp_test_` production key, reviewed migration, successful deploy, and manual test-mode QA exist.
2. Confirm the deployment is Ready and verify authenticated browser flows, mobile layouts, webhook delivery, and recent runtime errors. Local tests alone do not prove these.
3. Configure a server-only `CRON_SECRET` if using Vercel Cron. On Hobby, daily scheduling is the supported cadence; lazy settlement handles active traffic. Do not promise a five-minute inactive-auction close.
4. Reconcile any payment captured near/after the winner deadline before releasing reserved inventory.
5. Run a real paid Razorpay test only with human approval and the intended payment environment; it was intentionally skipped in earlier QA.

## Optional future enterprise features

These are not unfinished requirements of the test-mode portfolio marketplace: automated seller payouts and KYC, chargeback/dispute automation, durable distributed rate limiting, fraud scoring, advanced shipment-carrier integration, multi-currency, proxy bidding, reserves, runner-up fallback, machine-learning recommendations, native mobile apps, and true low-latency infrastructure for inactive auctions. Each requires separate policy, provider, legal, and operational review before implementation.
