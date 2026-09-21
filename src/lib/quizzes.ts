import fs from 'fs'
import path from 'path'
import type { Quiz, QuizMeta, Category } from '@/types/quiz'

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
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))

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

// ——— Load a single quiz by ID ———
export function getQuizById(id: string): Quiz | null {
  if (!fs.existsSync(QUIZZES_DIR)) return null

  const categories = fs.readdirSync(QUIZZES_DIR).filter(f =>
    fs.statSync(path.join(QUIZZES_DIR, f)).isDirectory()
  )

  for (const category of categories) {
    const categoryDir = path.join(QUIZZES_DIR, category)
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const filePath = path.join(categoryDir, file)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const quiz: Quiz = JSON.parse(raw)
        if (quiz.id === id) return quiz
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
