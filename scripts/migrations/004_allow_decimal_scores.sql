-- ==============================================================================
-- Migration 004: Allow Decimal Scores in quiz_attempts
-- Handles dependent views: devotee_global_leaderboard & series_leaderboard_view
-- Copy and run all lines below in your Supabase SQL Editor:
-- ==============================================================================

-- 1. Temporarily drop dependent views
DROP VIEW IF EXISTS devotee_global_leaderboard CASCADE;
DROP VIEW IF EXISTS series_leaderboard_view CASCADE;

-- 2. Alter column types to NUMERIC
ALTER TABLE quiz_attempts 
  ALTER COLUMN score TYPE NUMERIC(8,2) USING score::numeric(8,2),
  ALTER COLUMN max_score TYPE NUMERIC(8,2) USING max_score::numeric(8,2);

-- 3. Re-create View 1: Global Devotee Leaderboard
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
  WHERE user_id IS NOT NULL AND user_id::text NOT LIKE 'guest_%'
  ORDER BY user_id, quiz_id, score DESC, time_taken ASC
),
devotee_aggregates AS (
  SELECT
    ba.user_id,
    COUNT(DISTINCT ba.quiz_id) AS total_quizzes,
    SUM(ba.score) AS total_score,
    SUM(ba.max_score) AS total_max,
    ROUND(
      AVG(
        CASE 
          WHEN ba.max_score > 0 THEN (ba.score::numeric / ba.max_score::numeric) * 100 
          ELSE 0 
        END
      ), 1
    ) AS accuracy_pct,
    MAX(ba.completed_at) AS last_active
  FROM best_attempts ba
  GROUP BY ba.user_id
)
SELECT
  da.user_id,
  COALESCE(p.full_name, 'Anonymous Seeker') AS full_name,
  p.avatar_url,
  p.email,
  da.total_quizzes,
  da.total_score,
  da.total_max,
  da.accuracy_pct,
  da.last_active
FROM devotee_aggregates da
LEFT JOIN profiles p ON p.id = da.user_id;

-- 4. Re-create View 2: Series Standings View
CREATE OR REPLACE VIEW series_leaderboard_view AS
SELECT 
  qa.user_id,
  sr.series_id,
  COALESCE(p.full_name, 'Anonymous Seeker') AS full_name,
  p.avatar_url,
  COUNT(DISTINCT sr.day_number) AS days_attended,
  SUM(qa.score) AS total_points,
  SUM(qa.max_score) AS total_max_points,
  ROUND(
    AVG(
      CASE 
        WHEN qa.max_score > 0 THEN (qa.score::numeric / qa.max_score::numeric) * 100 
        ELSE 0 
      END
    ), 1
  ) AS avg_accuracy,
  MAX(qa.completed_at) AS last_submission
FROM quiz_attempts qa
JOIN quiz_series_rounds sr ON sr.quiz_id = qa.quiz_id
LEFT JOIN profiles p ON p.id = qa.user_id
WHERE qa.user_id IS NOT NULL AND qa.user_id::text NOT LIKE 'guest_%'
GROUP BY qa.user_id, sr.series_id, p.full_name, p.avatar_url;
