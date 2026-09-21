// ==============================================================================
// BRAHMA JIJÑĀSĀ — Canonical 9 Devotee Levels & Rating Engine
// Based strictly on Śrīla Rūpa Gosvāmī's Bhakti-rasāmṛta-sindhu (1.4.15–16):
// "ādau śraddhā tataḥ sādhu-saṅgo 'tha bhajana-kriyā
//  tato 'nartha-nivṛttiḥ syāt tato niṣṭhā rucis tataḥ
//  athāsaktis tato bhāvas tataḥ premābhyudañcati..."
// ==============================================================================

export interface DevoteeLevel {
  level: number
  stage: string
  stageDevanagari: string
  title: string
  titleDevanagari: string
  titleEn: string
  minRating: number
  maxRating: number
  verseSnippet: string
  verseMeaning: string
  color: string
  badgeBg: string
  badgeBorder: string
  glow: string
}

export const DEVOTEE_LEVELS: DevoteeLevel[] = [
  {
    level: 1,
    stage: 'Śraddhā',
    stageDevanagari: 'श्रद्धा',
    title: 'Śraddhāvān',
    titleDevanagari: 'श्रद्धावान्',
    titleEn: 'Faithful Inquirer',
    minRating: 0,
    maxRating: 249,
    verseSnippet: 'ādau śraddhā',
    verseMeaning: 'First, the awakening of genuine faith to inquire into truth',
    color: '#A0AEC0', // Slate Gray
    badgeBg: 'rgba(160, 174, 192, 0.12)',
    badgeBorder: 'rgba(160, 174, 192, 0.35)',
    glow: 'rgba(160, 174, 192, 0.25)',
  },
  {
    level: 2,
    stage: 'Sādhu-saṅga',
    stageDevanagari: 'साधु-सङ्ग',
    title: 'Saṅgī',
    titleDevanagari: 'सङ्गी',
    titleEn: 'Sincere Companion',
    minRating: 250,
    maxRating: 499,
    verseSnippet: 'tataḥ sādhu-saṅgo',
    verseMeaning: 'Associating with devotee-teachers and learning in satsaṅga',
    color: '#48BB78', // Forest Green
    badgeBg: 'rgba(72, 187, 120, 0.12)',
    badgeBorder: 'rgba(72, 187, 120, 0.35)',
    glow: 'rgba(72, 187, 120, 0.25)',
  },
  {
    level: 3,
    stage: 'Bhajana-kriyā',
    stageDevanagari: 'भजन-क्रिया',
    title: 'Sādhaka',
    titleDevanagari: 'साधक',
    titleEn: 'Dedicated Practitioner',
    minRating: 500,
    maxRating: 999,
    verseSnippet: "'tha bhajana-kriyā",
    verseMeaning: 'Active, regular execution of devotional study and quizzes',
    color: '#00B5D8', // Cyan / Turquoise
    badgeBg: 'rgba(0, 181, 216, 0.12)',
    badgeBorder: 'rgba(0, 181, 216, 0.35)',
    glow: 'rgba(0, 181, 216, 0.25)',
  },
  {
    level: 4,
    stage: 'Anartha-nivṛtti',
    stageDevanagari: 'अनर्थ-निवृत्ति',
    title: 'Vivekī',
    titleDevanagari: 'विवेकी',
    titleEn: 'Discerning Seeker',
    minRating: 1000,
    maxRating: 1499,
    verseSnippet: "tato 'nartha-nivṛttiḥ syāt",
    verseMeaning: 'Cleansing misconceptions, philosophical errors, and doubts',
    color: '#3182CE', // Oceanic Blue
    badgeBg: 'rgba(49, 130, 206, 0.12)',
    badgeBorder: 'rgba(49, 130, 206, 0.35)',
    glow: 'rgba(49, 130, 206, 0.25)',
  },
  {
    level: 5,
    stage: 'Niṣṭhā',
    stageDevanagari: 'निष्ठा',
    title: 'Niṣṭhāvān',
    titleDevanagari: 'निष्ठावान्',
    titleEn: 'The Steady & Fixed',
    minRating: 1500,
    maxRating: 1999,
    verseSnippet: 'tato niṣṭhā',
    verseMeaning: 'Unshakeable stability and sustained mastery across scripture',
    color: '#9F7AEA', // Amethyst Purple
    badgeBg: 'rgba(159, 122, 234, 0.12)',
    badgeBorder: 'rgba(159, 122, 234, 0.35)',
    glow: 'rgba(159, 122, 234, 0.25)',
  },
  {
    level: 6,
    stage: 'Ruci',
    stageDevanagari: 'रुचि',
    title: 'Rucimān',
    titleDevanagari: 'रुचिमान्',
    titleEn: 'Relisher of Truth',
    minRating: 2000,
    maxRating: 2499,
    verseSnippet: 'rucis tataḥ',
    verseMeaning: 'Spontaneous taste and relish for complex purports and verses',
    color: '#ED8936', // Saffron Flame Orange
    badgeBg: 'rgba(237, 137, 54, 0.12)',
    badgeBorder: 'rgba(237, 137, 54, 0.35)',
    glow: 'rgba(237, 137, 54, 0.25)',
  },
  {
    level: 7,
    stage: 'Āsakti',
    stageDevanagari: 'आसक्ति',
    title: 'Āsakta',
    titleDevanagari: 'आसक्त',
    titleEn: 'Deeply Absorbed',
    minRating: 2500,
    maxRating: 2999,
    verseSnippet: 'athāsaktis',
    verseMeaning: 'Profound attachment and intuitive absorption in the Lord’s pastimes',
    color: '#F56565', // Crimson Red
    badgeBg: 'rgba(245, 101, 101, 0.12)',
    badgeBorder: 'rgba(245, 101, 101, 0.35)',
    glow: 'rgba(245, 101, 101, 0.25)',
  },
  {
    level: 8,
    stage: 'Bhāva',
    stageDevanagari: 'भाव',
    title: 'Bhāvuka',
    titleDevanagari: 'भावुक',
    titleEn: 'Illumined Ecstatic',
    minRating: 3000,
    maxRating: 3499,
    verseSnippet: 'tato bhāvas',
    verseMeaning: 'Awakening of pure spiritual ecstasy and unexcelled śāstric wisdom',
    color: '#ECC94B', // Solar Brilliant Gold
    badgeBg: 'rgba(236, 201, 75, 0.12)',
    badgeBorder: 'rgba(236, 201, 75, 0.45)',
    glow: 'rgba(236, 201, 75, 0.35)',
  },
  {
    level: 9,
    stage: 'Prema',
    stageDevanagari: 'प्रेम',
    title: 'Premī',
    titleDevanagari: 'प्रेमी',
    titleEn: 'Transcendental Master',
    minRating: 3500,
    maxRating: 99999,
    verseSnippet: 'tataḥ premābhyudañcati',
    verseMeaning: 'Unalloyed supreme love of Godhead; legendary śāstric mastery',
    color: '#FF416C', // Radiant Aurora Gradient
    badgeBg: 'linear-gradient(135deg, rgba(255, 65, 108, 0.18), rgba(255, 215, 0, 0.18))',
    badgeBorder: 'rgba(255, 215, 0, 0.65)',
    glow: 'rgba(255, 65, 108, 0.45)',
  },
]

