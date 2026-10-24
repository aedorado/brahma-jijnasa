import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { generateUniqueActivePin } from '@/lib/pin'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const sessionUser = await verifySession(token)

    if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Teacher role required' }, { status: 403 })
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Series Manage API Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
