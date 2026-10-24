import { NextResponse } from 'next/server'
import { fetchQuizById } from '@/lib/quizzes'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params
  const { searchParams } = new URL(request.url)

  // Admin / CMS edit mode: returns raw DB row with multilingual questions object
  if (searchParams.get('raw') === 'true') {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    })
  }

  const lang = searchParams.get('lang') || undefined
  const quiz = await fetchQuizById(quizId, lang)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(quiz, {
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  })
}
