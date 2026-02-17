# Agent Guide

Rules and context for AI agents working on this codebase.

## Project overview

Sidebar is a RAG-powered advisory chatbot for design leadership. Users chat with Claude, which retrieves relevant context from curated, embedded content stored in Supabase with pgvector. The app runs on Next.js 15 (App Router) with React 19 and deploys to Vercel.

## Tech stack

- **Next.js 15** with App Router — all pages are client components (`"use client"`)
- **React 19** — uses `useChat` from `@ai-sdk/react` for streaming chat
- **Vercel AI SDK v6** — `streamText` and `generateText` from the `ai` package, `@ai-sdk/anthropic` provider
- **Supabase** — PostgreSQL with pgvector, RLS, and cookie-based auth via `@supabase/ssr`
- **Tailwind CSS v4** — PostCSS-based, no `tailwind.config.js`, theme defined in `app/globals.css`
- **shadcn/ui** — new-york style, components live in `components/ui/`
- **Radix UI** — headless primitives used by shadcn components

## Key conventions

### File structure

```
app/                    # Next.js App Router pages and API routes
  api/                  # API routes (chat, ingest, conversations)
  auth/                 # OAuth callback
components/             # App-level components
  ui/                   # shadcn/ui primitives (do not edit without reason)
lib/                    # Utilities, clients, constants
  supabase/             # Supabase client variants (browser, server, middleware)
supabase/               # Database migrations (sequential, manually applied)
scripts/                # One-off maintenance scripts
public/                 # Static assets (logos)
```

### Patterns to follow

- **API responses:** Use `Response.json()` — not `NextResponse.json()` or `new Response(JSON.stringify(...))`
- **Auth checks:** Every API route starts with `requireApprovedUser()` from `lib/supabase/auth.ts`
- **Supabase clients:** Use the right client for the context:
  - `lib/supabase/client.ts` — browser (client components)
  - `lib/supabase/server.ts` — server routes with cookie-based user auth (RLS applies)
  - `lib/supabase.ts` — service role admin client (bypasses RLS, use for writes on behalf of users)
- **Styling:** Tailwind utility classes only. No CSS modules, no styled-components. Use `cn()` from `lib/utils.ts` for conditional classes.
- **Icons:** Lucide React (`lucide-react`) — import individual icons
- **Components:** Prefer editing existing components over creating new ones. shadcn/ui components in `components/ui/` are customized (e.g. DropdownMenuItem padding, Input focus states, Sheet close button) — review before overwriting with stock shadcn.

### Models

- **Chat:** `claude-sonnet-4-5-20250929` via `@ai-sdk/anthropic` — main conversational AI
- **Title generation:** `claude-haiku-4-5-20251001` — generates 3-6 word conversation titles
- **Auto-tagging:** `claude-haiku-4-5-20251001` — classifies ingested content into categories
- **Embeddings:** Voyage AI `voyage-3` (1024 dimensions) — called directly via fetch to `https://api.voyageai.com/v1/embeddings`

Use Haiku for lightweight generative tasks (tagging, titling, classification). Use Sonnet for user-facing chat.

### Database

Migrations live in `supabase/` and are applied manually via the Supabase SQL editor. They are numbered sequentially. Do not modify existing migrations — create new ones.

Tables: `sources`, `chunks`, `profiles`, `conversations`. All have RLS enabled. The `chunks` table has an HNSW index on the `embedding` column for vector search.

The `match_chunks` RPC performs cosine similarity search. The chat route uses hybrid retrieval: vector search on chunks (via `match_chunks`) runs in parallel with keyword search on `sources.title` and `sources.author` (via `ilike`). Results are merged and deduplicated before being injected into the system prompt.

### Environment variables

Required in `.env.local` (see `.env.local.example`):
- `ANTHROPIC_API_KEY` — Claude API
- `VOYAGE_API_KEY` — Voyage AI embeddings
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin key

### Deployment

Deployed to Vercel via GitHub integration. Pushing to `main` on `origin` (github.com/rfinch11/sidebar) triggers a production deploy automatically.

**Workflow:** Use the `/ship` custom command to build, commit, and push in one step. Use `/test` to start the local dev server.

### Custom commands

- **`/test`** — Kills port 3000 and starts `npm run dev`
- **`/ship`** — Runs `npm run build`, stages changed files, commits with a concise message, and pushes to `origin main` to trigger a Vercel production deploy

### Common tasks

**Add a new API route:** Create `app/api/<name>/route.ts`. Start with `requireApprovedUser()`. Use `Response.json()` for responses.

**Add a new component:** Place in `components/`. Use Tailwind classes, `cn()` for conditionals, Lucide for icons.

**Add a shadcn component:** Run `npx shadcn@latest add <component>`. Review and customize to match existing style (e.g. padding, focus states, dark mode).

**Create a new migration:** Add a new `supabase/migration-NNN-<name>.sql` file. Apply manually in Supabase SQL editor.

**Ingest content:** Use the `/ingest` page in the app, or `POST /api/ingest` with `{ type, url/title/text }`.
