-- Migration: Multi-category support
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/hydxzyhqhtluxshnevkx/sql)

-- Convert category from text to text[] (array)
-- Existing single values are wrapped into one-element arrays
ALTER TABLE sources
  ALTER COLUMN category TYPE text[]
  USING CASE WHEN category IS NOT NULL THEN ARRAY[category] ELSE NULL END;
