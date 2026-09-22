import fs from 'fs'
import path from 'path'
import type { Quiz, QuizMeta, Category, QuestionType, Difficulty } from '@/types/quiz'

const QUIZZES_DIR = path.join(process.cwd(), 'quizzes')

// ——— Load all quiz metadata (for listings) ———
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

export function getStandardQuestionPoints(type: QuestionType, difficulty: Difficulty): number {
  // Tier 1: Direct Recognition (1 pick / boolean)
  if (['single-choice', 'true-false', 'who-said-this', 'odd-one-out', 'missing-link'].includes(type)) {
    return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
  }
  // Tier 2: Analytical Reasoning (Multi-statement / Scenario)
  if (['assertion-reason', 'cause-effect', 'spot-the-error', 'two-truths-one-false', 'evidence-based', 'case-study', 'what-would-you-do'].includes(type)) {
    return difficulty === 'easy' ? 1.5 : difficulty === 'medium' ? 2.5 : 3.5
  }
  // Tier 3: Multi-Element & Interactive (match-pairs, sequence, multiple-select, who-am-i)
  return difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
}

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
