-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Migration 012: High-Scale Aggregated Global Devotee Leaderboard
-- 
-- Description:
-- Scales the global devotee leaderboard to seamlessly handle 100,000+ (1 Lakh+)
-- quiz submissions without requiring the web server to fetch raw attempt records.
--
-- All calculations (best-attempt deduplication, accuracy multiplier, 50-point
-- normalized score, and breadth bonus) are evaluated at PostgreSQL engine speed.
--
-- Copy and run all lines below in your Supabase SQL Editor:
-- ==============================================================================

-- 1. High-Performance Composite Index for fast deduplication & scoring
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_dedup_scoring 
ON quiz_attempts(user_id, quiz_id, score DESC, completed_at DESC)
WHERE user_id IS NOT NULL;

-- 2. Drop existing view cleanly
DROP VIEW IF EXISTS devotee_global_leaderboard CASCADE;

-- 3. Re-create View: High-Performance Global Devotee Leaderboard
CREATE OR REPLACE VIEW devotee_global_leaderboard AS
WITH best_attempts AS (
  SELECT DISTINCT ON (user_id, quiz_id)
    user_id,
    quiz_id,
    score,
    max_score,
    time_taken,
    completed_at
  FROM quiz_attempts
  WHERE user_id IS NOT NULL 
    AND quiz_id NOT LIKE 'archived:%'
    AND quiz_id NOT LIKE 'reset:%'
  ORDER BY 
    user_id, 
    quiz_id, 
    (score::numeric / NULLIF(max_score, 0)::numeric) DESC, 
    score DESC
),
user_scores AS (
  SELECT
    user_id,
    quiz_id,
    score,
    max_score,
    time_taken,
    completed_at,
    LEAST(1.0::numeric, GREATEST(0.0::numeric, score::numeric / NULLIF(max_score, 0)::numeric)) AS acc
  FROM best_attempts
),
user_aggregates AS (
  SELECT
    user_id,
    COUNT(DISTINCT quiz_id) AS total_quizzes,
    ROUND(SUM(score)::numeric, 1) AS total_score,
    ROUND(SUM(max_score)::numeric, 1) AS total_max,
    ROUND(
      SUM((40.0 * acc) + (20.0 * acc * acc)) + (COUNT(DISTINCT quiz_id) * 2)
    )::integer AS rating,
    CASE 
      WHEN SUM(max_score) > 0 THEN ROUND((SUM(score)::numeric / SUM(max_score)::numeric) * 100)
      ELSE 0 
    END::integer AS accuracy_pct,
    MAX(completed_at) AS last_active
  FROM user_scores
  GROUP BY user_id
)
SELECT
  ua.user_id,
  COALESCE(p.full_name, 'Anonymous Seeker') AS full_name,
  p.avatar_url,
  p.email,
  ua.rating,
  ua.total_quizzes,
  ua.total_score,
  ua.total_max,
  ua.accuracy_pct,
  ua.last_active
FROM user_aggregates ua
LEFT JOIN profiles p ON p.id = ua.user_id;

-- 4. Re-grant permissions for public reading
GRANT SELECT ON devotee_global_leaderboard TO anon, authenticated, service_role;
