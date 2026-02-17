# How I Built Sidebar: A RAG Chat App with Claude, Supabase, and Next.js

Sidebar is a chatbot that gives design leadership advice grounded in curated sources. You feed it articles, YouTube talks, and raw text — it chunks and embeds them, then retrieves the most relevant pieces when you ask a question. Claude does the talking, but only using what you've given it.

Here's how the whole thing works, and how you can build your own.

## The idea

Most chatbots either hallucinate freely or require massive fine-tuning. RAG (retrieval-augmented generation) sits in the middle — you keep a searchable library of content, and at query time you find the most relevant pieces and inject them into the prompt. The model answers based on what you've curated, not what it was trained on.

Sidebar is scoped to design leadership: hiring, org design, craft, culture, strategy. But the architecture works for any domain. Swap the content and the system prompt and you have a different advisor entirely.

## The stack

- **Next.js 15** (App Router) for the frontend and API routes
- **Claude Sonnet 4.5** for chat, **Claude Haiku 4.5** for cheap utility tasks
- **Voyage AI** for text embeddings (1024-dim vectors)
- **Supabase** for PostgreSQL + pgvector + auth + row-level security
- **Vercel AI SDK v6** for streaming responses
- **Tailwind v4** + **shadcn/ui** for the interface

## Step 1: Ingestion

Before you can retrieve anything, you need to get content into the system. Sidebar supports three input types: URLs (articles), YouTube videos (transcripts), and raw text.

The pipeline looks like this:

1. **Extract text.** For URLs, fetch the page and strip HTML tags, scripts, navs, and footers. For YouTube, pull the transcript using the `youtube-transcript` package. For raw text, take it as-is.

2. **Deduplicate.** Check if the URL already exists, or hash the first 5000 characters (SHA-256) and check for a matching hash. Skip if it's a duplicate.

3. **Auto-tag.** Send the first 3000 characters to Claude Haiku and ask it to pick 1-3 categories from a fixed list, generate a title, and write a one-line summary. Haiku is fast and cheap — perfect for classification tasks.

4. **Chunk.** Split the text into ~1000 character chunks with 200 characters of overlap. The chunker splits on sentence boundaries so you don't cut mid-thought. Discard anything under 50 characters.

5. **Embed.** Send chunks to Voyage AI's `voyage-3` model in batches of 20. Each chunk becomes a 1024-dimensional vector.

6. **Store.** Insert the source metadata into a `sources` table and the chunks + embeddings into a `chunks` table with an HNSW index for fast similarity search.

The key decisions here: chunk size, overlap, and embedding model. 1000/200 is a reasonable default. Voyage AI's `voyage-3` is good for retrieval tasks. You could swap in OpenAI embeddings or Cohere — just match the vector dimensions in your database schema.

## Step 2: Retrieval

When a user sends a message, you need to find the most relevant chunks from your library.

1. **Embed the query.** Same Voyage AI model, same dimensions.

2. **Vector search.** Call a Supabase RPC function (`match_chunks`) that does cosine similarity against the HNSW index. I use a similarity threshold of 0.35 and return the top 8 matches.

3. **Enrich.** For each matched chunk, fetch the parent source's title, author, and URL. This gives the model enough context to cite properly.

The RPC function in Postgres looks like this:

```sql
create function match_chunks(
  query_embedding vector(1024),
  match_threshold float,
  match_count int
) returns table (id uuid, source_id uuid, content text, similarity float)
as $$
  select id, source_id, content,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$ language sql;
```

The `<=>` operator is pgvector's cosine distance. The HNSW index makes this fast even with thousands of chunks.

## Step 3: Generation

Now you have the user's question and 8 relevant chunks with source attribution. Assemble the prompt and stream a response.

1. **Build the system prompt.** Start with the persona (who the bot is, how it should respond), then append a "Relevant Context from Curated Sources" section with each chunk labeled by source title, author, and URL.

2. **Stream with Claude.** Use the Vercel AI SDK's `streamText()` with Claude Sonnet 4.5. The system prompt tells Claude to cite sources inline using markdown links and include a Sources section at the end.

3. **Persist.** After the response finishes, upsert the full conversation (all messages) to a `conversations` table. On the first exchange, fire off a separate Haiku call to generate a short title for the conversation.

The system prompt engineering matters. I tell Claude to keep answers between 150-250 words, only cite from provided sources (never invent URLs), and end with "Go deeper" follow-up questions. This keeps responses focused and honest about what they know.

## Step 4: Auth and access control

Sidebar uses Supabase Auth with Google OAuth. When a user signs up, a database trigger automatically creates a profile with `status: waitlisted`. An admin manually approves users by flipping the status to `approved`.

Next.js middleware handles the gating: unauthenticated users go to `/login`, unapproved users go to `/waitlist`, and API routes self-validate with a `requireApprovedUser()` helper.

Row-level security on Supabase means users can only read and delete their own conversations. The service role key (used server-side only) bypasses RLS for writes that happen on behalf of users, like saving conversations after a chat response.

## What I'd do differently

**Theme persistence.** Dark/light mode toggle works but doesn't persist across sessions. Would take 5 minutes to add localStorage.

**Streaming title generation.** The conversation title generates after the first response finishes. It could happen in parallel.

**Better chunking.** Sentence-boundary splitting is fine, but semantic chunking (splitting on topic shifts) would improve retrieval quality for longer documents.

**Hybrid search.** Vector search alone misses exact keyword matches. Combining it with full-text search (which Supabase supports natively) would catch more edge cases.

## Build your own

The whole thing is about 15 files of real logic. The core loop is simple: embed content, store vectors, search on query, inject into prompt, stream response. Everything else is UI and auth plumbing.

Pick your domain, curate your sources, write your system prompt, and you have a grounded chatbot that only says what you've taught it.
