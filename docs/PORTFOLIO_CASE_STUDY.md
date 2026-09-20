# Giggle Gallery — Portfolio Case Study

## Overview

Giggle Gallery is a production-oriented art marketplace that helps buyers discover work by mood and visual taste while giving artists a moderated path to sell. The engineering goal was to preserve the project’s cinematic gallery identity while replacing demo behavior with authenticated, persistent, server-authorized workflows.

The result is a connected Next.js marketplace MVP with buyer, seller, and admin roles; guarded image uploads; artwork review; catalog discovery; persistent favorites and cart; Razorpay checkout; transactional payment finalization; seller fulfillment; and operational oversight.

## The problem

An art marketplace needs more than polished cards and checkout screens. It must answer difficult trust questions:

- Which artwork is genuinely public and purchasable?
- Who may upload, publish, fulfill, or inspect an order?
- Which price and quantity are authoritative?
- What happens when two buyers pay for the last unit?
- How are duplicate browser callbacks and webhooks handled?
- How can sellers see useful fulfillment data without seeing another seller’s revenue or unrelated buyer data?

The project therefore treated persistence, authorization, moderation, and payment consistency as product features rather than implementation details.

## Solution

Giggle Gallery uses a published-only public catalog and separates marketplace responsibilities by role:

- Buyers discover artwork, save favorites, curate private collections, manage a persistent cart, check out, and see only their own orders.
- Sellers apply for approval, upload through seller-owned intents, submit artwork for moderation, inspect paid-only metrics, see only their order items, and advance safe fulfillment states.
- Admins review sellers and artwork, safely unpublish artwork without deleting history, and inspect read-only order/payment/fulfillment status.

Search combines title and artist text with mood, style, medium, format, dominant color, availability, year, price, and sorting. Filter state is encoded in the URL for sharing and restoration.

## Architecture

- **Application:** Next.js App Router, React, TypeScript, server components, server actions, and route handlers.
- **Identity:** Auth.js with Google OAuth and server-loaded role/account state.
- **Database:** Neon PostgreSQL accessed through Drizzle ORM.
- **Artwork storage:** Vercel Blob client upload with server-issued, short-lived upload authorization.
- **Payments:** Razorpay provider orders, browser signature verification, raw-body webhook verification, and one shared finalization service.
- **Email:** Resend adapter for separately verified contact email.
- **Deployment:** Vercel with production security headers and environment-scoped provider configuration.

The browser initiates workflows, but the server owns identity, visibility, pricing, stock, order state, and payment truth.

## Buyer flow

1. A visitor browses only published artwork and can share filtered catalog URLs.
2. Authentication enables persisted favorites, collections, cart, and orders.
3. Cart items retain unavailable history so a rejected, unpublished, or sold-out item can be explained and removed.
4. Checkout reloads artwork, quantity, availability, stock, and price from PostgreSQL.
5. Razorpay receives a server-created order for the exact calculated amount.
6. A signed browser callback or verified webhook invokes the shared finalizer.
7. The buyer sees only orders belonging to their authenticated identity.

## Seller flow

1. A buyer submits a seller application; an admin decision controls seller access.
2. An approved seller requests a short-lived upload intent tied to their account and exact Blob pathname.
3. Artwork creation verifies that the Blob callback completed for that seller, then stores the work as pending review.
4. Published, pending, and rejected states remain visible in the seller dashboard while only published work enters the public catalog.
5. Revenue and sales derive only from paid orders in confirmed fulfillment states.
6. Seller order reads are scoped by artist ownership. Shipping details appear only for paid fulfillment work.
7. Fulfillment can move forward one step at a time; unpaid, cross-seller, mixed-seller, backward, and skipped transitions fail closed.

## Admin flow

The admin area is protected by server-owned role state. It supports seller application decisions, artwork publication/rejection, safe unpublish, marketplace counts, and recent order status. Payment state is read-only: there is deliberately no manual “mark paid” control.

## Security decisions

- Active account status and role are rechecked on protected server writes.
- User and seller IDs are derived from the session, not accepted from forms.
- Public profile data excludes email, phone, shipping information, internal moderation fields, and unnecessary identifiers.
- Catalog reads filter at the data boundary to `PUBLISHED` artwork.
- Uploads enforce seller ownership, UUID intent, expiry, filename, MIME allowlist, size, Blob host, and exact pathname.
- Checkout ignores client totals and uses fixed-precision database money with integer paise calculations in application code.
- Browser verification requires same-origin, authenticated buyer ownership, and a valid Razorpay signature.
- Webhooks verify the exact raw body and claim durable event identities before processing.
- Payment finalization locks the payment record, conditionally decrements stock, and writes payment, order, payout, cart, and notifications transactionally.
- Inventory conflicts request a provider refund and record a refunded order state.
- CSP and other response headers restrict scripts, connections, framing, MIME interpretation, referrers, and browser capabilities.

## Blob upload design

The client never receives unrestricted storage authority. It requests a token from an authenticated seller route with an upload-intent UUID. The server constructs the seller-specific pathname prefix, persists the authorization, and limits content to JPG, PNG, or WebP up to 12 MB. The completion callback accepts only the expected Vercel Blob host and exact recorded pathname. Artwork creation then attaches only that completed upload to the same seller.

## Order and stock consistency

Checkout stores immutable artwork, artist, price, quantity, fee, and seller-earnings snapshots. The shared finalizer is idempotent around a locked payment record. Each stock decrement is conditional on published status, available state, and sufficient quantity. A zero balance marks the artwork sold. Duplicate callbacks return the existing confirmed result rather than decrementing stock again.

Mixed-seller fulfillment is a documented MVP limitation because status is currently stored at order level. Seller transitions are therefore allowed only when every line belongs to that seller; this prefers a safe blocked action over an incorrect global update.

## Testing and quality

The repository includes unit coverage for authentication policy, checkout pricing and ownership, payment signatures, webhook events, payment finalization, inventory conflicts, cart unavailable states, seller revenue, seller/admin workflow authorization, search normalization, artist public-data boundaries, favorites ownership, and launch-polish boundaries.

Release validation uses:

```bash
npm run lint
npm run typecheck
npx vitest run --exclude ".kilo/**"
npm run build
git diff --check
npm audit
```

Passing local checks establishes code quality, not production provider proof. The final ₹1 Razorpay test-mode payment remains a human-only release gate.

## Deployment and operations

The app is deployed on Vercel and uses environment-scoped Auth.js, Neon, Blob, Razorpay, and Resend configuration. Deployment guidance separates Preview resources from Production, keeps secret values out of git, and calls for provider/webhook evidence, monitoring, reconciliation, backup/restore, and rollback readiness.

## Engineering challenges solved

- Preserved a distinctive visual product while replacing demo state with connected workflows.
- Prevented rejected or unavailable cart items from trapping the buyer.
- Kept public discovery and artist profiles on a published-only data boundary.
- Designed seller/admin order visibility around least privilege.
- Removed fabricated analytics in favor of paid-only, database-derived metrics.
- Unified browser and webhook payment completion behind idempotent inventory logic.
- Treated external refund atomicity and mixed-seller fulfillment as explicit operational limitations rather than hiding them.

## Current status and next step

The codebase is locally validated and awaiting human production QA. No claim is made about user count, revenue, conversion, or paid-flow success. The next release step is to complete the no-payment QA checklist in `docs/GIGGLE_GALLERY_MVP_STATUS.md`; only then should a human perform the dedicated ₹1 Razorpay test-mode payment.
