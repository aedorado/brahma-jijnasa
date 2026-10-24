import { NextResponse } from 'next/server'
import { fetchAllQuizMeta } from '@/lib/quizzes'

export async function GET() {
  const quizzes = await fetchAllQuizMeta()
  return NextResponse.json(quizzes, {
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  })
}
