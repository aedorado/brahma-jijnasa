import type { Quiz, QuizMeta, Question, Difficulty } from '@/types/quiz'
import type { QuizSeriesRound } from '@/types/series'

export interface AdminQuizCreatorProps {
  onQuizPublished: (quizId: string) => Promise<void>
  onSwitchToCatalog: () => void
  onDryRunQuiz?: (quiz: Quiz) => void
  editingQuizId?: string | null
  onClearEditingQuiz?: () => void
  catalogQuizzes?: QuizMeta[]
  initialSeriesDay?: number | null
  onClearInitialSeriesDay?: () => void
}

export type SupportedLang = 'en' | 'hi' | 'pt'
export type EditorFormat = 'markdown' | 'json'

export interface LangConfigItem {
  key: SupportedLang
  label: string
  flag: string
}

export interface LegacyQuizMetadata {
  title?: string
  id?: string
  category?: string
  description?: string
  difficulty?: Difficulty
  timeLimit?: number
  onTimeExpiry?: 'submit-partial' | 'block-submit'
}

export interface ParseQuestionsResult {
  questions: Question[]
  legacyMetadata?: LegacyQuizMetadata
}
