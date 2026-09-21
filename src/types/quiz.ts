// ============================================
// BRAHMA JIJÑĀSĀ — Quiz Type Definitions
// ============================================

export type Difficulty = 'easy' | 'medium' | 'hard'
export type OnTimeExpiry = 'submit-partial' | 'block-submit'
export type Category =
  | 'bhagavad-gita'
  | 'upanishads'
  | 'vedas'
  | 'mahabharata'
  | 'ramayana'
  | 'puranas'
  | 'caitanya'
  | 'general'

// ——— Question Types ———

export type QuestionType =
  | 'single-choice'
  | 'multiple-select'
  | 'true-false'
  | 'who-am-i'
  | 'who-said-this'
  | 'sequence'
  | 'cause-effect'
  | 'match-pairs'
  | 'odd-one-out'
  | 'assertion-reason'
  | 'case-study'
  | 'what-would-you-do'
  | 'missing-link'
  | 'spot-the-error'
  | 'two-truths-one-false'
  | 'evidence-based'

// ——— Base Question ———

interface BaseQuestion {
  id: number
  type: QuestionType
  question: string
  difficulty: Difficulty
  points: number
  explanation: string
  reference?: string
  shloka?: string         // Devanāgarī text
  transliteration?: string
}

// ——— Specific Question Types ———

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice'
  options: string[]
  correctIndex: number
}

export interface MultipleSelectQuestion extends BaseQuestion {
  type: 'multiple-select'
  options: string[]
  correctIndices: number[]
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false'
  correct: boolean
}

export interface WhoAmIQuestion extends BaseQuestion {
  type: 'who-am-i'
  clues: string[]           // clues[0] = first clue (3pts), clues[1] (2pts), clues[2] (1pt)
  options: string[]
  correctIndex: number
}

export interface WhoSaidThisQuestion extends BaseQuestion {
  type: 'who-said-this'
  quote: string
  context?: string
  options: string[]
  correctIndex: number
}

export interface SequenceQuestion extends BaseQuestion {
  type: 'sequence'
  items: string[]           // items in scrambled order shown to user
  correctOrder: number[]    // indices in correct order
}

export interface CauseEffectQuestion extends BaseQuestion {
  type: 'cause-effect'
  options: string[]
  correctIndex: number
}

export interface MatchPairsQuestion extends BaseQuestion {
  type: 'match-pairs'
  left: string[]
  right: string[]
  correctPairs: [number, number][]  // [leftIndex, rightIndex]
}

export interface OddOneOutQuestion extends BaseQuestion {
  type: 'odd-one-out'
  options: string[]
  correctIndex: number
}

export interface AssertionReasonQuestion extends BaseQuestion {
  type: 'assertion-reason'
  assertion: string
  reason: string
  options: string[]
  correctIndex: number
}

export interface CaseStudyQuestion extends BaseQuestion {
  type: 'case-study'
  scenario: string
  options: string[]
  correctIndex: number
}

export interface WhatWouldYouDoQuestion extends BaseQuestion {
  type: 'what-would-you-do'
  scenario: string
  options: string[]
  correctIndex: number
}

export interface MissingLinkQuestion extends BaseQuestion {
  type: 'missing-link'
  chain: string[]           // e.g. ["Dice game", "?", "War"]
  options: string[]
  correctIndex: number
}

export interface SpotTheErrorQuestion extends BaseQuestion {
  type: 'spot-the-error'
  passage: string
  options: string[]
  correctIndex: number
}

export interface TwoTruthsOneFalseQuestion extends BaseQuestion {
  type: 'two-truths-one-false'
  options: string[]         // exactly 3 options
  correctIndex: number      // index of the false one
}

export interface EvidenceBasedQuestion extends BaseQuestion {
  type: 'evidence-based'
  principle: string
  options: string[]
  correctIndex: number
}

export type Question =
  | SingleChoiceQuestion
  | MultipleSelectQuestion
  | TrueFalseQuestion
  | WhoAmIQuestion
  | WhoSaidThisQuestion
  | SequenceQuestion
  | CauseEffectQuestion
  | MatchPairsQuestion
  | OddOneOutQuestion
  | AssertionReasonQuestion
  | CaseStudyQuestion
  | WhatWouldYouDoQuestion
  | MissingLinkQuestion
  | SpotTheErrorQuestion
  | TwoTruthsOneFalseQuestion
  | EvidenceBasedQuestion

// ——— Quiz File ———

export interface Quiz {
  id: string
  title: string
  category: Category
  description: string
  difficulty: Difficulty
  timeLimit: number             // seconds; 0 = no limit
  onTimeExpiry: OnTimeExpiry
  questions: Question[]
}

export interface QuizMeta {
  id: string
  title: string
  category: Category
  description: string
  difficulty: Difficulty
  timeLimit: number
  onTimeExpiry: OnTimeExpiry
  totalQuestions: number
  filePath: string
}

// ——— Answer Storage ———

export type SingleAnswer   = number | null          // selected index
export type MultiAnswer    = number[]               // selected indices
export type TFAnswer       = boolean | null
export type SequenceAnswer = number[]               // ordered indices
export type PairsAnswer    = [number, number][]     // [leftIndex, rightIndex]
export type WhoAmIAnswer   = { selectedIndex: number | null; cluesRevealed: number }

export type Answer =
  | SingleAnswer
  | MultiAnswer
  | TFAnswer
  | SequenceAnswer
  | PairsAnswer
  | WhoAmIAnswer
  | null

export type AnswerMap = Record<number, Answer>      // questionId -> answer

// ——— Score Result ———

export interface QuestionResult {
  questionId: number
  earned: number
  max: number
  correct: boolean
}

export interface ScoreResult {
  totalEarned: number
  totalMax: number
  percentage: number
  questionResults: QuestionResult[]
}

// ——— Supabase DB Types ———

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role: 'student' | 'admin'
  created_at: string
}

export interface QuizSession {
  id: string
  quiz_id: string
  pin: string
  is_active: boolean
  created_by: string
  started_at: string
  ended_at: string | null
}

export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  session_id: string | null
  score: number
  max_score: number
  time_taken: number | null
  answers: AnswerMap
  completed_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string | null
  avatar_url: string | null
  score: number
  max_score: number
  time_taken: number | null
  completed_at?: string
}

export const CATEGORY_LABELS: Record<Category, string> = {
  'bhagavad-gita': 'Bhagavad Gītā',
  'upanishads':    'Upaniṣads',
  'vedas':         'Vedas',
  'mahabharata':   'Mahābhārata',
  'ramayana':      'Rāmāyaṇa',
  'puranas':       'Purāṇas',
  'caitanya':      'Śrī Caitanya',
  'general':       'General',
}

export const CATEGORY_ICONS: Record<Category, string> = {
  'bhagavad-gita': '🪷',
  'upanishads':    '🕉️',
  'vedas':         '📜',
  'mahabharata':   '⚔️',
  'ramayana':      '🏹',
  'puranas':       '🌺',
  'caitanya':      '💛',
  'general':       '📚',
}
