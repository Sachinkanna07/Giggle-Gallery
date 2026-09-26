# Next work prompts

These are handoff prompts, not assertions that a live payment or browser flow has passed. Replace placeholders before use. Preserve production data and keep auction flags off until the explicit gates in `GIGGLE_GALLERY_MVP_STATUS.md` pass.

## A. Final test-mode auction and ₹1 fixed-price paid-flow test

Objective: With human approval, verify the deployed auction winner flow using only Razorpay test credentials, then separately verify the previously skipped ₹1 paid fixed-price artwork transaction if approved. Repo/context: `[REPO]`, deployment `[URL]`, test accounts `[HOW PROVIDED]`. Inspect first: current HEAD, deployment Ready status, migration journal, environment-variable names and test-key mode, relevant order/payment logs. Do: create test artwork through normal seller/admin UI and use signed provider test payments. Don't: print secrets, edit DB statuses, invent bids/orders, use live credentials, or enable auctions before gates. Validate: lint, typecheck, tests, build, diff check, audit, read-only `db:verify`, manual signed webhook/idempotency and stock/revenue checks. Final report: mode, accounts/flows tested without private details, exact provider result, order/stock outcome, deployment, unresolved issues, no real-money charge.

## B. Remove public test face artwork

Objective: Remove or replace the real-face image on the known test artwork after owner approval. Repo/context: `[REPO]`, artwork `qwsedregthywrteyrut`, owner decision `[DELETE/REPLACE/UNPUBLISH]`. Inspect first: public route, seller/admin ownership and moderation history, any paid/pending orders. Do: use supported UI/server workflow and preserve order history. Don't: delete DB rows, Blob objects, or historical orders blindly. Validate: public route, image URL, buyer-order continuity, build/tests if code changes. Final report: action, affected artwork/image, public visibility, recoverability, verification.

## C. Final launch checklist

Objective: Assess readiness of the deployed fixed-price marketplace and feature-flagged auctions. Repo/context: `[REPO]`, `[URL]`. Inspect first: README, status/design docs, migration journal, current deploy, environment-variable names, recent runtime/webhook errors. Do: verify auth, seller/admin/buyer ownership, upload, browsing, mobile, accessibility, SEO, payment test mode, webhook replay, refunds/reconciliation, and rollback. Don't: claim Ready from local tests alone or turn on live-money auctions. Validate: full local gates plus browser/provider checks. Final report: each gate PASS/FAIL/NOT VERIFIED, production flags, exact blockers, go/no-go decision.

## D. KISH / Smart Mandi start

Objective: Continue the existing KISH Smart Mandi product without replacing its identity. Repo/context: `[REPO]`, `[CURRENT HEAD]`. Inspect first: architecture, backend/API, frontend localStorage/demo state, auth/RBAC, existing tests, dirty worktree. Do: prioritize secure session/API integration and real persistence. Don't: invent data or replace working UI wholesale. Validate: backend pytest, frontend build, auth/role/API browser checks. Final report: implemented, verified, outstanding gates, changed files.

## E. Portfolio/profile cleanup

Objective: Update portfolio and public profile to accurately describe completed work. Repo/context: `[REPO]`, deployed projects `[URLS]`. Inspect first: current portfolio copy and live project states. Do: cite genuine features and security decisions, preserve visual identity. Don't: claim paid-flow, production enablement, uptime, or metrics without evidence. Validate: lint, typecheck/build, link and mobile checks. Final report: copy changed, verified claims, deployment status, remaining factual questions.

## F. AI SOC project start

Objective: Define and implement a safe first increment of an AI-assisted security operations workflow. Repo/context: `[REPO OR NEW REPO]`, data/source permissions `[SCOPE]`. Inspect first: requirements, data sensitivity, existing code, threat model, storage and evaluation constraints. Do: build auditable ingestion, triage evidence, human approval, and tests. Don't: fabricate detections or allow automatic destructive response. Validate: unit/integration tests, access controls, sample-data privacy review, build. Final report: scope, evidence-based results, limitations, security gates, next increment.

## G. TerraFarm project start

Objective: Establish the first useful connected TerraFarm workflow. Repo/context: `[REPO OR NEW REPO]`, users and data sources `[SCOPE]`. Inspect first: existing product, design language, schema/API, deployment target, local tests. Do: preserve identity and implement real persisted user actions. Don't: show fake sensor data, yield, prices, or success messages as real. Validate: tests, lint/typecheck/build, browser persistence and permission checks. Final report: working flow, data provenance, verification, remaining dependencies.
