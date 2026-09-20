# Giggle Gallery Next Work Prompts

Replace bracketed placeholders before use. Each prompt is deliberately narrow: inspect first, preserve server-owned security boundaries, validate locally, and distinguish local proof from production proof.

Current handoff: discovery filters, public artist profiles, persisted favorites, seller order fulfillment, buyer order polish, read-only admin oversight, mobile navigation, SEO, and accessibility improvements are implemented. Run the no-payment manual QA in `docs/GIGGLE_GALLERY_MVP_STATUS.md` before using prompt 1. Auctions remain post-MVP design work only.

## 1. ₹1 paid-flow test

```text
Objective: After the no-payment manual QA is approved, verify one complete Razorpay test-mode payment using the existing dedicated ₹1 artwork.
Repo/context: [REPO], [PRODUCTION_OR_PREVIEW_URL], [VERCEL_PROJECT].
Inspect first: status/log, MVP status doc, checkout creation, verification, webhook, finalization transaction, buyer orders, seller reporting, and provider mode.
Do: confirm `GG Paid Flow Test ₹1` is the only cart item at quantity 1; have the human complete payment; record non-secret evidence for order, payment, webhook, stock, seller revenue, and payout; test one duplicate webhook.
Don't: start before manual QA approval, use live money or real financial credentials, pay for qwsedregthywrteyrut, edit DB rows, expose provider IDs/secrets in git, or claim success from checkout opening alone.
Security: keep server pricing, signatures, buyer ownership, idempotency, and conditional stock decrement unchanged.
Tests: add/update only if a reproducible code defect is found; cover its negative boundary.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: HEAD; provider mode; browser/signature/webhook results; order/payment/stock/payout/seller results; files; validation; production data changed; cleanup; risks.
```

## 2. Clean up the public face artwork

```text
Objective: Safely unpublish qwsedregthywrteyrut through the ADMIN-only `/admin` workflow after test evidence is preserved.
Repo/context: [REPO], [URL], [ADMIN_ACCOUNT].
Inspect first: exact artwork, current status, linked order items/payments/payouts, Blob references, and supported admin workflow.
Do: find the title under **Published artworks**, select **Unpublish** once, preserve financial history and audit references, then verify the exact target twice.
Don't: delete directly with SQL, remove unrelated Blobs, delete orders/payments, use the pending-review reject button, or act before paid-flow evidence is complete.
Security: require admin authorization and avoid exposing buyer/seller/provider data.
Tests: cover archive/unpublish authorization and historical-order rendering if code changes.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit; browser-check public absence and historical records.
Final report: target; action; recoverability; Blob disposition; records preserved; files; validation; commit/push; production data changed; follow-up.
```

## 3. Final launch checklist

```text
Objective: Issue an evidence-based GO/NO-GO decision for the Giggle Gallery MVP.
Repo/context: [REPO], [PRODUCTION_URL], [VERCEL_PROJECT], [PROVIDER_MODES].
Inspect first: git/deployment, environment variable names only, OAuth callback, DB, Blob, Razorpay webhook, Resend, CSP, monitoring, backup and rollback, plus paid-flow evidence.
Do: verify public/authenticated routes, roles, catalog visibility, seller/admin flows, upload, paid flow, webhook replay, ownership, stock, email, alerts, and rollback readiness.
Don't: print secrets, make live payments, mutate DB directly, weaken controls, or treat build/Ready status as end-to-end proof.
Security: review auth, account status, upload intent, published-only catalog, server pricing, payment verification, order ownership, stock idempotency, and secret handling.
Tests: run existing suites; add only for a reproduced defect.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: HEAD/deployment; each subsystem PASS/FAIL/UNVERIFIED; validation; blockers; rollback; GO/NO-GO; production data changed.
```

## 4. Public artist profile

