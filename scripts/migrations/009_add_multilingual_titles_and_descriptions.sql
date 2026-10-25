-- ==============================================================================
-- Migration: 009_add_multilingual_titles_and_descriptions.sql
-- Description:
--   Adds 'titles' and 'descriptions' JSONB columns to the 'quizzes' table
--   to support multilingual titles and study notes:
--     titles: { "en": "...", "hi": "...", "pt": "..." }
--     descriptions: { "en": "...", "hi": "...", "pt": "..." }
-- ==============================================================================

ALTER TABLE quizzes 
  ADD COLUMN IF NOT EXISTS titles JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS descriptions JSONB DEFAULT '{}'::jsonb;

-- Populate default English titles and descriptions from existing columns
UPDATE quizzes
SET 
  titles = jsonb_build_object('en', title),
  descriptions = CASE 
    WHEN description IS NOT NULL AND description != '' 
    THEN jsonb_build_object('en', description) 
    ELSE '{}'::jsonb 
  END
WHERE titles IS NULL OR titles = '{}'::jsonb;

COMMENT ON COLUMN quizzes.titles IS 'Multilingual quiz titles keyed by language code: { "en": "...", "hi": "...", "pt": "..." }';
COMMENT ON COLUMN quizzes.descriptions IS 'Multilingual quiz descriptions / notes keyed by language: { "en": "...", "hi": "...", "pt": "..." }';
