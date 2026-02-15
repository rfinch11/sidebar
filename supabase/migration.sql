-- Enable pgvector extension
create extension if not exists vector;

-- Sources table
create table sources (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  title text,
  author text,
  category text,
  summary text,
  raw_text text,
  created_at timestamptz default now()
);

-- Chunks table
create table chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  content text,
  chunk_index integer,
  embedding vector(1024),
  created_at timestamptz default now()
);

-- HNSW index for fast approximate nearest-neighbor search
create index on chunks using hnsw (embedding vector_cosine_ops);

-- Row-Level Security
alter table sources enable row level security;
alter table chunks enable row level security;

-- Similarity search function
create or replace function match_chunks(
  query_embedding vector(1024),
  match_threshold float default 0.5,
  match_count int default 8
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.source_id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where 1 - (chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