```text
Objective: Complete a credible public artist profile and safe seller-edit workflow without redesigning the site.
Repo/context: [REPO], current /artist/[slug], artist schema/actions, [DEPLOYMENT_URL].
Inspect first: profile schema, getArtistBySlug, seller ownership, image storage, follows/ratings, routes, tests, and existing visual system.
Do: define verified fields, seller edit action, validation, published-artwork filtering, useful empty states, responsive/accessibility polish, and cache/revalidation behavior.
Don't: let sellers edit roles/approval/rating counts; expose private contacts; show unpublished work; add fake credentials or metrics.
Security: server-resolve seller profile from session; validate URLs/images; authorize every mutation.
Tests: owner/non-owner/admin boundaries, invalid input, published-only works, slug collision, empty profile.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: baseline; fields/workflow; security; migrations; files; tests; validation; manual production checks; commit/push; risks.
```

## 5. Search and filters

```text
Objective: Turn existing search/filter logic into a stable, URL-shareable discovery experience.
Repo/context: [REPO], lib/search.ts, gallery components, marketplace query path.
Inspect first: current controls, natural-query parser, catalog size/query source, URL state, mobile UX, accessibility, and search tests.
Do: preserve useful filters/sorts, encode state in URL, add clear/reset and honest zero-results recovery, and keep results published-only.
Don't: introduce fake AI, trust client catalog data, query unpublished records, or add a search service before scale justifies it.
Security: whitelist sort/filter values and keep public visibility enforced at the data boundary.
Tests: parser, combined filters, malformed URL values, price boundaries, sorting, no results, unpublished exclusion.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: query contract; UX changes; security; files; tests; performance notes; validation; manual checks; commit/push.
```

## 6. Wishlist and collections

```text
Objective: Polish saves and private collections into a complete, dependable workflow.
Repo/context: [REPO], collections/saves actions, /collections, artwork cards.
Inspect first: schema, session/ownership checks, optimistic UI, errors, duplicate rules, empty states, and existing tests.
Do: make save/unsave and create/rename/delete/add/remove coherent; preserve state across refresh; add accessible feedback and mobile polish.
Don't: expose private collections, accept another user's IDs, delete artwork, or create public sharing without separate approval.
Security: derive user from session and scope every collection mutation by owner in the database.
Tests: unauthenticated/non-owner, duplicate save, rename validation, delete semantics, stale UI, missing artwork.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: flows; privacy/ownership; files; tests; validation; manual checks; commit/push; deferred sharing work.
```

## 7. Seller order management

```text
Objective: Let sellers manage only their paid order items through a controlled fulfillment lifecycle.
Repo/context: [REPO], seller dashboard, orders/orderItems/payments/payouts schema.
Inspect first: getSellerSnapshot, paid-only filtering, order states, buyer privacy, shipping gaps, actions, and tests.
Do: define allowed transitions, seller-scoped order view, dispatch/tracking fields if approved, timestamps, audit evidence, and buyer notification events.
Don't: expose full payment credentials, let sellers mark unpaid orders paid, alter totals, view other sellers' items, or skip transition checks.
Security: authorize by session seller and item ownership; use conditional updates; redact buyer data to fulfillment minimum.
Tests: unpaid exclusion, cross-seller denial, invalid transitions, replay, mixed-seller order, notification dedupe.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: state machine; privacy; migration; files; tests; validation; production checklist; commit/push; risks.
```

## 8. Admin order management

```text
Objective: Add read-first admin oversight for orders, payments, failures, and fulfillment without creating unsafe refund controls.
Repo/context: [REPO], /admin, order/payment/webhook schema and actions.
Inspect first: admin guard, statuses, provider references, PII, pagination/filter needs, reconciliation gaps, and audit logging.
Do: build server-filtered/paginated oversight, detail view, failure flags, and safe links to existing records; add explicit audit events for any approved mutation.
Don't: expose secrets/signatures, allow arbitrary status edits, implement refunds, or weaken buyer/seller ownership routes.
Security: ADMIN server check on every read/action; redact sensitive data; validate filters; default to read-only.
Tests: non-admin denial, filters/pagination, redaction, malformed IDs, mixed seller orders, read-only guarantees.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: capabilities; redaction/auth; files; tests; validation; manual checks; commit/push; deferred operations.
```

