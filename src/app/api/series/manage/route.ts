import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { generateUniqueActivePin } from '@/lib/pin'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const sessionUser = await verifySession(token)

    if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'teacher' && sessionUser.role !== 'creator')) {
      return NextResponse.json({ error: 'Unauthorized: Admin, Teacher, or Creator role required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, roundId, isUnlocked, quizId } = body
    const supabase = await createClient()

    if (action === 'toggle_unlock') {
      const { data, error } = await supabase
        .from('quiz_series_rounds')
        .update({ is_unlocked: isUnlocked })
        .eq('id', roundId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, round: data })
    }

    if (action === 'launch_session') {
      const targetQuizId = quizId || 'sandbox-demo'

      // Check if an existing session already exists for this quiz (re-activate in place with same PIN)
      const { data: existingSessions } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('quiz_id', targetQuizId)
        .order('started_at', { ascending: false })
        .limit(1)

      const prev = existingSessions && existingSessions.length > 0 ? existingSessions[0] : null

      if (prev && prev.pin) {
        let pinToUse = String(prev.pin)
        const { data: conflict } = await supabase
          .from('quiz_sessions')
          .select('id')
          .eq('pin', pinToUse)
          .eq('is_active', true)
          .neq('id', prev.id)
          .limit(1)

        if (conflict && conflict.length > 0) {
          pinToUse = await generateUniqueActivePin(supabase)
        }

        const { data: reactivated, error: reactivateErr } = await supabase
          .from('quiz_sessions')
          .update({
            is_active: true,
            ended_at: null,
            started_at: new Date().toISOString(),
            pin: pinToUse,
          })
          .eq('id', prev.id)
          .select()
          .single()

        if (!reactivateErr && reactivated) {
          if (roundId) {
            await supabase
              .from('quiz_series_rounds')
              .update({ active_session_id: reactivated.id })
              .eq('id', roundId)
          }
          return NextResponse.json({ success: true, session: reactivated, reused: true })
        }
      }

      // Fallback: insert fresh row only if no previous session existed
      const pin = await generateUniqueActivePin(supabase)
      const { data: session, error: sessionErr } = await supabase
        .from('quiz_sessions')
        .insert({
          quiz_id: targetQuizId,
          pin,
          created_by: sessionUser.id,
        })
        .select()
        .single()

      if (sessionErr) {
        return NextResponse.json({ error: sessionErr.message }, { status: 500 })
      }

      // Link session to round without overriding unlock_at schedule
      if (roundId) {
        await supabase
          .from('quiz_series_rounds')
          .update({
            active_session_id: session.id,
          })
          .eq('id', roundId)
      }

      return NextResponse.json({ success: true, session, pin })
    }

    // --- Admin & Creator series linking and scheduling operations ---
    if (action === 'link_round' || action === 'unlink_round' || action === 'update_schedule') {
      if (sessionUser.role !== 'admin' && sessionUser.role !== 'creator') {
        return NextResponse.json({ error: 'Forbidden: Only administrators and quiz creators can assign or reassign series campaign quizzes.' }, { status: 403 })
      }

      const { targetQuizId, unlockAt, dayNumber } = body

      // 1. Unlink Round
      if (action === 'unlink_round') {
        let updateQuery = supabase.from('quiz_series_rounds').update({ quiz_id: '', active_session_id: null })
        if (roundId) updateQuery = updateQuery.eq('id', roundId)
        else if (dayNumber !== undefined && dayNumber !== null) updateQuery = updateQuery.eq('day_number', Number(dayNumber))
        else return NextResponse.json({ error: 'Missing roundId or dayNumber' }, { status: 400 })

        const { error: unlinkErr } = await updateQuery
        if (unlinkErr) {
          return NextResponse.json({ error: unlinkErr.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, message: 'Quiz unlinked from round.' })
      }

      // 2. Update Schedule
      if (action === 'update_schedule') {
        if (!unlockAt) return NextResponse.json({ error: 'Missing unlockAt' }, { status: 400 })
        let updateQuery = supabase.from('quiz_series_rounds').update({ unlock_at: unlockAt })
        if (roundId) updateQuery = updateQuery.eq('id', roundId)
        else if (dayNumber !== undefined && dayNumber !== null) updateQuery = updateQuery.eq('day_number', Number(dayNumber))
        else return NextResponse.json({ error: 'Missing roundId or dayNumber' }, { status: 400 })

        const { error: schedErr } = await updateQuery
        if (schedErr) {
          return NextResponse.json({ error: schedErr.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, message: 'Schedule updated.' })
      }

      // 3. Link Round to a Quiz
      if (action === 'link_round') {
        if (!targetQuizId) return NextResponse.json({ error: 'Missing targetQuizId' }, { status: 400 })

        // Fetch quiz title to keep round title aligned
        const { data: qData } = await supabase
          .from('quizzes')
          .select('title')
          .eq('id', targetQuizId)
          .maybeSingle()

        // Detach targetQuizId from any other round first to prevent duplicate assignments
        await supabase
          .from('quiz_series_rounds')
          .update({ quiz_id: '', active_session_id: null })
          .eq('quiz_id', targetQuizId)

        // Attach targetQuizId to the specified round
        const updates: Record<string, any> = { quiz_id: targetQuizId }
        if (qData?.title) updates.title = qData.title
        if (unlockAt && typeof unlockAt === 'string' && unlockAt.trim()) updates.unlock_at = unlockAt

        let updateQuery = supabase.from('quiz_series_rounds').update(updates)
        if (roundId) updateQuery = updateQuery.eq('id', roundId)
        else if (dayNumber !== undefined && dayNumber !== null) updateQuery = updateQuery.eq('day_number', Number(dayNumber))
        else return NextResponse.json({ error: 'Missing roundId or dayNumber' }, { status: 400 })

        const { error: linkErr } = await updateQuery
        if (linkErr) {
          return NextResponse.json({ error: linkErr.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, message: 'Quiz attached to series round.' })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Series Manage API Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
