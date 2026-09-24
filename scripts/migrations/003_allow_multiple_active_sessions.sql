-- ==============================================================================
-- Migration: 003_allow_multiple_active_sessions.sql
-- Description: Drops the single-active-session constraint/index on quiz_sessions
-- to allow teachers/admins to run multiple concurrent live quiz rooms.
-- ==============================================================================

-- Drop constraint if created as a table constraint
ALTER TABLE quiz_sessions DROP CONSTRAINT IF EXISTS one_active_session;

-- Drop index if created as a partial unique index
DROP INDEX IF EXISTS one_active_session;

-- Ensure high-performance lookup by active PIN remains
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_pin_active 
ON quiz_sessions(pin) 
WHERE is_active = true;
