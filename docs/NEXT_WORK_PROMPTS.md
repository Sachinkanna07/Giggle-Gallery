# Next Work Prompts

Replace bracketed placeholders before use. Every prompt assumes an audit-first workflow and truthful reporting.

## A. Giggle Gallery final paid-flow test with ₹1 artwork

```text
Objective: Verify one complete Giggle Gallery Razorpay test-mode payment using a dedicated ₹1 artwork.

Repository: [GIGGLE_GALLERY_REPO]
Production or preview URL: [URL]

Inspect first: current HEAD/status, payment creation, browser verification, webhook, finalization transaction, order page, seller dashboard, and provider mode. Read docs/GIGGLE_GALLERY_MVP_STATUS.md.

Do: create and publish only a clearly named ₹1 test artwork through the normal seller/admin UI; use Razorpay test mode; capture non-secret evidence for the provider order, payment, webhook, order status, stock, seller revenue, and payout.

Do not: pay for qwsedregthywrteyrut; use live-mode money; expose credentials; edit production rows directly; bypass signatures; weaken auth, stock, or upload checks; claim success without browser, provider, and database evidence.

Validation commands: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit. Also verify duplicate webhook handling and buyer ownership.

Final report: HEAD; environment/provider mode; test artwork; browser result; signature result; webhook result; order/payment/stock/payout result; seller revenue result; files changed; validation; production data modified; cleanup needed; remaining risks.
```

## B. Giggle Gallery cleanup of public test face artwork

```text
Objective: Safely remove or archive the public test artwork qwsedregthywrteyrut after paid-flow evidence is complete.

Repository/context: [GIGGLE_GALLERY_REPO], [DEPLOYMENT_URL], [ADMIN_ACCOUNT]

Inspect first: artwork status, stock, linked order items, payments, payouts, Blob image references, and available admin/product workflows.

Do: prefer a recoverable application/admin workflow; preserve order history and audit references; confirm the exact artwork before acting; document whether the Blob remains retained.

Do not: run direct destructive SQL, delete orders/payments, remove unrelated Blob objects, expose user data, or act before the owner confirms paid-flow evidence is complete.

Validate: artwork no longer appears publicly, historical orders still render safely, seller/admin records remain coherent, and local checks pass for any code change.

Validation commands: npm run typecheck; npm test; npm run build; git diff --check; npm audit. Also verify the public gallery and historical orders in the browser.

Final report: HEAD before/after; exact target; action taken; recoverability; public result; preserved records; files changed; validation; commit; push; production data modified; follow-up.
```

## C. Giggle Gallery final launch checklist

```text
Objective: Decide whether Giggle Gallery is ready for MVP launch using evidence from code, deployment, providers, and manual production flows.

Repository/context: [GIGGLE_GALLERY_REPO], [PRODUCTION_URL], [VERCEL_PROJECT], [PROVIDER_MODE]

Inspect first: git status/log, docs/GIGGLE_GALLERY_MVP_STATUS.md, deployment status, production environment-variable names without values, Google callback configuration, Blob access, Razorpay webhook configuration, Resend status, monitoring, rollback readiness, and the latest paid-flow evidence.

Do: verify public/authenticated routes, security headers, production database connectivity, published-only catalog behavior, seller/admin access, upload callbacks, one completed test-mode payment, webhook replay safety, buyer ownership, stock, seller revenue, and rollback instructions.

Do not: expose secrets, make a live payment, edit production rows directly, weaken CSP/auth/payment/upload rules, treat build success as production proof, delete test data before evidence is recorded, or claim launch readiness with missing provider checks.

Validation commands: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit. Run scoped checks if `.kilo/worktrees` alone breaks repository-wide discovery, and report that separately.

Final report: HEAD; deployment; public HTTP status; auth; database; upload; payment; webhook; email; monitoring; rollback; validation; launch blockers; launch decision GO/NO-GO; production data modified.
```

## D. KISH / Smart Mandi start

