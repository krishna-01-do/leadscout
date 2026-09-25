# ApplyVelocity — Find Local Business Prospects with One Prompt

ApplyVelocity is a SaaS platform that helps freelancers, agencies, and sales teams find qualified local business prospects using natural language. Describe the businesses you want to target, and ApplyVelocity searches, normalizes, scores, and qualifies them for you.

## Product Overview

Instead of hours manually scrolling Google Maps, users type a prompt like:

> "Find dental clinics in Hyderabad with at least 50 reviews and no website."

ApplyVelocity interprets the prompt, searches for matching businesses, normalizes the data, scores each prospect (0–100), generates opportunity flags, and presents results in a polished table with filtering, sorting, and CSV export.

## Architecture

```
User prompt
→ OpenAI parses to structured query (Zod-validated)
→ Search record created in Supabase (status: QUEUED)
→ Quota is reserved atomically in PostgreSQL
→ Provider run starts (Apify webhook, with polling recovery; or explicit local Mock)
→ Results normalized & deduplicated
→ Deterministic scoring engine qualifies each business
→ Results stored in Supabase
→ Frontend polls for completion and displays results
```

### Technology Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- **Backend**: Next.js Route Handlers (API routes), Zod validation
- **Database**: Supabase PostgreSQL with Row Level Security
- **Auth**: Supabase Auth (email/password)
- **AI**: OpenAI Responses API with strict structured output for natural-language query parsing
- **Business Discovery**: Apify API with signed completion webhooks and recovery polling
- **Testing**: Vitest
- **Deployment**: Vercel

### Repository Structure

```
app/
  page.tsx              — Landing page
  layout.tsx            — Root layout with metadata
  login/                — Login page
  signup/               — Signup page
  app/                  — Protected app pages
    layout.tsx          — Auth-gated layout with navigation
    search/             — Main search page
    history/            — Search history
    account/            — Account & usage
  api/
    search/             — Search API routes (create, get, results, export, history)
    usage/              — Usage stats API
  sitemap.ts            — SEO sitemap
  robots.ts             — Robots config

components/
  marketing/            — Landing page sections (hero, features, pricing, FAQ, etc.)
  layout/               — App navigation
  search/               — Search input and progress components
  results/              — Results table with filtering/sorting
  ui/                   — shadcn/ui components
  providers.tsx         — Auth context provider

lib/
  supabase/             — Supabase client/server setup
  ai/                   — OpenAI query parser
  providers/            — Business search provider abstraction (Apify, Mock)
  scoring/              — Deterministic scoring engine & deduplication
  services/             — Search service orchestration
  usage/                — Quota & usage tracking
  export/               — CSV export
  branding.ts           — Centralized product name & pricing config

schemas/
  search.ts             — Zod schemas for search queries

types/
  index.ts              — Shared TypeScript types

supabase/
  migrations/           — Applied via Supabase MCP tools
```

## Local Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (pre-populated) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (pre-populated) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (pre-populated) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for query parsing |
| `OPENAI_MODEL` | No | Parser model; defaults to `gpt-5-mini` |
| `APIFY_API_TOKEN` | For Apify | Apify API token; sent in an authorization header |
| `APIFY_ACTOR_ID` | For Apify | Apify Actor ID for Google Maps scraper |
| `APIFY_WEBHOOK_SECRET` | For Apify | Random callback secret, at least 32 characters |
| `BUSINESS_SEARCH_PROVIDER` | Yes | `apify`, or `mock` only for local development |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for callbacks |
| `APP_ENV` | No | Environment flag (development/production) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | No | Direct support email shown on the Contact Us page |
| `CONTACT_RATE_LIMIT_SECRET` | Yes | Random secret used to hash contact-form IPs for rate limiting |
| `RESEND_API_KEY` | Production | Resend key used to notify support of new messages |
| `CONTACT_FROM_EMAIL` | Production | Sender on a domain verified in Resend |
| `CONTACT_TO_EMAIL` | Production | Inbox that receives Contact Us notifications |
| `PAYU_MERCHANT_KEY` | For PayU | PayU merchant key; store as a Vercel Secret |
| `PAYU_MERCHANT_SALT` | For PayU | PayU merchant salt; store as a Vercel Secret |
| `PAYU_ENVIRONMENT` | For PayU | `test` while testing, then `production` |
| `PAYU_BASIC_AMOUNT_INR` | For PayU | Basic selling price in INR, configured in Vercel |
| `PAYU_PRO_AMOUNT_INR` | For PayU | Pro selling price in INR, configured in Vercel |
| `PAYU_PLUS_AMOUNT_INR` | For PayU | Plus selling price in INR, configured in Vercel |

**Without `OPENAI_API_KEY`**: a complete Business Category and Location in Advanced Filters can still start a search.
There is no implicit mock fallback. To use synthetic data locally, explicitly set
`BUSINESS_SEARCH_PROVIDER=mock`; mock mode is rejected when `APP_ENV=production`.

## Supabase Setup

Apply all migrations in `supabase/migrations/` in filename order. They create:

- `profiles` — User profile info
- `subscriptions` — Plan info (Basic / Pro / Plus; new accounts start inactive until payment)
- `searches` — Search records with status tracking
- `usage` — Usage tracking per period
- `businesses` — Normalized business data (deduplicated)
- `search_results` — Join table with scoring data
- `provider_runs` — Provider execution tracking

