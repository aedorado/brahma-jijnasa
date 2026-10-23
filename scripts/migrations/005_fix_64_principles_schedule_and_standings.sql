-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Migration 005: Fix 64 Principles Schedule, Standings & Pre-Launch Rounds
--
-- 1. Sets Series start_date to 23rd October 2026, 6:55 PM IST (18:55:00+05:30) for 33 total days
-- 2. Renames round quiz_ids to '64-day-01' ... '64-day-30' (removes 'sandbox-demo' placeholder)
--    NOTE: Removing 'sandbox-demo' immediately clears phantom standings.
-- 3. Sets clean titles 'Day 1' .. 'Day 30' without premature book subtitles/descriptions
-- 4. Inserts D-3, D-2, D-1 official series rounds, unlocking at standard 6:55 PM IST each day:
--    - Day -2 (D-3): 2026-10-23 18:55:00+05:30 (20 questions on Śrī Dāmodarāṣṭakam)
--    - Day -1 (D-2): 2026-10-24 18:55:00+05:30 (12 questions on Foreword)
--    - Day 0  (D-1): 2026-10-25 18:55:00+05:30 (12 questions on Introduction)
-- 5. Updates series_leaderboard_view so all 33 rounds officially count on the leaderboard.
-- ==============================================================================

-- 1. Update Series Metadata
UPDATE quiz_series
SET
  title = 'Reflections on Sacred Teachings — Śrīla Bhaktisiddhānta''s Principles for Community',
  subtitle = 'A 33-Day Spiritual Journey (D-3 to D-1 Preparation & Principles 1–30)',
  description = 'Explore the foundational community guidelines and spiritual instructions given by His Divine Grace Śrīla Bhaktisiddhānta Sarasvatī Gosvāmī Ṭhākura Prabhupāda, as illumined in Reflections on Sacred Teachings V by His Holiness Bhakti Tirtha Swami Maharaja, starting with three foundational study rounds on Śrī Dāmodarāṣṭakam, the Foreword, and the Introduction.',
  category = '64-principles',
  total_days = 33,
  start_date = '2026-10-23 18:55:00+05:30',
  end_date = '2026-11-25 00:00:00+05:30',
  is_active = true
WHERE slug = 'sacred-teachings-64-principles';

-- 2. Update all 30 principle rounds with clean Day X titles, real quiz_ids, and 6:55 PM IST unlocks starting Oct 26
WITH target_series AS (
  SELECT id FROM quiz_series WHERE slug = 'sacred-teachings-64-principles' LIMIT 1
)
UPDATE quiz_series_rounds qsr
SET
  quiz_id = '64-day-' || LPAD(qsr.day_number::text, 2, '0'),
  title = 'Day ' || qsr.day_number,
  description = NULL,
  principles_range = NULL,
  shloka_reference = NULL,
  unlock_at = ('2026-10-26 18:55:00+05:30'::timestamptz + ((qsr.day_number - 1) || ' days')::interval),
  is_unlocked = false
FROM target_series
WHERE qsr.series_id = target_series.id AND qsr.day_number > 0;

-- 3. Insert or Update Day -2 (D-3), Day -1 (D-2), and Day 0 (D-1) Series Rounds (unlocking at standard 6:55 PM IST daily)
WITH target_series AS (
  SELECT id FROM quiz_series WHERE slug = 'sacred-teachings-64-principles' LIMIT 1
)
INSERT INTO quiz_series_rounds (series_id, day_number, quiz_id, title, description, principles_range, shloka_reference, unlock_at, is_unlocked)
SELECT 
  target_series.id,
  d.day_number,
  d.quiz_id,
  d.title,
  d.description,
  d.principles_range,
  d.shloka_reference,
  d.unlock_at,
  false
FROM target_series,
(VALUES
  (-2, '64-day-d3', 'Day -2 (D-3): Life & Legacy of HH Bhakti Tirtha Swami', '20 questions on the biographical pastimes, global service, and community leadership of HH Bhakti Tirtha Swami from Black Lotus.', 'D-3 Round (20 Qs)', 'Black Lotus: The Spiritual Journey of an Urban Mystic', '2026-10-23 18:55:00+05:30'::timestamptz),
  (-1, '64-day-d2', 'Day -1 (D-2): Foreword & Foundational Vision', '12 questions on the foundation and emergence of the 64 Community Principles as presented by HH Bhakti Charu Swami.', 'D-2 Round (12 Qs)', 'Foreword by HH Bhakti Charu Swami', '2026-10-24 18:55:00+05:30'::timestamptz),
  (0, '64-day-d1', 'Day 0 (D-1): Introduction & Community Science', '12 questions on the science of relationships, mirror of association, and transcendental hospitals by HH Bhakti Tirtha Swami.', 'D-1 Round (12 Qs)', 'Introduction by HH Bhakti Tirtha Swami', '2026-10-25 18:55:00+05:30'::timestamptz)
) AS d(day_number, quiz_id, title, description, principles_range, shloka_reference, unlock_at)
ON CONFLICT (series_id, day_number) DO UPDATE
SET
  quiz_id = EXCLUDED.quiz_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  principles_range = EXCLUDED.principles_range,
  shloka_reference = EXCLUDED.shloka_reference,
  unlock_at = EXCLUDED.unlock_at,
  is_unlocked = EXCLUDED.is_unlocked;

-- 4. Recreate series_leaderboard_view including all 33 rounds
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
WHERE qa.user_id IS NOT NULL 
  AND qa.user_id::text NOT LIKE 'guest_%'
GROUP BY qa.user_id, sr.series_id, p.full_name, p.avatar_url;
