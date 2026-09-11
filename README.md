# Giggle Gallery

Giggle Gallery is a cinematic, AI-assisted art marketplace built with Next.js 16, Auth.js, Drizzle ORM, Neon Postgres, Vercel Blob, and Razorpay.

## Local setup

1. Use Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill the required values.
3. Run `npm run db:migrate` and `npm run db:seed`.
4. Start the app with `npm run dev`.

The public gallery has a curated fallback when `DATABASE_URL` is absent so builds and visual review remain possible. Account actions, seller tools, orders, uploads, and payment require the configured production services; important business data never falls back to browser storage.

## Google OAuth

Create a Google OAuth web client and add these authorized redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and a cryptographically random `AUTH_SECRET`. The Auth.js adapter links the same Google provider account to the same persisted user. Roles are read server-side from Postgres.

## Database

Provision Neon through the Vercel Marketplace and use its pooled `DATABASE_URL`. The Drizzle schema includes users/profiles, artists/applications, artwork metadata and images, likes/saves/collections/follows, carts, orders/items, payments/payouts, addresses, notifications, reviews, search history, recently viewed records, recommendations, and taste profiles.

Generate a migration after schema changes with `npm run db:generate`. Apply migrations with `npm run db:migrate`. Seed the starter catalog with `npm run db:seed`.

## Artwork storage

Provision Vercel Blob and set `BLOB_READ_WRITE_TOKEN`. Approved sellers upload JPG, PNG, or WebP images directly to Blob through a short-lived, server-authorized upload token. The database stores only image metadata and URLs.

## Razorpay

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Configure the production webhook URL as:

`https://YOUR_DOMAIN/api/webhooks/razorpay`

Subscribe to `payment.captured` and `payment.failed`. Checkout totals, stock, and availability are recalculated on the server. Raw card data is handled only by Razorpay, and an order becomes confirmed only after signature verification or a verified webhook.

## Vercel deployment

Import the repository into Vercel as a Next.js project, provision Neon and Blob, set the environment variables above for Production/Preview, then run the production build. No OpenAI Hosting, Cloudflare Worker, D1, Wrangler, or Vinext runtime is required.

OpenAI is optional. Without `OPENAI_API_KEY`, discovery and Ask Giggle use deterministic metadata scoring and always return real catalog records.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Do not commit `.env*`, `.vercel`, `.next`, uploads, database credentials, OAuth secrets, or payment secrets.
