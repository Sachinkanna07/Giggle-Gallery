# Giggle Gallery Feature Roadmap

Last reviewed: 2026-09-19
Baseline: `99bc094`
Production: https://giggle-gallery-pi.vercel.app

## Product direction

Giggle Gallery already has the core of a trustworthy curated marketplace: server-owned identity and roles, seller approval, guarded Blob uploads, artwork moderation, a published-only catalog, persisted cart and orders, Razorpay verification, buyer order ownership, and seller reporting. The next releases should deepen this connected workflow rather than add decorative screens.

Current marketplace patterns support that direction: [Artsy discovery](https://www.artsy.net/find-the-art-you-love) combines saves, follows, alerts, recommendations, and auctions; [Saatchi offers](https://www.saatchiart.com/pages/make-an-offer-on-art-you-love) makes negotiation explicit without charging before acceptance; [Saatchi seller tools](https://www.saatchiart.com/whysell) emphasize portfolio management and shipping support; and a [Singulart listing](https://www.singulart.com/en/artworks/marktplatz-i-marketplace-1651806) foregrounds offers, delivery costs, returns, authenticity, and secure payment. These are references, not reasons to copy their scope or visual identity.

Status meanings: **READY** means implemented with meaningful local coverage; **PARTIAL** means useful foundations exist but the end-to-end workflow is incomplete; **MANUAL TEST NEEDED** means implementation exists but production evidence is missing; **MISSING** means no connected workflow exists; **BUGGY** is reserved for a reproduced defect. No currently inspected feature was classified BUGGY.

Model guidance: **Codex** for bounded implementation and tests; **Claude Sonnet** for product/UX-heavy drafting; **GPT review** for security, payments, race conditions, and release review.

## A. Marketplace core

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Public published-only gallery and artwork detail | READY | P0 | Low | No | Yes | Codex | Final launch checklist |
| Persisted cart and server-priced checkout | READY | P0 | High | No | Yes | GPT review | ₹1 paid-flow test |
| Razorpay verification, webhook idempotency, stock finalization | MANUAL TEST NEEDED | P0 | High | No | Yes | GPT review | ₹1 paid-flow test |
| Buyer-owned order history | READY | P0 | Medium | No | Yes | Codex | Final launch checklist |
| Pending checkout expiry/cleanup | MISSING | P2 | Medium | Maybe | Yes | Codex | Order lifecycle cleanup |
| Refund/reconciliation operations | MISSING | Future | High | Yes | Yes | GPT review | Refund operations design |

## B. Auctions

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Auction domain/schema and invariants | MISSING | Future | High | Yes | No | GPT review | Auction schema planning |
| Timed bidding with atomic highest-bid update | MISSING | Future | High | Yes | Yes | Codex | Auction bidding phase 1 |
| Bid history and bidder privacy | MISSING | Future | High | Yes | Yes | GPT review | Auction bidding phase 1 |
| Automatic close, winner order, payment deadline | MISSING | Future | High | Yes | Yes | GPT review | Auction finalization/payment |
| Live bidding/WebSocket experience | MISSING | Future | High | Maybe | Yes | Claude Sonnet | Live auction experience |
| Auction refunds, KYC, fraud controls | MISSING | Future | High | Yes | Yes | GPT review | Auction compliance design |

## C. Offers

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Buyer offer and seller accept/counter/decline | MISSING | P2 | High | Yes | Yes | Codex | Offers |
| Expiry, withdrawal, competing-offer policy | MISSING | P2 | High | Yes | Yes | GPT review | Offers |
| Accepted-offer checkout with server-owned price | MISSING | P2 | High | Yes | Yes | GPT review | Offers payment bridge |

## D. Wishlist and collections

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Persisted saves and personal collections | READY | P1 | Low | No | Yes | Codex | Wishlist/collections |
| Create, rename, delete, and curate collections | READY | P1 | Low | No | Yes | Codex | Wishlist/collections |
| Collection polish, empty/error states, move between collections | PARTIAL | P1 | Low | No | Yes | Claude Sonnet | Wishlist/collections |
| Public/shareable collections | MISSING | P2 | Medium | Yes | Yes | Codex | Shareable collections |

## E. Search and discovery

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Natural query, category/style/mood/medium/artist/price filters | PARTIAL | P1 | Medium | No | Yes | Codex | Search/filters |
| Sorting by relevance, trend, recency, popularity, and price | PARTIAL | P1 | Low | No | Yes | Codex | Search/filters |
| URL-persisted filters and useful zero-results recovery | PARTIAL | P1 | Low | No | Yes | Claude Sonnet | Search/filters |
| Database-backed scalable search | MISSING | P2 | Medium | Maybe | Yes | Codex | Search scaling |
| Personalized recommendations and alerts | MISSING | P2 | Medium | Yes | Yes | GPT review | Notifications |

## F. Artist profile

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Public artist route, bio, location, discipline, works | READY | P1 | Low | No | Yes | Codex | Public artist profile |
| Follow count, rating, and published works integrity | PARTIAL | P1 | Medium | No | Yes | Codex | Public artist profile |
| Seller-managed profile, links, portrait, statement | PARTIAL | P1 | Medium | Maybe | Yes | Claude Sonnet | Public artist profile |
| Exhibitions, credentials, press, authenticity narrative | MISSING | P2 | Medium | Yes | Yes | Claude Sonnet | Artist profile enrichment |

## G. Reviews and ratings

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Review eligibility after delivered purchase | PARTIAL | P2 | Medium | No | Yes | Codex | Reviews |
| Artwork/artist rating display and aggregation | PARTIAL | P2 | Medium | No | Yes | Codex | Reviews |
| Moderation, abuse reports, seller response | MISSING | P2 | High | Yes | Yes | GPT review | Reviews |

## H. Shipping and fulfillment

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Order status display | PARTIAL | P1 | Medium | No | Yes | Codex | Seller order management |
| Seller dispatch, carrier/tracking, buyer delivery view | MISSING | P2 | High | Yes | Yes | Codex | Shipping |
| Address validation, shipping quote, taxes/duties policy | PARTIAL | P2 | High | Maybe | Yes | GPT review | Shipping |
| Returns, damage claims, proof, refund handoff | MISSING | Future | High | Yes | Yes | GPT review | Returns design |

## I. Notifications

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Persisted notification records for payment events | PARTIAL | P2 | Medium | No | Yes | Codex | Notifications |
| In-app inbox, unread state, deep links | MISSING | P2 | Medium | Maybe | Yes | Codex | Notifications |
| Transactional email delivery and preferences | PARTIAL | P2 | Medium | Maybe | Yes | GPT review | Notifications |

## J. Admin professional tools

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Seller application and artwork moderation | READY | P0 | High | No | Yes | Codex | Final launch checklist |
| Admin order/payment oversight and safe filters | MISSING | P1 | High | No | Yes | Codex | Admin order management |
| User/account moderation and audit trail | MISSING | P2 | High | Yes | Yes | GPT review | Admin trust operations |
| Refund/reconciliation queue | MISSING | Future | High | Yes | Yes | GPT review | Refund operations design |

## K. Analytics

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Seller revenue, paid sales, views, top artworks | PARTIAL | P2 | Medium | No | Yes | Codex | Seller analytics |
| Real time-series analytics and conversion funnel | MISSING | P2 | Medium | Yes | Yes | Codex | Seller analytics |
| Admin GMV, conversion, moderation, failure metrics | MISSING | P2 | Medium | Yes | Yes | GPT review | Admin analytics |
| Privacy-aware product analytics | MISSING | P2 | Medium | Maybe | Yes | GPT review | Product analytics design |

## L. Trust and safety

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Server roles, account status, ownership boundaries | READY | P0 | High | No | Yes | GPT review | Final launch checklist |
| Guarded upload intent and exact Blob URL acceptance | READY | P0 | High | No | Yes | GPT review | Final launch checklist |
| Published-only production catalog and no demo fallback | READY | P0 | High | No | Yes | GPT review | Final launch checklist |
| Durable rate limits and abuse/report workflow | MISSING | P2 | High | Yes | Yes | GPT review | Trust and safety |
| Authenticity/provenance documentation | MISSING | P2 | High | Yes | Yes | GPT review | Provenance design |
| Seller identity/KYC | MISSING | Future | High | Yes | Yes | GPT review | KYC design |

## M. UI and brand

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| Cinematic responsive gallery identity | READY | P0 | Low | No | Yes | Claude Sonnet | Final launch checklist |
| Loading, empty, failure, keyboard, and screen-reader polish | PARTIAL | P1 | Low | No | Yes | Claude Sonnet | Accessibility polish |
| Buyer/seller/admin workflow consistency | PARTIAL | P1 | Low | No | Yes | Claude Sonnet | Workflow polish |
| README and portfolio case study | PARTIAL | P0 | Low | No | No | Claude Sonnet | Portfolio case study |

## N. Performance and production

| Feature | Status | Priority | Risk | DB migration | Manual production test | Model | Build prompt |
|---|---|---:|---:|---:|---:|---|---|
| CI-quality lint, typecheck, unit tests, build, diff check | READY | P0 | Low | No | No | Codex | Final launch checklist |
| Real paid-flow and webhook production evidence | MANUAL TEST NEEDED | P0 | High | No | Yes | GPT review | ₹1 paid-flow test |
| Monitoring, alerting, structured payment/upload errors | PARTIAL | P1 | Medium | Maybe | Yes | GPT review | Observability setup |
| Image optimization, query/index review, load testing | PARTIAL | P2 | Medium | Maybe | Yes | Codex | Performance audit |
| Backup/restore, incident response, rollback drill | MISSING | P1 | High | No | Yes | GPT review | Launch checklist |

## Recommended build order

### P0 — prove and present the current MVP

1. Run the controlled ₹1 Razorpay test-mode paid flow.
2. Preserve evidence, then clean up the public face-image test artwork through an approved workflow.
3. Complete the final launch checklist, including monitoring and rollback evidence.
4. Produce a truthful README/portfolio case study using verified outcomes only.

### P1 — make everyday marketplace operation complete

1. Search/filter URL state and zero-result UX.
2. Public and seller-editable artist profile polish.
3. Seller fulfillment/order management.
4. Admin order/payment oversight.
5. Wishlist/collection workflow polish.

### P2 — improve conversion and retention

1. Offers with explicit expiry and accepted-price checkout rules.
2. In-app/email notifications and preferences.
3. Verified-purchase reviews and moderation.
4. Shipping, tracking, and delivery confirmation.
5. Real seller/admin analytics.

### Future — isolate high-risk market mechanics

Auctions, live bidding, automatic finalization, refunds, disputes, KYC, and payout automation require dedicated threat models, migrations, concurrency tests, provider reconciliation, feature flags, and production runbooks. They must not be folded casually into the existing fixed-price checkout.

## Definition of done for any roadmap item

- The full browser → server authorization → database/provider → browser path works.
- Negative ownership/role/state tests exist, not only happy-path tests.
- Database migrations are reviewed and reversible where practical.
- Payment, inventory, and external side effects are idempotent and reconcilable.
- Production-only checks and human actions are named explicitly.
- No secrets, production exports, scratch files, PDFs, or `.kilo` worktrees enter the commit.
