import type { AnswerMap } from '@/types/quiz'

const PREFIX = 'bj_quiz_'

interface SavedQuizState {
  pin: string
  quizId: string
  userId: string
  answers: AnswerMap
  startedAt: number       // timestamp ms
  timeElapsed: number     // seconds
  savedAt: number
}

// ——— Save progress ———
export function saveProgress(state: SavedQuizState): void {
  try {
    const key = `${PREFIX}${state.pin}_${state.userId}`
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // localStorage unavailable (SSR or private mode)
  }
}

// ——— Load progress ———
export function loadProgress(pin: string, userId: string): SavedQuizState | null {
  try {
    const key = `${PREFIX}${pin}_${userId}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const state: SavedQuizState = JSON.parse(raw)
    // Discard if older than 24 hours
    if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
      clearProgress(pin, userId)
      return null
    }
    return state
  } catch {
    return null
  }
}

// ——— Clear progress after submit ———
export function clearProgress(pin: string, userId: string): void {
  try {
    const key = `${PREFIX}${pin}_${userId}`
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ——— Theme persistence ———
export function getTheme(): 'dark' | 'light' {
  try {
    return (localStorage.getItem('bj_theme') as 'dark' | 'light') || 'dark'
  } catch {
    return 'dark'
  }
}

export function setTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem('bj_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  } catch {
    // ignore
  }
}
