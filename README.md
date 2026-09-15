# LeadScout — Find Local Business Prospects with One Prompt

LeadScout is a SaaS platform that helps freelancers, agencies, and sales teams find qualified local business prospects using natural language. Describe the businesses you want to target, and LeadScout searches, normalizes, scores, and qualifies them for you.

## Product Overview

Instead of hours manually scrolling Google Maps, users type a prompt like:

> "Find dental clinics in Hyderabad with at least 50 reviews and no website."

LeadScout interprets the prompt, searches for matching businesses, normalizes the data, scores each prospect (0–100), generates opportunity flags, and presents results in a polished table with filtering, sorting, and CSV export.

## Architecture

```
User prompt
→ OpenAI parses to structured query (Zod-validated)
→ Search record created in Supabase (status: QUEUED)
→ Provider searches for businesses (Apify or Mock)
→ Results normalized & deduplicated
→ Deterministic scoring engine qualifies each business
→ Results stored in Supabase
→ Frontend polls for completion and displays results
```

### Technology Stack

- **Frontend**: Next.js 13 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- **Backend**: Next.js Route Handlers (API routes), Zod validation
- **Database**: Supabase PostgreSQL with Row Level Security
- **Auth**: Supabase Auth (email/password)
- **AI**: OpenAI API (gpt-4o-mini) for natural-language query parsing
- **Business Discovery**: Apify API (with Mock provider fallback for development)
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
| `APIFY_API_TOKEN` | No | Apify API token (falls back to Mock provider) |
| `APIFY_ACTOR_ID` | No | Apify Actor ID for Google Maps scraper |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for callbacks |
| `APP_ENV` | No | Environment flag (development/production) |

**Without `OPENAI_API_KEY`**: Search will return a parse error.
**Without `APIFY_API_TOKEN`**: The Mock provider generates realistic synthetic businesses for development.

## Supabase Setup

The database migration is already applied. Tables created:

- `profiles` — User profile info
- `subscriptions` — Plan info (free trial: 1 search, 20 leads)
- `searches` — Search records with status tracking
- `usage` — Usage tracking per period
- `businesses` — Normalized business data (deduplicated)
- `search_results` — Join table with scoring data
- `provider_runs` — Provider execution tracking

### RLS Policies

All tables have Row Level Security enabled. Users can only access their own data. The `businesses` table is shared (deduplicated across searches) but access is scoped through `search_results` via EXISTS subqueries.

### Auth Configuration

A database trigger (`handle_new_user`) automatically creates a profile and free subscription when a new user signs up. Email confirmation is OFF by default.

## OpenAI Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Set `OPENAI_API_KEY` in your environment
3. The parser uses `gpt-4o-mini` with structured JSON output
4. All AI output is validated with Zod schemas before use

## Apify Setup

1. Create an Apify account at [apify.com](https://apify.com)
2. Get your API token from Settings → Integrations
3. Choose a Google Maps scraper Actor (e.g., "Google Maps Scraper" by Apify)
4. Set `APIFY_API_TOKEN` and `APIFY_ACTOR_ID` in your environment
5. The provider starts an Actor run, polls for completion, and fetches the dataset

### How to Add Bright Data Later

The provider abstraction means you can add a new provider without changing any application logic:

1. Create `lib/providers/brightdata-provider.ts` implementing `BusinessSearchProvider`
2. Update `lib/providers/index.ts` to select the new provider based on environment config
3. No changes needed to UI, scoring, database, or search flow

## Testing

```bash
npx vitest run
```

57 tests covering:
- Scoring engine (category, location, website, rating, review matching)
- Opportunity flag generation
- Qualification reason templates
- Score label thresholds
- Business deduplication
- CSV export with escaping
- Zod schema validation
- Mock provider filtering

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
- [ ] Apify webhook URL configured (if using webhooks)
- [ ] OpenAI API key has sufficient credits
- [ ] RLS enabled on all tables (verified)
- [ ] Service role key NOT exposed in client code

## Known V1 Limitations

- Billing/Stripe integration is not implemented (upgrade buttons are placeholder)
- Google OAuth not configured (email/password only)
- Apify webhook callback not implemented (uses polling instead)
- No saved lead lists or lead notes
- No team accounts
- Website quality assessment is limited (no website = strongest signal)
- Mock provider returns hardcoded Hyderabad dental clinics

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
