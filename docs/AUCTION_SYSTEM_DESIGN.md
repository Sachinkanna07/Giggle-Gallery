# Auction system — implemented test-mode design

This document describes the implemented, feature-flagged auction path. It does not authorize live-money use. Production stays off unless the migration, deploy, Razorpay test credentials, and manual QA are verified.

## Scope and invariants

- Only a seller-owned, published, available INR artwork with stock exactly one can be drafted. Drafts do not reserve stock.
- An administrator schedules a draft. The scheduling transaction locks the artwork, rejects pending fixed-price orders, and changes availability to `RESERVED`. A partial unique index permits at most one `SCHEDULED`, `LIVE`, or `PAYMENT_PENDING` auction per artwork.
- Fixed-price cart and checkout require `AVAILABLE`. Checkout locks artwork rows and creates a pending internal order before calling Razorpay, so scheduling sees a conflicting pending order. Scheduling never cancels that order.
- A bidder must be an active authenticated non-owner. The auction row is locked before checking server time, current bid, minimum increment, reservation, and idempotency key. Bidder identities are not in the public state response.
- Accepted bids are append-only. The current bid and event are updated in the same transaction. A valid bid in the final two minutes extends the persisted end time by two minutes while the auction row is locked; an idempotent retry cannot extend it twice. The winner is the persisted highest bid at close; no reserve price or runner-up fallback exists.

## State and finalization

`DRAFT` → `SCHEDULED` → `LIVE` → `PAYMENT_PENDING` → `SOLD` or `PAYMENT_EXPIRED`. An auction without bids becomes `UNSOLD` and releases the reservation. An expired winner cannot pay or bid again. The winning bidder gets 24 hours from server-side winner selection to complete test-mode payment.

`settleAuctionIfDue` locks the auction and applies transitions idempotently. Reads and bid actions invoke lazy settlement. `/api/auctions/settle` provides a protected GET for a daily Vercel Cron when `CRON_SECRET` is configured. Hobby Cron cannot provide a one-to-five-minute close cadence; active-page lazy settlement does. A scheduled auction can close late if no request occurs between daily runs; the 24-hour window starts when it is settled. This is an operational limitation, not a claim of real-time scheduling.

The winner's checkout derives the subtotal from `winningBidPaise`, computes shipping and GST on the server, and binds one Razorpay provider order to one internal order and `auction_payment_attempts` row. External order creation occurs before the database transaction; an orphaned provider order on a losing race is unusable. A retry returns the already-bound provider order.

The shared payment finalizer requires signed browser verification or a signed webhook. For auction payment it additionally checks winner identity, highest bid, auction/attempt/order/payment relationships, amount/currency, deadline, reserved artwork ownership, stock one, and exact one-item order. Only that explicit branch can consume reserved artwork. Fixed-price finalization still requires `AVAILABLE`. The transaction marks payment, order, stock, payout record, auction, and notifications together. Duplicate finalization does not decrement stock again.

At payment expiry, the auction becomes `PAYMENT_EXPIRED` and no seller revenue is counted. An obligation without a provider order becomes `EXPIRED` and releases only its own still-valid reservation. If a provider payment remains in `CREATED`/`PENDING`, the obligation and artwork stay pending/reserved until a verified late capture is refunded or another verified terminal reconciliation makes release safe; releasing while late authorization is possible would risk double sale. There is no automatic second-highest award.

## Deployment gates and limits

- `AUCTIONS_ENABLED=true` and `AUCTIONS_TEST_MODE=true` are both required, along with a Razorpay key ID beginning `rzp_test_`; otherwise auction code stays off.
- `CRON_SECRET` is server-only and required for protected scheduled settlement. Never put it in a URL or commit it. Without it, the cron request is rejected and lazy settlement remains available while auction pages/actions are used.
- Apply `drizzle/0005_tiny_firebrand.sql` through Drizzle only after review. `npm run db:verify` checks required tables and migration journal without printing credentials. Never reset existing tables or edit an already-applied migration.
- Test-only auctions are not evidence that arbitrary seller payouts, chargebacks, provider refunds, dispute handling, KYC, anti-fraud controls, or live-money operations are complete. External Razorpay refund and DB status are not one atomic operation; reconcile any failed refund or webhook before releasing stock.
- Public auction state is polled every five seconds only while visible. The countdown is advisory; all acceptance and expiry checks use server time.

## Verification

Run `npm run lint`, `npm run typecheck`, `npx vitest run --exclude ".kilo/**"`, `npm run build`, `git diff --check`, `npm audit`, and `npx dotenv -e .env.local -- npm run db:verify` against the intended branch. Use test-mode accounts and Razorpay test credentials for manual winner checkout; never mark payments paid or place synthetic DB bids.
