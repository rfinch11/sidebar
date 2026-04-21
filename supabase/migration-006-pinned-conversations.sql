-- Migration: Pinned conversations
-- Run this in the Supabase SQL Editor

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
