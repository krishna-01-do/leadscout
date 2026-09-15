# LeadScout codebase audit

Audit date: 2026-09-15

## Scope and design constraint

The frontend, route handlers, Supabase schema and policies, authentication, OpenAI parser,
provider integration, scoring, CSV export, tests, and deployment configuration were reviewed.
The Bolt-generated UI and interaction design remain the product source of truth; no major UI
or layout changes were made.

## Corrected in this branch

- Upgraded the vulnerable Next.js 13/Vitest toolchain and added a current ESLint setup.
- Replaced service-role authentication checks with validated Supabase user sessions while
  retaining bearer-token compatibility for the existing client.
- Added cookie session refresh and protection for `/app/*` routes.
- Restricted privileged database writes to the backend and added an admin-only client.
- Added atomic quota reservation, idempotent search creation, database-backed rate limiting,
  failure refunds, and uniqueness constraints.
- Replaced unreliable fire-and-forget provider polling with persisted runs, signed Apify
  webhooks, and status-request recovery.
- Removed provider tokens and callback secrets from query strings, and added network timeouts
  and safe errors.
- Removed the silent production mock fallback; mock data now requires explicit local config.
- Migrated prompt parsing to OpenAI Responses strict structured output with validation and
  prompt-injection-resistant instructions.
- Connected the existing advanced-filter UI to the API and enforced minimum and maximum
  rating/review filters.
- Removed unsupported claims about online booking/ordering, corrected empty-category scoring,
  improved deduplication, and neutralized CSV formula injection.

## Intentionally not implemented

- Billing buttons remain placeholders. A payment provider, products, prices, tax policy,
  cancellation rules, and webhook credentials must be chosen before billing can be safely built.
- Google OAuth is not enabled. It requires a Google OAuth client and Supabase provider setup.
- Website-quality crawling, contact enrichment, saved lists, teams, CRM sync, and scheduled
  searches remain roadmap features; the UI does not claim that they are active.

## Operational requirements

- Apply both Supabase migrations before running this branch against a hosted project.
- Configure all variables documented in `.env.example`.
- Use a public HTTPS application URL for Apify callbacks in a real end-to-end search.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `APIFY_API_TOKEN`, and
  `APIFY_WEBHOOK_SECRET` server-only and rotate any credential that has previously appeared in
  a URL or client bundle.