## 9. Offers

```text
Objective: Design and implement expiring buyer offers with seller accept/counter/decline and a secure accepted-price checkout.
Repo/context: [REPO], artwork/checkout/order/payment boundaries, [PRODUCT_POLICY].
Inspect first: fixed-price flow, availability, money types, notifications, concurrency, seller ownership, and marketplace offer policies.
Do: agree state machine/expiry/competing-offer rules first; use exact money; authorize actors; preserve append-only history; create checkout server-side from an accepted active offer.
Don't: reserve stock merely for an offer unless policy says so; charge before acceptance; trust client prices; let acceptance bypass stock/payment checks.
Security: idempotency, conditional acceptance, buyer/seller isolation, rate limits, audit events, and accepted-price integrity.
Tests: actor denial, low/high amounts, expiry races, simultaneous acceptance, withdrawal, stale stock, duplicate actions, checkout amount.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: policy/state machine; migration; security/races; files; tests; validation; manual test; commit/push; remaining risks.
```

## 10. Auction schema planning

```text
Objective: Produce an implementation-ready auction schema and state-machine plan only.
Repo/context: [REPO], docs/AUCTION_SYSTEM_DESIGN.md, current artwork/order/payment schema.
Inspect first: all existing constraints, money/date conventions, migrations, payment idempotency, stock, jobs, notifications, and legal/product unknowns.
Do: refine entities, indexes, constraints, state transitions, actor permissions, concurrency strategy, migration/rollback, and test matrix; flag unresolved policy decisions.
Don't: add tables, routes, UI, jobs, or payment changes; do not assume live bidding, KYC, reserve, default, refund, or anti-sniping policy.
Security: threat-model self-bidding, races, replay, privacy, cancellation, payment default, and admin abuse.
Tests: specify concurrency and property/invariant tests even though no runtime code is added.
Validation: npm run typecheck; git diff --check; npm audit; validate schema examples against current types.
Final report: decisions; open policy questions; proposed migration; invariants; threats; test plan; docs changed; validation; implementation gate.
```

## 11. Auction bidding phase 1

```text
Objective: Implement feature-flagged, test-only timed bidding after auction schema/policy approval.
Repo/context: [REPO], approved auction design/migration, [FLAG_PROVIDER].
Inspect first: approved decisions, schema state, session/account checks, DB transaction support, clocks, rate limits, and observability.
Do: implement staff-only read UI and atomic placeBid with append-only bids, server time/amount, version or row locking, idempotency, masked bidder display, and kill switch.
Don't: implement payment/finalization, public rollout, proxy/live bidding, auto-extension, or permit seller self-bids.
Security: active-account checks, ownership denial, durable rate limit, CSRF/origin defense, log redaction, conditional transaction.
Tests: simultaneous/stale/equal bids, end-time race, retry idempotency, self-bid, inactive user, minimum increment, flag off.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit; run a two-client concurrency test.
Final report: flag/scope; transaction invariant; migration; files; tests; validation; manual evidence; commit/push; rollout blocked on.
```

## 12. Auction finalization and payment

```text
Objective: Add idempotent auction close, winner order, and test-mode payment only after phase-1 concurrency evidence.
Repo/context: [REPO], approved policy, auction phase 1, Razorpay test mode, scheduler choice.
Inspect first: finalization design, payment boundary, stock, order ownership, webhook replay, scheduler auth/retries, default policy, reconciliation.
Do: finalize deterministically under transaction, create one winner obligation/order, derive exact amount server-side, enforce deadline, reuse verified payment finalization, add reconciliation and kill switch.
Don't: use live money, silently promote bidders, auto-refund, duplicate fixed-price logic, or mark paid from browser claims.
Security: independently authenticate jobs; idempotency constraints; winner-only checkout/order; one stock decrement; immutable bid winner evidence.
Tests: duplicate/missed finalizer, reserve, ties, late bid, duplicate callbacks/webhooks, failed/late payment, ownership, stock/payout once.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit; controlled end-to-end test-mode auction.
Final report: policy; scheduler; payment evidence; security/invariants; files; tests; validation; rollback; commit/push; production rollout status.
```

