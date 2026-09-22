import { NextResponse } from 'next/server'
import { getQuizById } from '@/lib/quizzes'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || undefined
  const quiz = getQuizById(quizId, lang)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(quiz, {
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  })
}
