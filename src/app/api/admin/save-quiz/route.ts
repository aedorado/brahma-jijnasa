import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { normalizeQuiz } from '@/lib/quizzes'
import type { Quiz } from '@/types/quiz'

export async function POST(request: Request) {
  try {
    const rawQuiz = await request.json()

    if (!rawQuiz.id || typeof rawQuiz.id !== 'string') {
      return NextResponse.json({ error: 'Quiz must have a valid string "id".' }, { status: 400 })
    }
    if (!rawQuiz.title || typeof rawQuiz.title !== 'string') {
      return NextResponse.json({ error: 'Quiz must have a "title".' }, { status: 400 })
    }
    if (!rawQuiz.category || typeof rawQuiz.category !== 'string') {
      return NextResponse.json({ error: 'Quiz must have a "category".' }, { status: 400 })
    }
    if (!Array.isArray(rawQuiz.questions) || rawQuiz.questions.length === 0) {
      return NextResponse.json({ error: 'Quiz must have at least one question.' }, { status: 400 })
    }

    const quiz: Quiz = normalizeQuiz(rawQuiz)

    const quizzesDir = path.join(process.cwd(), 'quizzes')
    const categoryDir = path.join(quizzesDir, quiz.category)

    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true })
    }

    const targetFile = path.join(categoryDir, `${quiz.id}.json`)
    fs.writeFileSync(targetFile, JSON.stringify(quiz, null, 2), 'utf8')

    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      filePath: `${quiz.category}/${quiz.id}.json`,
      totalQuestions: quiz.questions.length,
    })
  } catch (err: any) {
    console.error('[Save Quiz API Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to save quiz' }, { status: 500 })
  }
}
