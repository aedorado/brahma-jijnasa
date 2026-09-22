// ==============================================================================
// BRAHMA JIJÑĀSĀ — Quiz Series & Campaign Types
// ==============================================================================

export interface QuizSeries {
  id: string
  slug: string
  title: string
  subtitle?: string
  description?: string
  category?: string
  total_days: number
  banner_url?: string
  start_date?: string
  end_date?: string
  is_active: boolean
  created_at?: string
}

export interface QuizSeriesRound {
  id: string
  series_id: string
  day_number: number
  quiz_id: string
  title: string
  description?: string
  principles_range?: string
  shloka_reference?: string
  unlock_at?: string
  is_unlocked: boolean
  active_session_id?: string | null
  created_at?: string
}

export interface SeriesStanding {
  user_id: string
  series_id: string
  full_name: string
  avatar_url: string | null
  days_attended: number
  total_points: number
  total_max_points: number
  avg_accuracy: number
  rank?: number
}
