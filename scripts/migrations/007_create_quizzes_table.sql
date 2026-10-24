-- ==============================================================================
-- Migration: 007_create_quizzes_table.sql
-- Description: Creates the 'quizzes' CMS table storing quiz metadata as columns
-- and questions organized by language in a unified JSONB column:
--   { "en": [...], "hi": [...], "pt": [...] }
-- ==============================================================================

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,                             -- Canonical slug (e.g. '64-day-01')
  title TEXT NOT NULL,                             -- Quiz title
  category TEXT NOT NULL,                          -- e.g. '64-principles', 'bhagavad-gita'
  description TEXT,                                -- Study notes / description
  difficulty TEXT DEFAULT 'medium',                -- 'easy' | 'medium' | 'hard'
  time_limit INTEGER DEFAULT 720,                  -- in seconds (e.g. 720 = 12 mins)
  on_time_expiry TEXT DEFAULT 'submit-partial',    -- 'submit-partial' | 'block-submit'
  questions JSONB NOT NULL DEFAULT '{"en": []}'::jsonb, -- Unified multilingual questions: { en: [...], hi: [...], pt: [...] }
  author_name TEXT,                                -- Devotee or study circle attribution
  is_published BOOLEAN DEFAULT true,               -- Published vs Draft
  tags TEXT[] DEFAULT '{}',                        -- Search & filtering tags
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Author / teacher / admin
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups & category filtering
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quizzes_updated_at ON quizzes(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view quizzes (public quiz taking and directory)
DROP POLICY IF EXISTS "Public can view quizzes" ON quizzes;
CREATE POLICY "Public can view quizzes"
ON quizzes FOR SELECT
USING (true);

-- 2. Allow quiz creation
DROP POLICY IF EXISTS "Allow quiz creation" ON quizzes;
CREATE POLICY "Allow quiz creation"
ON quizzes FOR INSERT
WITH CHECK (true);

-- 3. Allow quiz update
DROP POLICY IF EXISTS "Allow quiz update" ON quizzes;
CREATE POLICY "Allow quiz update"
ON quizzes FOR UPDATE
USING (true)
WITH CHECK (true);
