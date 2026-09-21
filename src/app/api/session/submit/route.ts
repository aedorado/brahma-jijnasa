import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { scoreQuiz } from '@/lib/scoring'
import { getQuizById } from '@/lib/quizzes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, quizId, answers, elapsed } = body
    let { userId, sessionId } = body

    // 1. Resolve authentic user from session cookie if present
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const sessionUser = await verifySession(token)
    if (sessionUser?.id) {
      userId = sessionUser.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'User is not authenticated. Please log in.' }, { status: 401 })
    }

    const supabase = await createClient()

    // 2. Resolve sessionId from PIN if client state was null
    if (!sessionId && pin) {
      const { data: session } = await supabase
        .from('quiz_sessions')
        .select('id, quiz_id, is_active')
        .eq('pin', pin)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        sessionId = session.id
      }
    }

    if (!sessionId) {
      return NextResponse.json({ error: `No quiz session found for PIN ${pin}` }, { status: 404 })
    }

    // 3. Load Quiz definition and calculate official score
    const targetQuizId = quizId || 'mahabharata-authentic-quiz-20'
    const quiz = getQuizById(targetQuizId)
    if (!quiz) {
      return NextResponse.json({ error: `Quiz definition not found for ID ${targetQuizId}` }, { status: 404 })
    }

    const result = scoreQuiz(quiz.questions, answers || {})

    // 4. Avoid duplicate submission error
    const { data: existing } = await supabase
      .from('quiz_attempts')
      .select('id, score, max_score')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        scoreResult: result,
      })
    }

    // 5. Insert attempt record into Supabase
    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quiz.id,
        session_id: sessionId,
        score: result.totalEarned,
        max_score: result.totalMax,
        time_taken: elapsed || 0,
        answers: answers || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Session Submit DB Error]:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`[Session Submit Success] User: ${userId} (${sessionUser?.email || 'unknown'}), Session: ${sessionId}, Score: ${result.totalEarned}/${result.totalMax}`)

    return NextResponse.json({
      success: true,
      attempt,
      scoreResult: result,
    })
  } catch (err: any) {
    console.error('[Session Submit Unexpected Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error occurred' }, { status: 500 })
  }
}
