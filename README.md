# Sidebar

AI-powered chat for design leadership. Ingest curated content, embed it with Voyage AI, store it in Supabase with pgvector, and chat with Claude using RAG-powered retrieval with citations.

**Live at [sidebar.coach](https://sidebar.coach)**

## Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **AI:** Claude Sonnet 4.5 via Vercel AI SDK v6 (streaming chat), Claude Haiku 4.5 (title generation, auto-tagging)
- **Embeddings:** Voyage AI `voyage-3` (1024-dim vectors)
- **Database:** Supabase (PostgreSQL + pgvector + RLS)
- **Auth:** Supabase Auth with Google OAuth
- **Styling:** Tailwind CSS v4, shadcn/ui (new-york), Radix UI
- **Deployment:** Vercel

## Architecture

```
User -> Next.js App Router -> Claude Sonnet 4.5 (streaming)
                                    |
                              Voyage AI embed query
                                    |
                              Supabase pgvector (cosine similarity)
                                    |
                              Top 8 chunks + source metadata
                                    |
                              Injected into system prompt as context
```

### Ingestion pipeline

```
Content (URL / YouTube / Text)
  -> Extract text
  -> Dedup check (URL or content hash)
  -> Auto-tag with Haiku (categories, title, summary)
  -> Chunk (1000 chars, 200 overlap, sentence-boundary aware)
  -> Embed with Voyage AI (batches of 20)
  -> Store in Supabase (sources + chunks tables)
```

### Retrieval pipeline (hybrid search)

```
User message
  -> In parallel:
     1. Embed with Voyage AI -> cosine similarity (threshold 0.35, top 8 chunks)
     2. Keyword search on source title/author (ilike, top 3 sources)
  -> Merge results, deduplicate by source, cap at 10 chunks
  -> Enrich with source metadata (title, author, URL)
  -> Inject into system prompt
  -> Stream response from Claude Sonnet 4.5
  -> Persist conversation + generate title on first exchange
```

Vector search handles content-level matching. Keyword search catches references to specific authors or source titles that vector search would miss (e.g. "What does Paul Graham say about craft").

## Database schema

| Table | Purpose |
|-------|---------|
| `sources` | Ingested content with metadata, categories, raw text |
| `chunks` | Text chunks with Voyage AI embeddings (1024-dim vectors) |
| `profiles` | User profiles with approval status (waitlisted/approved/rejected) |
| `conversations` | Chat history with JSONB messages per user |

Key infrastructure:
- HNSW index on `chunks.embedding` for fast ANN search
- `match_chunks` RPC for cosine similarity queries
- Row-level security on all tables
- Auto-profile creation trigger on user signup

## Setup

### Prerequisites

- Node.js 18+
- Supabase project with pgvector extension enabled
- Google OAuth configured in Supabase Auth
- Anthropic API key
- Voyage AI API key

### Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
ANTHROPIC_API_KEY=         # Claude API key
VOYAGE_API_KEY=            # Voyage AI API key
NEXT_PUBLIC_SUPABASE_URL=  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key
API_SECRET_KEY=            # API secret (reserved)
```

### Database setup

Run the migrations in order against your Supabase project:

```bash
# In the Supabase SQL editor, run each file:
supabase/migration.sql
supabase/migration-002-ingest-modalities.sql
supabase/migration-003-multi-category.sql
supabase/migration-004-auth-profiles.sql
supabase/migration-005-conversations.sql
```

### Install and run

```bash
npm install
npm run dev
```

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/chat` | RAG chat with streaming response |
| `POST` | `/api/ingest` | Ingest content (URL, YouTube, text) |
| `GET` | `/api/conversations` | List user conversations |
| `GET` | `/api/conversations/[id]` | Get conversation with messages |
| `DELETE` | `/api/conversations/[id]` | Delete a conversation |
| `GET` | `/api/sources/count` | Count of available sources |
| `GET` | `/auth/callback` | Google OAuth callback |

## Auth flow

1. User signs in with Google OAuth at `/login`
2. Supabase creates auth user, trigger creates profile with `status: waitlisted`
3. Admin approves user by setting `profiles.status = 'approved'` in Supabase
4. Middleware enforces: unauthenticated -> `/login`, unapproved -> `/waitlist`
5. API routes self-validate via `requireApprovedUser()`

## Content categories

hiring, craft, org_design, leadership, culture, strategy, career_growth, critique, process, other
