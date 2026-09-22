import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'

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
      const pin = String(Math.floor(1000 + Math.random() * 9000))
      const { data: session, error: sessionErr } = await supabase
        .from('quiz_sessions')
        .insert({
          quiz_id: quizId || 'sandbox-demo',
          pin,
          created_by: sessionUser.id,
        })
        .select()
        .single()

      if (sessionErr) {
        return NextResponse.json({ error: sessionErr.message }, { status: 500 })
      }

      // Link session to round
      if (roundId) {
        await supabase
          .from('quiz_series_rounds')
          .update({
            active_session_id: session.id,
            is_unlocked: true,
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
