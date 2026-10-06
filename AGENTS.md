<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Node 22 is installed with nvm. Canonical commands are `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, and `npm run dev` (http://localhost:3000).
- The Cloud Agent start script boots local Supabase with the CLI native runtime (`SUPABASE_EXPERIMENTAL_STACK=1`, no Docker) and writes `.env.local` from `supabase status`. `BUSINESS_SEARCH_PROVIDER=mock` and `ENABLE_BRAVE_PROSPECTING=false`, so a search does not call Apify, Brave, or OpenAI. A prompt such as “Dental clinics in Hyderabad” is enough.
- Signup creates an inactive plan, and search stays blocked until that row is active. After creating a local user, run `.cursor/activate-local-plan.sh [email]` (omit the email to update the newest user). Leave production Supabase, PayU, and Apify credentials unset in this environment.
