-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Database Performance & Quiz Series Migration
-- 1. High-concurrency composite indexes (handles 100+ concurrent classroom users)
-- 2. Series & Multi-day Campaign Tables (quiz_series, quiz_series_rounds)
-- 3. High-performance aggregated views (devotee_global_leaderboard, series_leaderboard_view)
-- 4. Seed Data: Kārtika Series — "Reflection on Sacred Teachings: 64 Principles"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HIGH-CONCURRENCY INDEXES FOR 100+ CONCURRENT USERS
-- ------------------------------------------------------------------------------

-- PIN Verification spike at session start (e.g. 100 students joining at once)
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_pin_active 
ON quiz_sessions(pin) 
WHERE is_active = true;

-- Fast attempt lookups by user and session
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_session 
ON quiz_attempts(user_id, session_id) 
WHERE session_id IS NOT NULL;

-- Fast session ranking queries without full table scans
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_session_leaderboard 
ON quiz_attempts(session_id, score DESC, time_taken ASC);

-- Sandbox & solo attempt lookup speed
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz_null_session 
ON quiz_attempts(user_id, quiz_id) 
WHERE session_id IS NULL;

-- Chronological ordering for recency queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at 
ON quiz_attempts(completed_at DESC);

-- Fast foreign key profile lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id 
ON quiz_attempts(user_id);


-- ------------------------------------------------------------------------------
-- 2. QUIZ SERIES & CAMPAIGN TABLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quiz_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT DEFAULT 'puranas',
  total_days INT NOT NULL DEFAULT 30,
  banner_url TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_series_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES quiz_series(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  quiz_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  principles_range TEXT,               -- e.g. "Principles 1–4: Sheltering at the Lotus Feet of Guru"
  shloka_reference TEXT,               -- authentic verse reference e.g. "Bhakti-rasāmṛta-sindhu 1.2.74"
  unlock_at TIMESTAMPTZ,
  is_unlocked BOOLEAN DEFAULT false,
  active_session_id UUID REFERENCES quiz_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(series_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_quiz_series_rounds_series_day 
ON quiz_series_rounds(series_id, day_number);

-- Enable RLS
ALTER TABLE quiz_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_series_rounds ENABLE ROW LEVEL SECURITY;

-- Public read access policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_series' AND policyname = 'Public read access for quiz_series'
  ) THEN
    CREATE POLICY "Public read access for quiz_series" ON quiz_series FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_series_rounds' AND policyname = 'Public read access for quiz_series_rounds'
  ) THEN
    CREATE POLICY "Public read access for quiz_series_rounds" ON quiz_series_rounds FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_series' AND policyname = 'Admin write access for quiz_series'
  ) THEN
    CREATE POLICY "Admin write access for quiz_series" ON quiz_series FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_series_rounds' AND policyname = 'Admin write access for quiz_series_rounds'
  ) THEN
    CREATE POLICY "Admin write access for quiz_series_rounds" ON quiz_series_rounds FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
    );
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. HIGH-PERFORMANCE DATABASE VIEWS
-- ------------------------------------------------------------------------------

-- View 1: Global Devotee Leaderboard (Aggregated at DB engine speed)
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

-- View 2: Series Standings View
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


-- ------------------------------------------------------------------------------
-- 4. SEED DATA: KĀRTIKA SERIES — 30 PRINCIPLES FOR COMMUNITY (DAYS 1–30)
-- Source: Reflections on Sacred Teachings V — Śrīla Bhaktisiddhānta's Sixty-four
-- Principles for Community by His Holiness Bhakti Tirtha Swami Maharaja (Hari-nāma Press)
-- ------------------------------------------------------------------------------