```text
Objective: Audit and continue the KISH / Smart Mandi product from its current state, replacing demo-only flows incrementally with secure persisted workflows.

Repository: [KISH_REPO]
Stack/deployment: [STACK_AND_URL]

Inspect first: git status/log, README, frontend entry points, backend routes/models, auth/session/RBAC, database migrations, tests, and current deployment configuration. Produce a feature/data-flow map before editing.

Do: preserve the existing product identity; prioritize server authorization, real persistence, transactional business rules, and a small vertical slice.

Do not: trust client role switching or localStorage as business state; introduce fake AI or simulated success; rewrite everything; expose secrets; start adjacent features without approval.

Validation commands: `.\.venv\Scripts\python.exe -m pytest backend/tests -q`; `npm run build`; plus `[FRONTEND_LINT_OR_TYPECHECK_COMMAND]` if configured. Then verify the selected flow from browser to API to database and back.

Final report: baseline; audited risks; implemented slice; files changed; tests/build; deployment status; manual action; next recommended slice.
```

## E. Portfolio/profile cleanup

```text
Objective: Clean and strengthen [PORTFOLIO_OR_PROFILE] for professional presentation while preserving the owner's voice.

Source/location: [REPO_OR_DOCUMENT]
Target audience/role: [AUDIENCE]

Inspect first: current content, links, project claims, dates, contact details, formatting, accessibility, mobile behavior, and any private information.

Do: remove repetition, clarify outcomes and ownership, verify links and claims, improve hierarchy, and keep wording concise and authentic.

Do not: invent metrics, employers, credentials, testimonials, or project status; expose private contact data; replace the visual identity without approval.

Validation commands: `[SPELLCHECK_COMMAND]`; `[LINK_CHECK_COMMAND]`; and, for code changes, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` when those scripts exist. Also inspect responsive rendering and accessibility basics.

Final report: key improvements; claims verified; files changed; validation; unresolved placeholders; recommended next action.
```

## F. AI SOC project start

```text
Objective: Define and implement the first safe vertical slice of an AI-assisted security operations center project.

Repository/context: [REPO_OR_EMPTY_WORKSPACE]
Users/data sources/deployment: [PLACEHOLDERS]

Inspect first: existing code/docs, threat model, data sensitivity, event sources, tenancy, auth/RBAC, retention, model/provider boundaries, and evaluation needs.

Do: choose one narrow workflow such as ingest -> normalize -> triage suggestion -> analyst approval -> audit log; keep the analyst in control; use synthetic fixtures until real-data handling is approved.

Do not: claim autonomous incident response, execute remediation without explicit approval, ingest secrets/PII casually, hide model uncertainty, or build a broad dashboard before the data contract works.

Validation commands: `[UNIT_TEST_COMMAND]`; `[SECURITY_TEST_COMMAND]`; `[LINT_COMMAND]`; `[TYPECHECK_COMMAND]`; `[BUILD_COMMAND]`. Also run one end-to-end synthetic incident and retain non-sensitive audit-log evidence.

Final report: architecture boundary; threat model; implemented slice; evaluation results; security limitations; files changed; validation; next decision needed.
```

## G. TerraFarm project start

```text
Objective: Audit TerraFarm and deliver its first production-oriented, data-backed workflow.

Repository/context: [TERRAFARM_REPO]
Users, region, data sources, and deployment: [PLACEHOLDERS]

Inspect first: existing product, target farm workflow, user roles, field/crop models, weather or sensor dependencies, offline needs, data ownership, tests, and deployment setup.

Do: preserve useful existing design; select one high-value vertical slice; make recommendations explainable; record source and timestamp for external agricultural data.

Do not: invent agronomic certainty, present generic AI output as expert advice, expose farmer data, add unapproved providers, or rebuild the whole product.

Validation commands: `[DOMAIN_TEST_COMMAND]`; `[AUTHORIZATION_TEST_COMMAND]`; `[LINT_COMMAND]`; `[TYPECHECK_COMMAND]`; `[BUILD_COMMAND]`. Also verify failure/offline states and one end-to-end workflow using non-sensitive data.

Final report: audited baseline; chosen slice; data provenance; safety limitations; files changed; validation; deployment status; next human decision.
```
