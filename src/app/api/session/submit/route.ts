import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { scoreQuiz } from '@/lib/scoring'
import { getQuizById } from '@/lib/quizzes'

const inFlightSubmissions = new Set<string>()

export async function POST(request: NextRequest) {
  let lockKey: string | null = null
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

    const isSandboxPin = pin === '000' || pin === '0000'

    // 2. Resolve sessionId from PIN if client state was null
    if (isSandboxPin) {
      const { data: session } = await supabase
        .from('quiz_sessions')
        .select('id, quiz_id, is_active')
        .in('pin', ['000', '0000'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        sessionId = session.id
      }
    } else if (!sessionId && pin) {
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

    if (!sessionId && !isSandboxPin) {
      return NextResponse.json({ error: `No quiz session found for PIN ${pin}` }, { status: 404 })
    }

    // 3. Load Quiz definition and calculate official score
    const targetQuizId = quizId || (isSandboxPin ? 'sandbox-demo' : 'mahabharata-authentic-quiz-20')
    let quiz = getQuizById(targetQuizId)
    if (!quiz && isSandboxPin) {
      quiz = getQuizById('mahabharata-variety-demo')
    }
    if (!quiz) {
      return NextResponse.json({ error: `Quiz definition not found for ID ${targetQuizId}` }, { status: 404 })
    }

    const result = scoreQuiz(quiz.questions, answers || {})

    // Concurrency lock: Prevent duplicate requests from the same user/session in-flight
    lockKey = `${userId}:${sessionId || 'sandbox-pin'}`
    if (inFlightSubmissions.has(lockKey)) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        scoreResult: result,
      })
    }
    inFlightSubmissions.add(lockKey)

    // 4. Avoid duplicate submission error - check by sessionId or by (quiz_id + null session_id) for sandbox
    let query = supabase
      .from('quiz_attempts')
      .select('id, score, max_score')
      .eq('user_id', userId)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else if (isSandboxPin) {
      query = query.eq('quiz_id', quiz.id).is('session_id', null)
    } else {
      query = null as any
    }

    if (query) {
      const { data: existingList } = await query
        .order('completed_at', { ascending: false })
        .limit(1)

      if (existingList && existingList.length > 0) {
        if (isSandboxPin) {
          // For sandbox PIN, update existing attempt and clean up any older duplicate test rows
          const existingId = existingList[0].id
          const { data: updatedAttempt } = await supabase
            .from('quiz_attempts')
            .update({
              score: result.totalEarned,
              max_score: result.totalMax,
              time_taken: elapsed || 0,
              answers: answers || {},
              completed_at: new Date().toISOString(),
            })
            .eq('id', existingId)
            .select()
            .maybeSingle()

          // Prune any previous duplicate sandbox attempts so only 1 row remains
          try {
            await supabase
              .from('quiz_attempts')
              .delete()
              .eq('user_id', userId)
              .eq('quiz_id', quiz.id)
              .is('session_id', null)
              .neq('id', existingId)
          } catch (e) {
            console.warn('[Sandbox Cleanup Warning]:', e)
          }

          return NextResponse.json({
            success: true,
            attempt: updatedAttempt || existingList[0],
            scoreResult: result,
            isRetake: true,
          })
        }

        return NextResponse.json({
          success: true,
          alreadySubmitted: true,
          scoreResult: result,
        })
      }
    }

    // 5. Insert attempt record into Supabase
    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quiz.id,
        session_id: sessionId || null,
        score: result.totalEarned,
        max_score: result.totalMax,
        time_taken: elapsed || 0,
        answers: answers || {},
      })
      .select()
      .maybeSingle()

    if (insertError) {
      console.error('[Session Submit DB Error]:', insertError)
      if (isSandboxPin) {
        return NextResponse.json({
          success: true,
          scoreResult: result,
          warning: 'Sandbox attempt recorded in local test mode.',
        })
      }
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
  } finally {
    if (lockKey) {
      inFlightSubmissions.delete(lockKey)
    }
  }
}
