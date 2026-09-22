-- ==============================================================================
-- BRAHMA JIJÑĀSĀ — Migration 002: Śrīla Bhaktisiddhānta's Principles for Community (1–30)
-- Source: Reflections on Sacred Teachings V — Śrīla Bhaktisiddhānta's Sixty-four
-- Principles for Community by His Holiness Bhakti Tirtha Swami Maharaja (Hari-nāma Press)
-- Scope: Principles 1–30 (1 Principle per Day for 30 Days of Kārtika)
-- ==============================================================================

-- 1. Update Series Metadata
UPDATE quiz_series
SET
  title = 'Reflections on Sacred Teachings — Śrīla Bhaktisiddhānta''s Principles for Community',
  subtitle = 'A 30-Day Spiritual Journey through Principles 1 to 30',
  description = 'Explore the foundational community guidelines and spiritual instructions (Principles 1–30) given by His Divine Grace Śrīla Bhaktisiddhānta Sarasvatī Gosvāmī Ṭhākura Prabhupāda, as illumined in Reflections on Sacred Teachings V by His Holiness Bhakti Tirtha Swami Maharaja. Each day of Kārtika is dedicated to studying and practicing one essential principle for community transformation.',
  start_date = '2026-10-26 19:05:00+05:30',
  end_date = '2026-11-25 00:00:00+05:30'
WHERE slug = 'sacred-teachings-64-principles';

-- 2. Update all 30 Daily Rounds with Release Schedule (Daily 7:05 PM IST starting 26 Oct 2026)
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
  ('2026-10-26 19:05:00+05:30'::timestamptz + ((d.day_number - 1) || ' days')::interval) AS unlock_at,
  d.is_unlocked
FROM target_series,
(VALUES
  (1, 'bhaktisiddhanta-64-day-01', 'Day 1: The Only Motto of the Gauḍīya Maṭha', 'Śrī Caitanya Mahāprabhu’s instruction in Śikṣāṣṭakam—param vijayate śrī-kṛṣṇa-saṅkīrtanam—is our sole life and motto.', 'Principle 1', 'Principle 1 (Reflections on Sacred Teachings V)', false),
  (2, 'bhaktisiddhanta-64-day-02', 'Day 2: Śrī Kṛṣṇa as the Sole Enjoyer', 'The Supreme Personality of Godhead, Śrī Kṛṣṇa, is the only enjoyer; everyone and everything else is the object of His pleasure.', 'Principle 2', 'Principle 2 (Reflections on Sacred Teachings V)', false),
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
) AS d(day_number, quiz_id, title, description, principles_range, shloka_reference, is_unlocked)
ON CONFLICT (series_id, day_number) DO UPDATE
SET
  quiz_id = EXCLUDED.quiz_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  principles_range = EXCLUDED.principles_range,
  shloka_reference = EXCLUDED.shloka_reference,
  unlock_at = EXCLUDED.unlock_at;
