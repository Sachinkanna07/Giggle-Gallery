# Auction System Design — Planning Only

Status: **not implemented**. This document is an architectural gate, not authorization to add auction tables, routes, jobs, UI, or payment behavior.

## 1. Goals

Add trustworthy timed auctions for approved, published artwork while preserving Giggle Gallery’s server-side roles, moderation, inventory, payment verification, and order ownership rules. Bids must be append-only evidence; the server must determine eligibility, amount, time, and winner.

## 2. Explicitly not part of the current MVP

Live auctions, proxy bidding, anti-sniping extensions, multi-currency settlement, auction houses, buyer premiums, KYC, escrow, automatic refunds, disputes, and payout automation remain out of scope until legal, provider, and operational rules are approved.

## 3. Proposed domain and schema

- `auctions`: artwork, seller, status (`DRAFT`, `SCHEDULED`, `LIVE`, `ENDED`, `CANCELLED`, `PAYMENT_PENDING`, `SOLD`, `UNSOLD`), start/end timestamps, reserve, opening/minimum increment, currency, winner, winning bid, version, timestamps.
- `auction_bids`: auction, bidder, amount, accepted server timestamp, idempotency key, request metadata suitable for fraud review; bids are never edited.
- `auction_events`: append-only state transitions and actor/reason metadata.
- `auction_payment_attempts`: winner order/payment references, deadline, state, attempts, reconciliation timestamps.
- Reuse existing artwork, orders, order items, payments, payouts, notifications, and users only through explicit foreign keys and lifecycle rules.

Money should use integer minor units or an exact numeric type consistently. Store all timestamps in UTC. Add unique constraints for idempotency keys and the one active auction allowed per artwork.

## 4. State machine

Only admin-approved transitions are allowed: `DRAFT → SCHEDULED → LIVE → ENDED → PAYMENT_PENDING → SOLD`, with `UNSOLD` for no acceptable winner and narrowly defined `CANCELLED` paths before valid bidding. Time alone does not authorize arbitrary transitions; an idempotent finalizer applies them.

## 5. Server actions and endpoints

- Admin/seller draft creation, with ownership and role checks.
- Admin schedule/publish/cancel controls.
- Read-only public auction detail and paginated bid history with bidder masking.
- Authenticated `placeBid` endpoint/action with idempotency key.
- Internal finalization job endpoint authenticated independently of browser sessions.
- Winner payment initiation that derives amount and winner from auction state.
- Admin reconciliation endpoint for stuck finalization/payment states.

## 6. Bid validation

Require an active account, verified contact policy, non-owner bidder, `LIVE` server state, server time before end, supported currency, exact integer amount, minimum increment, and optional maximum/risk rules. Never accept bidder ID, seller ID, current price, or auction timing from the client.

## 7. Concurrency and race handling

Place each bid inside a database transaction that locks or conditionally updates the auction version/current price. Insert the accepted bid and update the leader atomically. A stale competing bid must retry against the new minimum or fail cleanly. Test equal bids, end-time races, retry duplication, and two-region concurrency. UI countdowns are advisory; server time is authoritative.

## 8. Idempotency

Every bid, finalization run, order creation, payment callback, webhook, notification, and payout intent needs a stable idempotency key and unique database constraint. Replays must return the existing result without repeating inventory or money effects.

## 9. Payment integration

The winner receives a short payment window and a server-created Razorpay order for the exact winning amount plus explicitly approved fees. Payment is confirmed only by verified signature/webhook. Auction payment code should call the existing hardened finalization boundary rather than create a second looser path.

## 10. Auction finalization

An idempotent scheduled worker closes ended auctions, selects the highest valid bid under transaction protection, verifies reserve rules, creates one winner obligation/order, and emits notifications. Repeated runs must be harmless. A missed schedule must be recoverable by reconciliation without changing the winner.

## 11. Winner default and fallback policy

Do not automatically charge stored credentials or silently promote the next bidder. Define payment deadline, reminders, default status, penalties, seller/admin decision, and whether re-offering to the next bidder is legally/product acceptable before implementation.

## 12. Seller and admin controls

Sellers may draft only for their own eligible artwork. Admin approval is required to schedule. Once the first valid bid exists, reserve, currency, artwork, start/end time, and increment are immutable. Cancellation after bidding requires an admin reason, audit event, bidder notification, and policy-approved conditions.

## 13. Notifications

Plan in-app and email events for scheduled/live, bid accepted, outbid, ending soon, won/lost, payment deadline, payment confirmed/failed, cancelled, and admin intervention. Notifications are derived from committed events and must not determine state.

## 14. Security and abuse controls

Add durable rate limits, CSRF/origin protections appropriate to the action mechanism, bot/risk monitoring, self-dealing detection, bidder privacy, log redaction, account suspension enforcement, and audit retention. KYC and jurisdiction rules require legal/provider review before higher-value auctions.

## 15. Automated tests

Cover role and ownership denial, unpublished/ineligible artwork, amount boundaries, stale/equal concurrent bids, last-millisecond bids, idempotent retries, clock handling, reserve met/unmet, cancellation restrictions, deterministic winner, duplicate finalizer, duplicate payment webhook, failed payment, stock exactly once, order ownership, notification dedupe, and rollback/reconciliation paths.

## 16. Manual production test checklist

Use feature-flagged test accounts and a low-value test-mode artwork. Verify two independent bidders, simultaneous bids, masked history, outbid messaging, server-authoritative close, deterministic winner, exact Razorpay amount, winner-only order access, duplicate webhook/finalizer safety, one stock decrement, seller revenue/payout intent, failed-payment recovery, admin audit trail, and rollback. Do not use live money or the public face-image artwork.

## 17. Feature-flag rollout and risks

Roll out in stages: schema dark launch → staff-only read UI → test-mode bidding → test-mode finalization/payment → invited cohort → monitored wider release. The kill switch must stop new bids without corrupting accepted bids or payment reconciliation.

Principal risks are race conditions, clock disagreement, payment/default handling, self-bidding and fraud, auction cancellation disputes, privacy leakage, regulatory/KYC obligations, notification delays, job failure, and conflicts between auction inventory and fixed-price checkout. Auction implementation begins only after product policy, legal scope, provider behavior, operational ownership, and rollback criteria are signed off.
