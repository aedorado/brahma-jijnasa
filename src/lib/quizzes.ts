import fs from 'fs'
import path from 'path'
import type { Quiz, QuizMeta, Category, QuestionType, Difficulty } from '@/types/quiz'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStandardQuestionPoints } from '@/lib/quiz-validator'

const QUIZZES_DIR = path.join(process.cwd(), 'quizzes')

// ——— In-Memory Cache (1-minute TTL for high-concurrency devotee quiz access) ———
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const quizCache = new Map<string, CacheEntry<Quiz>>()
let quizMetaCache: CacheEntry<QuizMeta[]> | null = null
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export function invalidateQuizCache(quizId?: string) {
  if (quizId) {
    for (const key of Array.from(quizCache.keys())) {
      if (key === quizId || key.startsWith(`${quizId}:`)) {
        quizCache.delete(key)
      }
    }
  } else {
    quizCache.clear()
  }
  quizMetaCache = null
}

// Helper to convert database row to Quiz object
export function mapRowToQuiz(row: any, lang?: string): Quiz {
  const questionsObj = row.questions || {}
  const targetLang = (lang && questionsObj[lang] && questionsObj[lang].length > 0) ? lang : 'en'
  const rawQuestions = questionsObj[targetLang] || questionsObj['en'] || []

  return normalizeQuiz({
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description || undefined,
    difficulty: row.difficulty || 'medium',
    timeLimit: row.time_limit || 720,
    onTimeExpiry: row.on_time_expiry || 'submit-partial',
    questions: rawQuestions,
  })
}

// ——— Async Load all quiz metadata strictly from Supabase DB ———
export async function fetchAllQuizMeta(): Promise<QuizMeta[]> {
  const now = Date.now()
  if (quizMetaCache && quizMetaCache.expiresAt > now) {
    return quizMetaCache.data
  }

  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, category, description, difficulty, time_limit, on_time_expiry, questions, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[fetchAllQuizMeta] Supabase error:', error.message)
      return []
    }

    if (data && data.length > 0) {
      const metas = data.map((row: any) => {
        const enQuestions = row.questions?.en || Object.values(row.questions || {})[0] || []
        return {
          id: row.id,
          title: row.title,
          category: row.category,
          description: row.description,
          difficulty: row.difficulty,
          timeLimit: row.time_limit,
          onTimeExpiry: row.on_time_expiry,
          totalQuestions: Array.isArray(enQuestions) ? enQuestions.length : 0,
          filePath: `supabase/${row.category}/${row.id}`,
        }
      })
      quizMetaCache = { data: metas, expiresAt: now + CACHE_TTL_MS }
      return metas
    }

    return []
  } catch (err) {
    console.error('[fetchAllQuizMeta] Failed to load from database:', err)
    return []
  }
}

// ——— Async Load a single quiz by ID strictly from Supabase DB (NO file fallback) ———
export async function fetchQuizById(id: string, lang?: string): Promise<Quiz | null> {
  const cacheKey = `${id}:${lang || 'en'}`
  const now = Date.now()
  const cached = quizCache.get(cacheKey)

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error(`[fetchQuizById] Database error for "${id}":`, error.message)
      return null
    }

    if (data) {
      const parsed = mapRowToQuiz(data, lang)
      quizCache.set(cacheKey, { data: parsed, expiresAt: now + CACHE_TTL_MS })
      return parsed
    }

    // Quiz does not exist in DB — strictly return null (no silent file fallback!)
    return null
  } catch (err) {
    console.error(`[fetchQuizById] DB query failed for "${id}":`, err)
    return null
  }
}

// ——— Load all quiz metadata (for listings / fallback) ———
export function getAllQuizMeta(): QuizMeta[] {
  const metas: QuizMeta[] = []

  if (!fs.existsSync(QUIZZES_DIR)) return metas

  const categories = fs.readdirSync(QUIZZES_DIR).filter(f =>
    fs.statSync(path.join(QUIZZES_DIR, f)).isDirectory()
  )

  for (const category of categories) {
    const categoryDir = path.join(QUIZZES_DIR, category)
    const files = fs.readdirSync(categoryDir).filter(f =>
      f.endsWith('.json') && !f.endsWith('.hi.json') && !f.endsWith('.pt.json')
    )

    for (const file of files) {
      try {
        const filePath = path.join(categoryDir, file)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const quiz: Quiz = JSON.parse(raw)
        metas.push({
          id: quiz.id,
          title: quiz.title,
          category: quiz.category,
          description: quiz.description,
          difficulty: quiz.difficulty,
          timeLimit: quiz.timeLimit,
          onTimeExpiry: quiz.onTimeExpiry,
          totalQuestions: quiz.questions.length,
          filePath: `${category}/${file}`,
        })
      } catch (e) {
        console.error(`Failed to parse quiz file: ${file}`, e)
      }
    }
  }

  return metas
}

export { getStandardQuestionPoints } from '@/lib/quiz-validator'

export function normalizeQuiz(quiz: Quiz): Quiz {
  return {
    ...quiz,
    questions: quiz.questions.map(q => ({
      ...q,
      points: (typeof q.points === 'number' && q.points >= 1 && q.points <= 5)
        ? q.points
        : getStandardQuestionPoints(q.type, q.difficulty || 'medium'),
    })),
  }
}

// ——— Load a single quiz by ID (with language fallback) ———
export function getQuizById(id: string, lang?: string): Quiz | null {
  if (!fs.existsSync(QUIZZES_DIR)) return null

  const categories = fs.readdirSync(QUIZZES_DIR).filter(f =>
    fs.statSync(path.join(QUIZZES_DIR, f)).isDirectory()
  )

  // 1. If a specific language is requested (e.g. 'hi' or 'pt'), try to load the localized JSON first
  if (lang && lang !== 'en') {
    for (const category of categories) {
      const categoryDir = path.join(QUIZZES_DIR, category)
      const files = fs.readdirSync(categoryDir).filter(f =>
        f.endsWith(`.${lang}.json`) || f.endsWith(`-${lang}.json`)
      )

      for (const file of files) {
        try {
          const filePath = path.join(categoryDir, file)
          const raw = fs.readFileSync(filePath, 'utf-8')
          const quiz: Quiz = JSON.parse(raw)
          if (quiz.id === id) return normalizeQuiz(quiz)
        } catch (e) {
          console.warn(`Failed to parse localized quiz ${file}:`, e)
        }
      }
    }
  }

  // 2. Fallback to default/English quiz
  for (const category of categories) {
    const categoryDir = path.join(QUIZZES_DIR, category)
    const files = fs.readdirSync(categoryDir).filter(f =>
      f.endsWith('.json') && !f.endsWith('.hi.json') && !f.endsWith('.pt.json')
    )

    for (const file of files) {
      try {
        const filePath = path.join(categoryDir, file)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const quiz: Quiz = JSON.parse(raw)
        if (quiz.id === id) return normalizeQuiz(quiz)
      } catch {
        continue
      }
    }
  }

  return null
}

// ——— Load quizzes by category ———
export function getQuizzesByCategory(category: Category): QuizMeta[] {
  return getAllQuizMeta().filter(q => q.category === category)
}

// ——— Category display labels (re-exported from types/quiz for compatibility) ———
export { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'
