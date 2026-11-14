-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Migration 011: Shift Day 21 Onwards by +1 Day
--
-- Description:
-- Due to no class being held on Saturday, Nov 14, 2026, Day 20 takes place on
-- Sunday, Nov 15, and all subsequent rounds (Day 21 to Day 30) are shifted ahead
-- by 1 day (unlocking at 6:55 PM IST daily).
-- ==============================================================================

WITH target_series AS (
  SELECT id FROM quiz_series WHERE slug = 'sacred-teachings-64-principles' LIMIT 1
)
UPDATE quiz_series_rounds qsr
SET
  unlock_at = ('2026-10-26 18:55:00+05:30'::timestamptz + (qsr.day_number || ' days')::interval)
FROM target_series
WHERE qsr.series_id = target_series.id AND qsr.day_number >= 21;

-- Also extend series end date by 1 day
UPDATE quiz_series
SET end_date = '2026-11-26 00:00:00+05:30'
WHERE slug = 'sacred-teachings-64-principles';

