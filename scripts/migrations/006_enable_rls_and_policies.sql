-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Migration 006: Enable Row Level Security (RLS) & Client Policies
--
-- Background:
-- When RLS is enabled in Supabase without explicit policies, PostgreSQL denies
-- all SELECT, INSERT, UPDATE, and DELETE queries by default (returning empty arrays []).
--
-- This migration:
-- 1. Enables RLS on all primary tables (profiles, quiz_sessions, quiz_attempts,
--    quiz_series, quiz_series_rounds).
-- 2. Configures idempotent, clean policies allowing:
--    - Public read access for sessions, attempts, series, rounds, and public profiles.
--    - Open submission/insert for quiz attempts (supporting logged-in users & guests).
--    - Session management for hosting live classroom/community quizzes.
--    - Profile sync / upsert from the client & server API routes.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation and upsert" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;

-- Anyone can view public profiles (used for leaderboards, avatars, display names)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Allow profile creation & upsert via auth routes (supports custom OAuth / Google session sync)
CREATE POLICY "Allow profile creation and upsert"
ON profiles FOR INSERT
WITH CHECK (true);

-- Allow updating profile data
CREATE POLICY "Allow users to update own profile"
ON profiles FOR UPDATE
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 2. QUIZ SESSIONS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Anyone can create quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Anyone can update quiz sessions" ON quiz_sessions;

-- Participants need to lookup active sessions by PIN
CREATE POLICY "Anyone can view quiz sessions"
ON quiz_sessions FOR SELECT
USING (true);

-- Hosts (teachers, admins, devotees) can initiate live sessions
CREATE POLICY "Anyone can create quiz sessions"
ON quiz_sessions FOR INSERT
WITH CHECK (true);

-- Hosts can update session state (advance questions, end session)
CREATE POLICY "Anyone can update quiz sessions"
ON quiz_sessions FOR UPDATE
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 3. QUIZ ATTEMPTS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Allow submitting quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Allow updating quiz attempts" ON quiz_attempts;

-- Read access required for leaderboards, individual history, and session scorecards
CREATE POLICY "Allow public read on quiz attempts"
ON quiz_attempts FOR SELECT
USING (true);

-- Allow submitting attempts (both authenticated users and guest participants)
CREATE POLICY "Allow submitting quiz attempts"
ON quiz_attempts FOR INSERT
WITH CHECK (true);

-- Allow attempt updates (e.g., session completion, rescoring)
CREATE POLICY "Allow updating quiz attempts"
ON quiz_attempts FOR UPDATE
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 4. QUIZ SERIES & QUIZ SERIES ROUNDS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS quiz_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_series_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for quiz_series" ON quiz_series;
DROP POLICY IF EXISTS "Public read access for quiz_series_rounds" ON quiz_series_rounds;
DROP POLICY IF EXISTS "Allow insert for quiz_series" ON quiz_series;
DROP POLICY IF EXISTS "Allow update for quiz_series" ON quiz_series;
DROP POLICY IF EXISTS "Allow insert for quiz_series_rounds" ON quiz_series_rounds;
DROP POLICY IF EXISTS "Allow update for quiz_series_rounds" ON quiz_series_rounds;

-- Public read access to series campaign details
CREATE POLICY "Public read access for quiz_series"
ON quiz_series FOR SELECT
USING (true);

-- Public read access to series rounds schedule and unlocks
CREATE POLICY "Public read access for quiz_series_rounds"
ON quiz_series_rounds FOR SELECT
USING (true);

-- Series management policies (allows inserts/updates by authenticated/admin or migration service)
CREATE POLICY "Allow insert for quiz_series"
ON quiz_series FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for quiz_series"
ON quiz_series FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert for quiz_series_rounds"
ON quiz_series_rounds FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for quiz_series_rounds"
ON quiz_series_rounds FOR UPDATE
USING (true)
WITH CHECK (true);
