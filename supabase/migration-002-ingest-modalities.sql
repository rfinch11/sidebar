-- Migration: Multi-modal ingest support
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/hydxzyhqhtluxshnevkx/sql)

-- 1. Make url nullable (text-paste entries won't have one)
ALTER TABLE sources ALTER COLUMN url DROP NOT NULL;

-- 2. Add source type column (existing rows backfilled as 'url')
ALTER TABLE sources ADD COLUMN type text NOT NULL DEFAULT 'url';
ALTER TABLE sources ADD CONSTRAINT sources_type_check
  CHECK (type IN ('url', 'text', 'youtube'));

-- 3. Add content_hash for text-paste dedup
ALTER TABLE sources ADD COLUMN content_hash text;
CREATE UNIQUE INDEX sources_content_hash_unique
  ON sources (content_hash) WHERE content_hash IS NOT NULL;
