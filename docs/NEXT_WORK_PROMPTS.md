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

Validate: npm run lint; npm run typecheck; npm test; npm run build; git diff --check; npm audit. Also verify duplicate webhook handling and buyer ownership.

Final report: HEAD; environment/provider mode; test artwork; browser result; signature result; webhook result; order/payment/stock/payout result; seller revenue result; files changed; validation; production data modified; cleanup needed; remaining risks.
```

## B. Giggle Gallery final production polish

```text
Objective: Perform the final production UI, accessibility, mobile, and wording polish without changing marketplace behavior.

Repository: [GIGGLE_GALLERY_REPO]
Target URL: [URL]

Inspect first: git status/log, docs/GIGGLE_GALLERY_MVP_STATUS.md, all public/authenticated pages, responsive breakpoints, keyboard focus, empty/error/loading states, and browser console.

Do: preserve the visual identity; make only small measurable improvements; verify real data states; keep status and payment wording truthful.

Do not: redesign the app, add auctions/services/dependencies, change payment logic, weaken security, use fake data in production, mutate production data, or commit generated/personal files.

Validate: lint, typecheck, unit tests, build, diff check, npm audit, and browser checks at mobile and desktop widths.

Final report: before/after HEAD; pages checked; issues fixed; files changed; browser evidence; validation; known risks; commit; push; production data modified.
```

## C. Giggle Gallery cleanup of public test face artwork

```text
Objective: Safely remove or archive the public test artwork qwsedregthywrteyrut after paid-flow evidence is complete.

Repository/context: [GIGGLE_GALLERY_REPO], [DEPLOYMENT_URL], [ADMIN_ACCOUNT]

Inspect first: artwork status, stock, linked order items, payments, payouts, Blob image references, and available admin/product workflows.

Do: prefer a recoverable application/admin workflow; preserve order history and audit references; confirm the exact artwork before acting; document whether the Blob remains retained.

Do not: run direct destructive SQL, delete orders/payments, remove unrelated Blob objects, expose user data, or act before the owner confirms paid-flow evidence is complete.

Validate: artwork no longer appears publicly, historical orders still render safely, seller/admin records remain coherent, and local checks pass for any code change.

Final report: exact target; action taken; recoverability; public result; preserved records; files changed; validation; production data modified; follow-up.
```

## D. KISH / Smart Mandi start

```text
Objective: Audit and continue the KISH / Smart Mandi product from its current state, replacing demo-only flows incrementally with secure persisted workflows.

Repository: [KISH_REPO]
Stack/deployment: [STACK_AND_URL]

Inspect first: git status/log, README, frontend entry points, backend routes/models, auth/session/RBAC, database migrations, tests, and current deployment configuration. Produce a feature/data-flow map before editing.

Do: preserve the existing product identity; prioritize server authorization, real persistence, transactional business rules, and a small vertical slice.

Do not: trust client role switching or localStorage as business state; introduce fake AI or simulated success; rewrite everything; expose secrets; start adjacent features without approval.

Validate: use the repository's existing backend and frontend commands, then verify the selected flow from browser to API to database and back.

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

Validate: spelling/grammar, link checks, responsive rendering, accessibility basics, and project-specific build/lint commands if code changes.

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

Validate: unit tests for parsing/policy, authorization tests, prompt-injection/adversarial cases, audit-log evidence, build/lint/typecheck, and one end-to-end synthetic incident.

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

Validate: domain rules with fixtures, authorization and persistence, failure/offline states, build/lint/tests, and one end-to-end workflow using non-sensitive data.

Final report: audited baseline; chosen slice; data provenance; safety limitations; files changed; validation; deployment status; next human decision.
```