/**
 * Get devotee level definition based on rating number
 */
export function getDevoteeLevel(rating: number): DevoteeLevel {
  const safeRating = Math.max(0, Math.round(rating))
  for (let i = DEVOTEE_LEVELS.length - 1; i >= 0; i--) {
    if (safeRating >= DEVOTEE_LEVELS[i].minRating) {
      return DEVOTEE_LEVELS[i]
    }
  }
  return DEVOTEE_LEVELS[0]
}

export interface UserRatingStats {
  rating: number
  level: DevoteeLevel
  nextLevel: DevoteeLevel | null
  pointsToNext: number
  progressPct: number
  totalQuizzes: number
  totalEarned: number
  totalMax: number
  accuracyPct: number
}

/**
 * Calculate full rating and level statistics from a user's attempt records.
 * Takes the highest score achieved per unique quiz to prevent farming,
 * scales by accuracy %, and awards breadth bonus.
 */
export function calculateUserRating(
  attempts: Array<{
    quiz_id: string
    score: number
    max_score: number
    time_taken?: number
  }>
): UserRatingStats {
  if (!attempts || attempts.length === 0) {
    const level = DEVOTEE_LEVELS[0]
    const nextLevel = DEVOTEE_LEVELS[1]
    return {
      rating: 0,
      level,
      nextLevel,
      pointsToNext: nextLevel.minRating,
      progressPct: 0,
      totalQuizzes: 0,
      totalEarned: 0,
      totalMax: 0,
      accuracyPct: 0,
    }
  }

  // Deduplicate by quiz_id — keep the best performance per quiz
  const bestByQuiz = new Map<string, { score: number; max_score: number }>()
  attempts.forEach(att => {
    const current = bestByQuiz.get(att.quiz_id)
    if (!current || (att.score / (att.max_score || 1)) > (current.score / (current.max_score || 1))) {
      bestByQuiz.set(att.quiz_id, {
        score: Number(att.score) || 0,
        max_score: Number(att.max_score) || 1,
      })
    }
  })

  let totalEarned = 0
  let totalMax = 0

  bestByQuiz.forEach(item => {
    totalEarned += item.score
    totalMax += item.max_score
  })

  const accuracyPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0

  // Rating Formula:
  // Base points earned * (0.6 + 0.4 * accuracy ratio) * 10
  // Plus milestone bonus for breadth of quizzes explored
  const accuracyMultiplier = 0.6 + 0.4 * (accuracyPct / 100)
  const quizBreadthBonus = bestByQuiz.size * 50

  const calculatedRating = Math.round(totalEarned * 10 * accuracyMultiplier + quizBreadthBonus)
  const level = getDevoteeLevel(calculatedRating)
  const nextLevel = level.level < 9 ? DEVOTEE_LEVELS[level.level] : null

  let pointsToNext = 0
  let progressPct = 100

  if (nextLevel) {
    const range = nextLevel.minRating - level.minRating
    const currentOverMin = calculatedRating - level.minRating
    pointsToNext = Math.max(0, nextLevel.minRating - calculatedRating)
    progressPct = Math.min(100, Math.max(0, Math.round((currentOverMin / range) * 100)))
  }

  return {
    rating: calculatedRating,
    level,
    nextLevel,
    pointsToNext,
    progressPct,
    totalQuizzes: bestByQuiz.size,
    totalEarned: Math.round(totalEarned * 10) / 10,
    totalMax,
    accuracyPct,
  }
}