## 13. Notifications

```text
Objective: Deliver a reliable in-app notification inbox and selected transactional emails.
Repo/context: [REPO], notifications schema, Resend integration, event-producing workflows.
Inspect first: existing writes, email verification, provider config, deep-link targets, privacy, retries, and current UI.
Do: define event catalog and dedupe keys; add owner-scoped paginated inbox/read state; send email asynchronously or after committed state; add preferences where required.
Don't: let notifications drive business state, send secrets/PII, duplicate on webhook replay, or claim email works without inbox evidence.
Security: owner-scoped reads/mutations, safe deep links, HTML escaping, rate limits, provider error redaction.
Tests: ownership, unread transitions, event dedupe, replay, malformed links, provider failure, preference behavior.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: event matrix; channels; privacy; files; tests; validation; real-delivery evidence/unverified; commit/push; risks.
```

## 14. Reviews

```text
Objective: Complete verified-purchase reviews with truthful aggregation and moderation.
Repo/context: [REPO], reviews schema/action, delivered order items, artist/artwork pages.
Inspect first: current eligibility, unique constraints, delivery state, rating aggregation, edit/delete policy, abuse controls.
Do: enforce buyer ownership and delivered paid item; one review per item; validate content/rating; calculate aggregates from approved records; add report/moderation path.
Don't: allow sellers to review themselves, trust client eligibility, invent ratings, expose reviewer private data, or hard-delete audit evidence casually.
Security: server eligibility query, conditional unique insert, moderation authorization, output escaping, abuse rate limit.
Tests: unpaid/undelivered/non-owner denial, duplicate review, boundaries, moderation, aggregate updates, deleted artwork/order history.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: eligibility/policy; moderation; migration; files; tests; validation; manual checks; commit/push; risks.
```

## 15. Shipping

```text
Objective: Add a minimal auditable dispatch, tracking, and delivery workflow for paid physical artwork.
Repo/context: [REPO], order/orderItem addresses/statuses, seller/admin views, [CARRIER_SCOPE].
Inspect first: address data, privacy, order state machine, seller access, notifications, returns policy, tax/shipping calculation.
Do: agree transitions; store carrier/tracking safely; seller dispatch only owned paid items; buyer view; admin oversight; timestamps/audit events; delivery confirmation policy.
Don't: expose addresses beyond fulfillment need, mark unpaid as shipped, accept arbitrary status jumps, integrate a carrier before approval, or imply insurance/returns guarantees.
Security: least-privilege address display, conditional transitions, validated tracking URLs, audit log, redacted logs.
Tests: cross-seller/buyer denial, unpaid order, invalid transitions/tracking, replay, mixed seller order, notification dedupe.
Validation: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit.
Final report: lifecycle/privacy; migration; files; tests; validation; manual shipment simulation; commit/push; policy gaps.
```

## 16. Portfolio case study

```text
Objective: Turn Giggle Gallery into a concise, truthful portfolio case study based only on verified work.
Repo/context: [REPO], README, MVP status, roadmap, screenshots/evidence at [LOCATION].
Inspect first: current README/docs, git history, deployed flows, validation evidence, known unverified production items, private data and broken links.
Do: explain problem, product identity, architecture, security decisions, major workflows, tests, deployment, tradeoffs, and next work; use sanitized visuals and precise ownership language.
Don't: invent users/revenue/performance, claim real paid flow before verified, publish provider IDs/emails/secrets, or include the real-face test image without consent.
Security: sanitize screenshots/logs and keep all .env/provider/customer data out of git.
Tests: link/spell check; verify every claim against code/docs/evidence; test README rendering.
Validation: npm run typecheck; git diff --check; npm audit; run project checks if code changes unexpectedly.
Final report: narrative changes; verified claims; caveats; files; validation; links/assets; commit/push; next presentation action.
```
