# Giggle Gallery

### Art that feels like you.

Giggle Gallery is a full-stack digital art marketplace for discovering original work, collecting fixed-price pieces, following artists, and joining live auctions. It includes the operational layer behind the storefront: seller onboarding, artwork moderation, inventory protection, checkout, fulfillment, notifications, and role-aware dashboards.

This is designed as a connected marketplace system—not only a frontend gallery demo.

[Visit the production site](https://giggle-gallery-pi.vercel.app) · [Explore the source](https://github.com/Sachinkanna07/Giggle-Gallery)

> Payments currently run in Razorpay **test mode**. Authentication is required for personal features such as favorites, collections, checkout, orders, and bidding.

## What you can do

### Buyer / collector

- Sign in with Google through Auth.js.
- Search and filter published artwork by title, artist, medium, style, availability, and price.
- Like artwork, build private collections, and follow artists.
- Add work to a persistent cart and complete server-validated checkout.
- Review owned orders, fulfillment state, and in-app notifications.
- Join scheduled and live auctions with visible bid state and winner checkout.

### Artist / seller

- Submit a seller application and build a public artist profile.
- Upload artwork through a short-lived, seller-owned Blob upload intent.
- Track pending, published, rejected, inventory, orders, earnings, followers, and favorites from the seller dashboard.
- Advance paid orders through valid fulfillment steps.
- Create auction drafts for admin review.

### Admin

- Review seller applications and artwork submissions.
- Publish, reject, or safely unpublish artwork.
- Schedule and monitor auctions.
- Inspect marketplace, order, payment, and fulfillment state without changing payment truth.

### Auctions

- Draft, scheduled, live, payment-pending, sold, unsold, and payment-expired states.
- Server-authoritative minimum bids and increments.
- Visible-tab live polling, bid history, highest-bidder and outbid state.
- Two-minute anti-sniping extension.
- Winner-only payment with a 24-hour payment window.
- Idempotent settlement and reserved-inventory protection.

## Product direction

The interface follows a dark, cinematic gallery direction: art-first editorial layouts, a persistent marketplace header, responsive search/cart/account access, a focused auction room, and mobile navigation that keeps core actions close. Display preferences include density, contrast, interface size, and reduced motion.

## Architecture

\`\`\`mermaid
flowchart TD
  User --> UI[Next.js App Router UI]
  UI --> Actions[Server Actions / Route Handlers]
  Actions --> Core[Auth, Commerce, Moderation, Auction Engine]
  Core --> DB[(PostgreSQL on Neon)]
  Core --> Blob[Vercel Blob]
  Core --> Razorpay[Razorpay test mode]
  Core --> Email[Resend]
\`\`\`

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide |
| Backend | Next.js Server Actions and Route Handlers |
| Database | PostgreSQL on Neon |
| ORM | Drizzle ORM |
| Authentication | Auth.js, Google OAuth |
| Storage | Vercel Blob |
| Payments | Razorpay test mode |
| Email | Resend adapter |
| Testing | Vitest, ESLint, TypeScript |
| Deployment | Vercel |

## Auction engine

Auction inventory is deliberately narrow: only a published, single-stock artwork can be scheduled. Scheduling reserves the artwork and prevents a fixed-price checkout from claiming it at the same time.

\`\`\`text
Artwork: AVAILABLE → RESERVED → SOLD_OUT

Auction: DRAFT → SCHEDULED → LIVE → PAYMENT_PENDING → SOLD

                                  └──────────────→ UNSOLD
                       PAYMENT_PENDING → PAYMENT_EXPIRED
                       
\`\`\`

The server locks and re-checks the auction and artwork before accepting a bid. It calculates the next minimum bid, rejects stale or self-bids, and extends a live auction when a valid bid arrives in the final two minutes. Settlement and winner payment are idempotent; there is no automatic runner-up fallback or reserve-price rule.

## Payment safety

Fixed-price checkout uses server-controlled prices, totals, stock, ownership, and payment state. Razorpay signatures and webhook payloads are verified, duplicate provider events are protected, and seller revenue is derived from paid order items only.

Auction checkout uses the persisted winning amount. Only the winner can pay, the payment deadline is checked, reserved inventory is revalidated, and duplicate payment attempts are protected. Razorpay is configured for test mode; this repository does not claim completed real-money production transactions.

## Security design

The application applies authentication and role-based authorization across buyer, seller, and admin surfaces. Sensitive mutations re-check the active identity server-side. Other controls include IDOR protection, server-side pricing, seller-owned upload verification, inventory locking, payment and webhook signature verification, protected admin actions, public-profile field minimization, winner-only auction checkout, and unique/idempotency constraints.

## Data model

The main persisted entities are \`users\`, \`artist_profiles\`, \`artworks\`, \`artwork_images\`, \`follows\`, \`likes\`, \`saved_artworks\`, \`collections\`, \`orders\`, \`order_items\`, \`payments\`, \`auctions\`, \`auction_bids\`, \`auction_events\`, \`auction_payment_attempts\`, and \`notifications\`.

## Engineering highlights

- Transaction-aware bidding and auction settlement.
- Inventory reservation prevents a fixed-price and auction double sale.
- Idempotent winner payment and provider-event handling.
- One product architecture for buyer, seller, and admin roles.
- Persisted social state for follows, favorites, collections, and notifications.
- Server-authoritative commerce pricing and stock checks.
- Short-lived, seller-scoped upload verification.
- Automated regression coverage for concurrency, moderation, checkout, and payment expiry.

## Testing

The current verified suite contains **214 tests across 28 files**.

Coverage includes authentication and permissions, seller workflows, artwork moderation, cart and checkout rules, payment finalization, follows, notifications, auction bidding and concurrency, auction settlement, payment expiry, and fixed-price regression behavior.

\`\`\`bash
npm run lint
npm run typecheck
npx vitest run --exclude ".kilo/**"
npm run build
npm audit
git diff --check
\`\`\`

## Local development

Requirements: Node.js 22.x and a PostgreSQL-compatible development database.

\`\`\`bash
git clone https://github.com/Sachinkanna07/Giggle-Gallery.git
cd "Giggle-Gallery"
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
\`\`\`

Configure development values in \`.env.local\`; never commit credentials. The environment variable names used by the repository are:

\`DATABASE_URL\` · \`AUTH_SECRET\` · \`AUTH_URL\` · \`AUTH_GOOGLE_ID\` · \`AUTH_GOOGLE_SECRET\` · \`NEXT_PUBLIC_APP_URL\` · \`BLOB_READ_WRITE_TOKEN\` · \`RAZORPAY_KEY_ID\` · \`RAZORPAY_KEY_SECRET\` · \`RAZORPAY_WEBHOOK_SECRET\` · \`IDENTITY_HASH_PEPPER\` · \`EMAIL_PROVIDER\` · \`EMAIL_FROM\` · \`RESEND_API_KEY\` · \`GST_RATE_BPS\` · \`AUCTIONS_ENABLED\` · \`AUCTIONS_TEST_MODE\` · \`CRON_SECRET\`

For database changes:

\`\`\`bash
npm run db:generate
npm run db:migrate
npm run db:verify
\`\`\`

Use the intended environment and database before applying migrations. Do not reset production data or seed a production database casually.

## Project structure

\`\`\`text
app/
  actions/             Server mutations
  api/                 Route handlers and webhooks
  account/             Buyer account experience
  admin/               Moderation and oversight
  artist/              Public artist profiles
  artwork/             Artwork commerce pages
  auctions/            Auction discovery and bidding
  seller/              Seller workspace and tools
  components/          Shared marketplace UI
components/ui/         Reusable interface primitives
db/                    Database client and schema
lib/                   Auth, payments, auction, email, and security logic
drizzle/               Versioned database migrations
docs/                  Product and technical notes
tests/unit/             Vitest regression suite
\`\`\`

## Current status

Giggle Gallery v1 is feature-complete as a portfolio and test-mode marketplace. The application is deployed on Vercel, the core buyer/seller/admin flows are implemented, and the production payment integration remains intentionally test-mode.

## Future extensions

- Seller payouts and KYC.
- Real-money payment rollout after independent release validation.
- Disputes and refunds automation.
- Recommendation models and multi-currency settlement.
- Native mobile application.

## Why this project is interesting

The hard part was not rendering artwork cards. It was coordinating identity, inventory, payments, auctions, concurrency, moderation, seller fulfillment, and social discovery while keeping business decisions on the server. Giggle Gallery is a compact example of how a visually expressive product can still have explicit state transitions, authorization boundaries, and operational safety.

## Author

**Sachin Kanna**
