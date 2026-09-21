import { NextResponse } from 'next/server'
import { getAllQuizMeta } from '@/lib/quizzes'

export async function GET() {
  const quizzes = getAllQuizMeta()
  return NextResponse.json(quizzes)
}