INSERT INTO quiz_series (slug, title, subtitle, description, category, total_days, is_active)
VALUES (
  'sacred-teachings-64-principles',
  'Reflections on Sacred Teachings — Śrīla Bhaktisiddhānta''s Principles for Community',
  'A 30-Day Spiritual Journey through Principles 1 to 30',
  'Explore the foundational community guidelines and spiritual instructions (Principles 1–30) given by His Divine Grace Śrīla Bhaktisiddhānta Sarasvatī Gosvāmī Ṭhākura Prabhupāda, as illumined in Reflections on Sacred Teachings V by His Holiness Bhakti Tirtha Swami Maharaja. Each day of Kārtika is dedicated to studying and practicing one essential principle for community transformation.',
  'puranas',
  30,
  true
)
ON CONFLICT (slug) DO UPDATE 
SET 
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description;

-- Insert the 30 Daily Rounds for Principles 1–30
WITH target_series AS (
  SELECT id FROM quiz_series WHERE slug = 'sacred-teachings-64-principles' LIMIT 1
)
INSERT INTO quiz_series_rounds (series_id, day_number, quiz_id, title, description, principles_range, shloka_reference, is_unlocked)
SELECT 
  target_series.id,
  d.day_number,
  d.quiz_id,
  d.title,
  d.description,
  d.principles_range,
  d.shloka_reference,
  d.is_unlocked
