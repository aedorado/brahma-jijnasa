import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Light database query to wake Postgres and reset Supabase's 7-day inactivity pause
    const { count, error } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          database: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 200 } // Still return 200 so keep-alive succeeds
      )
    }

    return NextResponse.json({
      status: 'ok',
      database: 'awake',
      totalAttemptsCount: count ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: err.message || 'Unknown health check error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
