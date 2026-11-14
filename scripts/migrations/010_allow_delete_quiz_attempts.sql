-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Migration 010: Quiz Attempt Soft-Archiving & Safety
--
-- Description:
-- Rather than executing destructive physical DELETE operations that permanently
-- destroy audit logs and student history, Brahma Jijñāsā uses non-destructive
-- soft-archiving (prefixing `quiz_id` with `archived:<timestamp>:<original_quiz_id>`
-- and attaching `_archive_meta` audit logs to `answers` JSONB).
--
-- This allows:
-- 1. Immediate unblocking of students for quiz retakes.
-- 2. Clean exclusion from leaderboards, ratings, and series completion checks.
-- 3. Full historical auditability in the Admin Analytics panel.
-- 4. Safe one-click restoration if needed.
--
-- (Optional): If hard deletion is ever needed by DB administrators, the DELETE
-- policy below can be enabled:
-- ==============================================================================

-- Optional DELETE policy for database administrators:
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow deleting quiz attempts" ON quiz_attempts;

CREATE POLICY "Allow deleting quiz attempts"
ON quiz_attempts FOR DELETE
USING (true);