### RLS Policies

All tables have Row Level Security enabled. Authenticated clients can read only their own data. Billing, quota, provider-run, business, and result mutations are server-owned. Search quota is reserved atomically and retried requests are idempotent.

### Auth Configuration

A database trigger (`handle_new_user`) automatically creates a profile and free subscription when a new user signs up. Email confirmation is OFF by default.

## OpenAI Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Set `OPENAI_API_KEY` in your environment
3. The parser uses the Responses API and the configured `OPENAI_MODEL`
4. All AI output is validated with Zod schemas before use

## Apify Setup

1. Create an Apify account at [apify.com](https://apify.com)
2. Get your API token from Settings → Integrations
3. Choose a Google Maps scraper Actor (e.g., "Google Maps Scraper" by Apify)
4. Set `APIFY_API_TOKEN` and `APIFY_ACTOR_ID` in your environment
5. Set a public HTTPS `NEXT_PUBLIC_APP_URL`; the provider creates a signed ad-hoc webhook
6. The status endpoint also performs recovery polling if a webhook is delayed

### How to Add Bright Data Later

The provider abstraction means you can add a new provider without changing any application logic:

1. Create `lib/providers/brightdata-provider.ts` implementing `BusinessSearchProvider`
2. Update `lib/providers/index.ts` to select the new provider based on environment config
3. No changes needed to UI, scoring, database, or search flow

## Testing

```bash
npm test
```

Tests cover:
- Scoring engine (category, location, website, rating, review matching)
- Opportunity flag generation
- Qualification reason templates
- Score label thresholds
- Business deduplication
- CSV export with escaping and spreadsheet-formula neutralization
- Zod schema validation
- Mock provider filtering
- PayU payment records and Contact Us messages

## PayU checkout

Verification uses Hosted Checkout's `transaction_amount` / `amt` response fields.
Account automatically reconciles the returned transaction (or the latest pending
payment if no transaction is in the URL), so a customer with a pending payment
should reopen Account rather than pay again. Pending provider states remain
retryable; only confirmed failures are marked failed. Activation still requires
a verified matching amount and the atomic `complete_payu_payment` function.

If a production flow fails, run `supabase/diagnostics.sql` (read-only, not a
migration) and inspect the Vercel function's actual console errors. HTTP request
summaries alone do not identify a database or provider failure. This revision
requires no new migration beyond 004. Search usage INSERT works with both the
original partial unique index and migration 004's replacement.

Profile name/email editing is available on Account. Supabase must confirm email
changes before the sign-in email changes; allow your production `/app/account`
URL in Supabase Auth redirect URLs. A single root AuthProvider keeps navigation
state consistent between marketing and protected pages.

ApplyVelocity uses PayU Hosted Checkout. The browser submits a server-signed checkout form to PayU; the callback then verifies PayU's response hash and calls PayU's Verify Payment API before activating a plan atomically. Set `surl` and `furl` indirectly by setting `NEXT_PUBLIC_APP_URL`; both are generated as `https://your-domain/api/payments/payu/callback`. In PayU Dashboard, create successful and failed payment webhooks pointing to `https://your-domain/api/webhooks/payu`.

First use PayU test credentials and `PAYU_ENVIRONMENT=test`. Add the two INR plan amounts only after deciding your selling prices. Switch to `production` and live PayU credentials only after a successful test payment. The integration grants the plan for 30 days after each successful payment; automatic recurring mandates require PayU subscription approval and are not enabled by this one-time hosted checkout.

PayU requires the customer's real mobile number in Hosted Checkout requests. ApplyVelocity asks for it only after the customer selects a plan, inside the secure-checkout dialog; it is not displayed as a plan field.

## Vercel Deployment

1. Push repository to GitHub
2. Import repository into Vercel
3. Configure environment variables (see table above)
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Deploy
6. Run a smoke test (see below)

### Production Checklist

- [ ] `npm run build` passes
- [ ] All environment variables configured in Vercel
- [ ] Supabase Auth redirect URLs set to production domain
- [ ] `NEXT_PUBLIC_APP_URL` matches production domain
- [ ] `APIFY_WEBHOOK_SECRET` is random and at least 32 characters
- [ ] OpenAI API key has sufficient credits
- [ ] RLS enabled on all tables (verified)
- [ ] Service role key NOT exposed in client code
- [ ] All Supabase migrations through `202609150004_fix_usage_upsert.sql` applied
- [ ] PayU test payment verified before live credentials are used
- [ ] PayU successful and failed webhooks point to `/api/webhooks/payu`
- [ ] Resend sender domain verified and Contact Us notification received

## Known V1 Limitations

- PayU checkout is one-time monthly renewal; automatic recurring mandates are not enabled
- Google OAuth not configured (email/password only)
- Production search requires configured OpenAI, Supabase, and Apify credentials
- No saved lead lists or lead notes
- No team accounts
- Website quality assessment is limited (no website = strongest signal)
- Mock provider returns synthetic Hyderabad dental clinics and is development-only

## Future Roadmap

- Stripe billing integration
- Bright Data provider
- Email/LinkedIn enrichment
- Saved lead lists
- Scheduled searches
- Team accounts
- CRM integrations (HubSpot, Google Sheets)
- AI website opportunity audit
- Contact person discovery
