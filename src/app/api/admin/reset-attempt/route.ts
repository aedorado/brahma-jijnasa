import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const sessionUser = await verifySession(sessionToken)

    if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'teacher' && sessionUser.role !== 'creator')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Teacher role required to manage attempts.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { attemptId, userId, quizId, action = 'archive', reason } = body

    if (!attemptId && (!userId || !quizId)) {
      return NextResponse.json({ error: 'Provide either attemptId, or both userId and quizId.' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Identify target attempt(s)
    let query = supabase.from('quiz_attempts').select('*')
    if (attemptId) {
      query = query.eq('id', attemptId)
    } else {
      query = query.eq('user_id', userId).eq('quiz_id', quizId)
    }

    const { data: targetAttempts, error: fetchErr } = await query

    if (fetchErr) {
      return NextResponse.json({ error: `Failed to fetch attempt: ${fetchErr.message}` }, { status: 500 })
    }

    if (!targetAttempts || targetAttempts.length === 0) {
      return NextResponse.json({ error: 'Attempt not found or already archived.' }, { status: 404 })
    }

    // 2. RESTORE ACTION: Un-archive an attempt if needed
    if (action === 'restore') {
      for (const att of targetAttempts) {
        const meta = att.answers?._archive_meta
        const originalQuizId = meta?.original_quiz_id || att.quiz_id.replace(/^archived:\d+:/, '').replace(/^archived:/, '')
        const originalSessionId = meta?.original_session_id || null

        // Remove _archive_meta cleanly
        const cleanAnswers = { ...(att.answers || {}) }
        delete cleanAnswers._archive_meta

        await supabase
          .from('quiz_attempts')
          .update({
            quiz_id: originalQuizId,
            session_id: originalSessionId,
            answers: cleanAnswers,
          })
          .eq('id', att.id)
      }

      return NextResponse.json({
        success: true,
        action: 'restored',
        message: 'Quiz attempt restored to active state.',
      })
    }

    // 3. ARCHIVE ACTION (Default, Non-Destructive Soft-Delete):
    // Preserves original score, time, answers, and audit trail in JSONB while prefixing quiz_id
    // so it immediately unblocks student retakes and excludes from leaderboards.
    for (const att of targetAttempts) {
      // Avoid double-archiving prefix
      const isAlreadyArchived = att.quiz_id.startsWith('archived:')
      const originalQuizId = isAlreadyArchived
        ? (att.answers?._archive_meta?.original_quiz_id || att.quiz_id)
        : att.quiz_id

      const archivedQuizId = isAlreadyArchived
        ? att.quiz_id
        : `archived:${Date.now()}:${originalQuizId}`

      const currentAnswers = typeof att.answers === 'object' && att.answers !== null ? att.answers : {}

      await supabase
        .from('quiz_attempts')
        .update({
          quiz_id: archivedQuizId,
          session_id: null,
          answers: {
            ...currentAnswers,
            _archive_meta: {
              archived_at: new Date().toISOString(),
              archived_by: sessionUser.email,
              original_quiz_id: originalQuizId,
              original_session_id: att.session_id,
              original_score: att.score,
              original_time_taken: att.time_taken,
              reason: reason || 'admin_reset_for_retake',
            },
          },
        })
        .eq('id', att.id)
    }

    return NextResponse.json({
      success: true,
      action: 'archived',
      archivedCount: targetAttempts.length,
      message: 'Quiz attempt archived safely. Devotee is now unblocked to retake the quiz.',
    })
  } catch (err: any) {
    console.error('Error in reset-attempt route:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
