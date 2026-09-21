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
  minQuizzes: number
  minAccuracy: number
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
    maxRating: 79,
    minQuizzes: 0,
    minAccuracy: 0,
    verseSnippet: 'ādau śraddhā',
    verseMeaning: 'First, the awakening of genuine faith to inquire into transcendent truth',
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
    minRating: 80,
    maxRating: 199,
    minQuizzes: 2,
    minAccuracy: 20,
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
    minRating: 200,
    maxRating: 449,
    minQuizzes: 5,
    minAccuracy: 40,
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
    minRating: 450,
    maxRating: 899,
    minQuizzes: 10,
    minAccuracy: 50,
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
    minRating: 900,
    maxRating: 1699,
    minQuizzes: 20,
    minAccuracy: 60,
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
    minRating: 1700,
    maxRating: 2299,
    minQuizzes: 40,
    minAccuracy: 70,
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
    minRating: 2300,
    maxRating: 2799,
    minQuizzes: 50,
    minAccuracy: 80,
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
    minRating: 2800,
    maxRating: 3499,
    minQuizzes: 60,
    minAccuracy: 85,
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
    maxRating: 999999,
    minQuizzes: 75,
    minAccuracy: 90,
    verseSnippet: 'tataḥ premābhyudañcati',
    verseMeaning: 'Unalloyed supreme love of Godhead; legendary śāstric mastery',
    color: '#FF416C', // Radiant Aurora Gradient
    badgeBg: 'linear-gradient(135deg, rgba(255, 65, 108, 0.18), rgba(255, 215, 0, 0.18))',
    badgeBorder: 'rgba(255, 215, 0, 0.65)',
    glow: 'rgba(255, 65, 108, 0.45)',
  },
]

/**
 * Get devotee level definition based on rating and hard gate criteria (quizzes & accuracy)
 */
export function getDevoteeLevel(
  rating: number,
  totalQuizzes: number = 0,
  accuracyPct: number = 0
): DevoteeLevel {
  const safeRating = Math.max(0, Math.round(rating))
  for (let i = DEVOTEE_LEVELS.length - 1; i >= 0; i--) {
    const lvl = DEVOTEE_LEVELS[i]
    if (
      safeRating >= lvl.minRating &&
      totalQuizzes >= lvl.minQuizzes &&
      accuracyPct >= lvl.minAccuracy
    ) {
      return lvl
    }
  }
  return DEVOTEE_LEVELS[0]
}

export interface UserRatingStats {
  rating: number
  level: DevoteeLevel
  nextLevel: DevoteeLevel | null
  pointsToNext: number
  quizzesToNext: number
  accuracyToNext: number
  progressPct: number
  totalQuizzes: number
  totalEarned: number
  totalMax: number
  accuracyPct: number
}

/**
 * Calculate realistic, grounded rating points from a user's quiz attempts:
 * - Direct point accumulation based on actual quiz scores earned (scaled by accuracy)
 * - Standard 50-point budget per 20-question quiz
 * - 1 quiz with 100% on a 50-pt quiz gives ~60-62 pts
 * - 1 quiz with score < 100% (e.g. 50%) gives ~25 pts
 * - Gated progression across 9 levels requiring up to 75 unique quizzes (peak at 3,500+ pts)
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
      quizzesToNext: nextLevel.minQuizzes,
      accuracyToNext: nextLevel.minAccuracy,
      progressPct: 0,
      totalQuizzes: 0,
      totalEarned: 0,
      totalMax: 0,
      accuracyPct: 0,
    }
  }

  // Deduplicate by quiz_id — keep the best performance per unique quiz
  const bestByQuiz = new Map<string, { score: number; max_score: number; time_taken?: number }>()
  attempts.forEach(att => {
    const current = bestByQuiz.get(att.quiz_id)
    const currentAcc = current ? current.score / (current.max_score || 1) : -1
    const newAcc = (Number(att.score) || 0) / (Number(att.max_score) || 1)
    if (!current || newAcc > currentAcc) {
      bestByQuiz.set(att.quiz_id, {
        score: Number(att.score) || 0,
        max_score: Number(att.max_score) || 1,
        time_taken: att.time_taken,
      })
    }
  })

  let totalEarned = 0
  let totalMax = 0
  let weightedEarnedSum = 0
  const STANDARD_QUIZ_BUDGET = 50

  bestByQuiz.forEach(item => {
    totalEarned += item.score
    totalMax += item.max_score

    const acc = Math.min(1, Math.max(0, item.score / (item.max_score || 1)))
    // Standardize every quiz to a normalized 50-point budget:
    const normalizedScore = acc * STANDARD_QUIZ_BUDGET
    // Scaled by accuracy: 100% accuracy gets 1.2x of score earned, 50% gets 1.0x, 0% gets 0.8x
    const accuracyMultiplier = 0.8 + 0.4 * acc
    weightedEarnedSum += normalizedScore * accuracyMultiplier
  })

  const N = bestByQuiz.size
  const accuracyPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0
  const breadthBonus = N * 2

  const calculatedRating = Math.max(0, Math.round(weightedEarnedSum + breadthBonus))

  const level = getDevoteeLevel(calculatedRating, N, accuracyPct)
  const nextLevel = level.level < 9 ? DEVOTEE_LEVELS[level.level] : null

  let pointsToNext = 0
  let quizzesToNext = 0
  let accuracyToNext = 0
  let progressPct = 100

  if (nextLevel) {
    pointsToNext = Math.max(0, nextLevel.minRating - calculatedRating)
    quizzesToNext = Math.max(0, nextLevel.minQuizzes - N)
    accuracyToNext = Math.max(0, nextLevel.minAccuracy - accuracyPct)

    // Progress percentage combines rating progression and quiz count progression
    const ratingProgress = calculatedRating >= nextLevel.minRating
      ? 1
      : Math.max(0, (calculatedRating - level.minRating) / (nextLevel.minRating - level.minRating || 1))

    const quizProgress = N >= nextLevel.minQuizzes
      ? 1
      : Math.max(0, (N - level.minQuizzes) / (nextLevel.minQuizzes - level.minQuizzes || 1))

    progressPct = Math.min(100, Math.max(0, Math.round(((ratingProgress + quizProgress) / 2) * 100)))
  }

  return {
    rating: calculatedRating,
    level,
    nextLevel,
    pointsToNext,
    quizzesToNext,
    accuracyToNext,
    progressPct,
    totalQuizzes: N,
    totalEarned: Math.round(totalEarned * 10) / 10,
    totalMax: Math.round(totalMax * 10) / 10,
    accuracyPct,
  }
}
