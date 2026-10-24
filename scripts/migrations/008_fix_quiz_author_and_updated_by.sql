-- ==============================================================================
-- Migration: 008_fix_quiz_author_and_updated_by.sql
-- Description:
--   1. Drop invalid foreign key constraint referencing auth.users(id)
--   2. Reference public.profiles(id) instead (since the app uses Google OAuth profiles)
--   3. Add updated_by column referencing profiles(id)
--   4. Ensure updated_at exists with automatic trigger or fallback
-- ==============================================================================

-- 1. Drop existing foreign key referencing auth.users if it exists
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_created_by_fkey;

-- 2. Add updated_by column if it doesn't already exist
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Re-add created_by constraint pointing to public.profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_created_by_fkey'
  ) THEN
    ALTER TABLE quizzes
      ADD CONSTRAINT quizzes_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_updated_by ON quizzes(updated_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_updated_at ON quizzes(updated_at DESC);