FROM target_series,
(VALUES
  (1, 'bhaktisiddhanta-64-day-01', 'Day 1: The Only Motto of the Gauḍīya Maṭha', 'Śrī Caitanya Mahāprabhu’s instruction in Śikṣāṣṭakam—param vijayate śrī-kṛṣṇa-saṅkīrtanam—is our sole life and motto.', 'Principle 1', 'Principle 1 (Reflections on Sacred Teachings V)', true),
  (2, 'bhaktisiddhanta-64-day-02', 'Day 2: Śrī Kṛṣṇa as the Sole Enjoyer', 'The Supreme Personality of Godhead, Śrī Kṛṣṇa, is the only enjoyer; everyone and everything else is the object of His pleasure.', 'Principle 2', 'Principle 2 (Reflections on Sacred Teachings V)', true),
  (3, 'sandbox-demo', 'Day 3: Serving Lord Hari to Avoid Spiritual Self-Destruction', 'Anyone who does not engage in the loving service of Lord Hari remains in spiritual ignorance and causes spiritual suicide.', 'Principle 3', 'Principle 3 (Reflections on Sacred Teachings V)', false),
  (4, 'sandbox-demo', 'Day 4: The Indispensable Art of Tolerance in Community', 'Learning genuine tolerance (tṛṇād api sunīcena) is one of the highest and most essential responsibilities of those living in the community.', 'Principle 4', 'Principle 4 (Reflections on Sacred Teachings V)', false),
  (5, 'sandbox-demo', 'Day 5: Rūpānuga Dependence: Glory to the Original Source', 'Followers of Śrī Rūpa Gosvāmī ascribe all credit and glory to the Supreme Lord rather than relying proudly on their own strength.', 'Principle 5', 'Principle 5 (Reflections on Sacred Teachings V)', false),
  (6, 'sandbox-demo', 'Day 6: Undivided Devotion: Renouncing Assorted Religious Pursuits', 'Those who perform mixed or assorted worldly religious activities (karma/jñāna) cannot attain pure unalloyed service to the Supreme Lord.', 'Principle 6', 'Principle 6 (Reflections on Sacred Teachings V)', false),
  (7, 'sandbox-demo', 'Day 7: Becoming United in Purpose to Serve Lord Hari', 'Shedding petty rivalries and self-interest to unite wholeheartedly with one common purpose in the service of Lord Hari.', 'Principle 7', 'Principle 7 (Reflections on Sacred Teachings V)', false),
  (8, 'sandbox-demo', 'Day 8: Where Hari-Kathā Flows is a Place of Pilgrimage', 'Wherever transcendental discussion and chanting about Śrī Kṛṣṇa takes place, that very place is transformed into a sacred holy dhāma.', 'Principle 8', 'Principle 8 (Reflections on Sacred Teachings V)', false),
  (9, 'sandbox-demo', 'Day 9: Carriers of the Dust of Haris Feet', 'We are neither pious nor learned; we are simply carriers of the dust of Lord Hari’s lotus feet, initiated by the holy vow ‘kīrtanīyaḥ sadā hariḥ’.', 'Principle 9', 'Principle 9 (Reflections on Sacred Teachings V)', false),
  (10, 'sandbox-demo', 'Day 10: The Golden Rule: Rectify Yourself, Do Not Criticize Others', 'Cease scrutinizing the faults of other Vaiṣṇavas; direct all attention inward to purify and rectify your own heart and habits.', 'Principle 10', 'Principle 10 (Reflections on Sacred Teachings V)', false),
  (11, 'sandbox-demo', 'Day 11: Serving the Residents of Vraja in Separation', 'Our supreme spiritual aspiration is to serve the eternal residents of Vraja who feel intense separation from Kṛṣṇa upon His departure to Mathurā.', 'Principle 11', 'Principle 11 (Reflections on Sacred Teachings V)', false),
  (12, 'sandbox-demo', 'Day 12: Jagad-Guru Consciousness: The Humble Learner', 'A pure devotee humbly recognizes that everyone is his spiritual master and can teach him; through such extreme humility one truly honors guru-tattva.', 'Principle 12', 'Principle 12 (Reflections on Sacred Teachings V)', false),
  (13, 'sandbox-demo', 'Day 13: The Words of the Vedas Above Mundane Opinions', 'To attain eternal auspiciousness, discard the endless conflicting opinions of mortal minds and take exclusive shelter of revealed Vedic truth.', 'Principle 13', 'Principle 13 (Reflections on Sacred Teachings V)', false),
  (14, 'sandbox-demo', 'Day 14: Pure Desire: Longing Exclusively for Real Auspiciousness', 'Whatever is genuinely auspicious for the soul’s eternal journey toward Kṛṣṇa should be fervently desired and pursued.', 'Principle 14', 'Principle 14 (Reflections on Sacred Teachings V)', false),
  (15, 'sandbox-demo', 'Day 15: The Intimate Devotee: Serving the Followers of Śrī Rūpa', 'An intimate Vaiṣṇava possesses no separate ambition in life other than unconditionally serving the devoted followers of Śrī Rūpa Gosvāmī.', 'Principle 15', 'Principle 15 (Reflections on Sacred Teachings V)', false),
  (16, 'sandbox-demo', 'Day 16: Hearing: The Sole Bridge to Transcendence', 'There is no other avenue of establishing a living connection with the transcendental realm except through submissive hearing (śravaṇam).', 'Principle 16', 'Principle 16 (Reflections on Sacred Teachings V)', false),
  (17, 'sandbox-demo', 'Day 17: The Vital Necessity of Spiritual Shelter', 'The moment we leave or compromise our shelter under the spiritual master, every material circumstance becomes an enemy that attacks us.', 'Principle 17', 'Principle 17 (Reflections on Sacred Teachings V)', false),
  (18, 'sandbox-demo', 'Day 18: Rejecting Flattery in Spiritual Leadership', 'A person who compromises the truth to flatter others for popularity can never become a bonafide guru or authentic preacher.', 'Principle 18', 'Principle 18 (Reflections on Sacred Teachings V)', false),
  (19, 'sandbox-demo', 'Day 19: Freedom from Duplicity: Shunning Deceit at All Costs', 'It is far better to transmigrate through millions of animal species than to be a deceitful hypocrite; only the guileless receive divine mercy.', 'Principle 19', 'Principle 19 (Reflections on Sacred Teachings V)', false),
  (20, 'sandbox-demo', 'Day 20: Simplicity (Saralatā): Vaiṣṇavism in Its Truest Form', 'Vaiṣṇavism is synonymous with simplicity (saralatā); true servants of the paramahaṁsa are thoroughly straightforward and free from guile.', 'Principle 20', 'Principle 20 (Reflections on Sacred Teachings V)', false),
  (21, 'sandbox-demo', 'Day 21: Transforming Degraded Taste: The Highest Philanthropy', 'Saving even one soul from the grip of mahā-māyā by giving them taste for Kṛṣṇa is an infinitely greater service than establishing millions of hospitals.', 'Principle 21', 'Principle 21 (Reflections on Sacred Teachings V)', false),
  (22, 'sandbox-demo', 'Day 22: Guarding the Heart: Rejecting Pleasing Yet Worldly Association', 'No matter how outwardly pleasant someone’s companionship is, if they lack genuine surrender and devotion to Hari, their association must be avoided.', 'Principle 22', 'Principle 22 (Reflections on Sacred Teachings V)', false),
  (23, 'sandbox-demo', 'Day 23: Preaching by Example: Practicing What We Preach', 'Preaching without personal exemplary conduct is merely an empty karma-kāṇḍa ritual devoid of spiritual potency.', 'Principle 23', 'Principle 23 (Reflections on Sacred Teachings V)', false),
  (24, 'sandbox-demo', 'Day 24: Detachment Through Seva to Hari & Devotees', 'Attachment to material household life naturally dissolves not by dry austerity, but by joyfully serving the Supreme Lord and His devotees.', 'Principle 24', 'Principle 24 (Reflections on Sacred Teachings V)', false),
  (25, 'sandbox-demo', 'Day 25: Curing Our Disease: Collecting Unrelated Possessions', 'Our chronic spiritual illness is the urge to collect and hoard objects that have no utility or connection with the service of Lord Kṛṣṇa.', 'Principle 25', 'Principle 25 (Reflections on Sacred Teachings V)', false),
  (26, 'sandbox-demo', 'Day 26: Peons of Mahāprabhu’s Mercy: Not Material Artisans', 'We have not appeared in this world to be mere mundane builders or artisans; we are strictly humble peons distributing Mahāprabhu’s mercy.', 'Principle 26', 'Principle 26 (Reflections on Sacred Teachings V)', false),
  (27, 'sandbox-demo', 'Day 27: The Auspicious Departure: Singing Hari’s Glory at Lifes End', 'Our fleeting sojourn in this mortal body attains glorious perfection if our last breath departs while singing the transcendental names of Lord Hari.', 'Principle 27', 'Principle 27 (Reflections on Sacred Teachings V)', false),
  (28, 'sandbox-demo', 'Day 28: Treasuring the Dust of Śrī Rūpa Gosvāmī', 'The supreme ambition of our existence is to humbly gather the dust of the lotus feet of Śrī Rūpa Gosvāmī, who fulfilled the deepest heart-desire of Mahāprabhu.', 'Principle 28', 'Principle 28 (Reflections on Sacred Teachings V)', false),
  (29, 'sandbox-demo', 'Day 29: The Examination Hall: Navigating the Material Nature', 'This material world, full of opposition to Kṛṣṇa consciousness, is designed as a rigorous examination hall for the souls spiritual maturation.', 'Principle 29', 'Principle 29 (Reflections on Sacred Teachings V)', false),
  (30, 'sandbox-demo', 'Day 30: Instructions for Ultimate Benefit: The Rare Gift of Guidance', 'In every birth one easily receives biological parents, but only by rare good fortune does one receive transcendental instructions for the souls eternal welfare.', 'Principle 30', 'Principle 30 (Reflections on Sacred Teachings V)', false)
) AS d(day_number, principles_range, shloka_reference, is_unlocked)
ON CONFLICT (series_id, day_number) DO UPDATE
SET
  quiz_id = EXCLUDED.quiz_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  principles_range = EXCLUDED.principles_range,
  shloka_reference = EXCLUDED.shloka_reference;
