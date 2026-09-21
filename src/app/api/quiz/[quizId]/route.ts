import { NextResponse } from 'next/server'
import { getQuizById } from '@/lib/quizzes'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params
  const quiz = getQuizById(quizId)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(quiz)
}
