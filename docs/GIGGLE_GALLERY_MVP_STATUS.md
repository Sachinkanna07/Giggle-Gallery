# Giggle Gallery MVP Status

Last reviewed: 2026-09-19
Production: https://giggle-gallery-pi.vercel.app

## Current production status

Giggle Gallery is a connected art-marketplace MVP built with Next.js, Auth.js, Neon Postgres, Drizzle ORM, Vercel Blob, Razorpay, and Resend. Authentication, seller onboarding, artwork upload and moderation, public catalog visibility, cart/checkout creation, buyer orders, and seller reporting use server-authorized persisted workflows.

The production flow has been manually exercised through opening Razorpay checkout without completing a payment. A real paid transaction remains intentionally untested, so payment capture, production webhook delivery, stock decrement, payout creation, and paid-order confirmation are not yet production-verified.

## Completed phases

### Phase 4 — Seller upload and pending review

- Approved sellers can upload JPG, PNG, or WebP artwork images through a short-lived, seller-owned Vercel Blob intent.
- Artwork creation accepts only the exact completed Blob URL associated with that intent.
- New artwork is stored as `PENDING_REVIEW`, appears in the seller dashboard, and remains absent from the public catalog.

### Phase 5A — Admin review and publish

- `/admin` is restricted to the `ADMIN` role.
- Admins can review pending artwork and publish or reject it.
- Published artwork appears in the public gallery; pending and rejected artwork remains private.

### Phase 5B — Unpaid buyer checkout verification

- Buyers can add published, in-stock artwork to the persisted cart and open Razorpay checkout.
- Price, quantity, stock, shipping, and tax are recalculated from PostgreSQL on the server.
- Closing Razorpay without payment leaves the order pending; it does not reduce stock or count as seller sales or revenue.

### Phase 6 — Polish review

- Authentication, buyer, seller, admin, upload, payment, email, and visibility boundaries were reviewed.
- The existing production-facing implementation required no additional application-code change in this documentation pass.
- Final handoff status, remaining risks, and reusable next-work prompts are documented here and in `docs/NEXT_WORK_PROMPTS.md`.

## Manual production checks already completed

- Seller artwork image uploaded successfully through Vercel Blob.
- Submitted artwork appeared as `PENDING_REVIEW` in the seller dashboard and stayed out of the public catalog.
- Admin review published the artwork, after which it appeared publicly.
- Buyer checkout rendered and opened the Razorpay popup.
- Closing Razorpay without payment left the order pending and did not count it as a seller sale or revenue.

## Known production test data

- Published artwork: `qwsedregthywrteyrut`
- Seller: `sachin`
- Listed price: `₹2,14,234`
- Stock: `1`
- The artwork image contains a real face. Do not delete or alter it through direct database access.
- A pending unpaid buyer order may exist from the abandoned Razorpay check.

## Security rules that must not be weakened

- Keep roles and active-account status server-controlled; never trust client role or user identifiers.
- Keep `/admin` restricted to `ADMIN` and seller artwork tools restricted to `SELLER` or `ADMIN`.
- New artwork must remain `PENDING_REVIEW` until an admin decision.
- Public catalog reads must continue filtering to `PUBLISHED` artwork only.
- Accept only the seller-owned, unexpired upload intent and exact approved Vercel Blob URL.
- Calculate prices and availability from PostgreSQL; never trust totals supplied by the browser.
- Mark payments paid only after Razorpay signature verification or a verified webhook.
- Decrement stock conditionally inside payment finalization; never permit negative stock.
- Keep production failures fail-closed and never show development fallback catalog data as production records.
- Never commit or print environment secrets, provider tokens, pulled production env files, or customer data.

## Known risks and deliberately incomplete work

- Real paid Razorpay flow is not production-verified.
- Abandoned checkout attempts remain visible as pending orders; automatic expiry/cleanup is not implemented.
- Rate limiting is process-local and should become durable before horizontal scale or hostile traffic.
- Razorpay refunds cannot be atomic with PostgreSQL; operations need reconciliation and alerting.
- Resend domain verification and real inbox delivery require environment-specific manual checks.
- Fulfillment operations, payout execution, refunds tooling, receipts, and shipping workflows are beyond this MVP pass.

## Next recommended work

1. Create a controlled ₹1 physical test artwork and run one real Razorpay test-mode payment end to end.
2. Verify the browser callback, webhook delivery/replay, paid order, stock decrement, seller revenue, payout row, and buyer success page.
3. Add production monitoring for payment/webhook failures and refund reconciliation.
4. Clean up the public face-image test artwork through an approved product/admin workflow after evidence is captured.
5. Complete the final launch checklist after the paid-flow evidence is recorded.

## Exact next manual test checklist

- Use Razorpay test mode and a dedicated ₹1 artwork; do not pay for the current ₹2,14,234 artwork.
- Sign in as the seller, upload the ₹1 artwork, and confirm `PENDING_REVIEW` in `/seller`.
- Confirm the item is absent from `/` and its public detail route before review.
- Sign in as admin, open `/admin`, publish the pending artwork, and confirm it appears publicly.
- Sign in as a buyer, add exactly one unit, open `/checkout`, and confirm the displayed amount matches the server-created Razorpay order.
- Complete one Razorpay test payment and record the provider order/payment IDs outside the repository.
- Confirm `/checkout/success` and `/orders` show `PAID` / `CONFIRMED`.
- Confirm stock decreased exactly once and cannot go negative.
- Confirm the seller dashboard shows exactly one sale and the correct seller earnings.
- Confirm duplicate webhook delivery does not duplicate stock decrement, payout, or notification records.
- Confirm a different buyer cannot access the paid order.
- Remove or archive the ₹1 test artwork through the application workflow when the verification evidence is complete.

## Local validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
npm audit
```

If repository-wide lint or tests fail only under `.kilo/worktrees`, report those separately and run scoped checks for changed project files. Do not edit `.kilo` to make the main project pass.

## Secret safety

Never commit `.env*` files other than the placeholder-only `.env.example`. Do not commit Vercel/Neon state, Blob or Razorpay credentials, PDFs, scratch files, production env pulls, or customer/provider identifiers.
