import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_64_PRINCIPLES_SERIES,
  DEFAULT_64_PRINCIPLES_ROUNDS,
  getSeriesRoundUnlockTime,
  isRoundEffectivelyUnlocked,
} from '@/lib/series-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // 1. Fetch series metadata
    let series = null
    const { data: dbSeries } = await supabase
      .from('quiz_series')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (slug === DEFAULT_64_PRINCIPLES_SERIES.slug) {
      if (dbSeries && !dbSeries.description?.includes('Rūpa Gosvāmī') && !dbSeries.subtitle?.includes('Bhakti-rasāmṛta-sindhu')) {
        series = {
          ...DEFAULT_64_PRINCIPLES_SERIES,
          ...dbSeries,
          start_date: dbSeries.start_date || DEFAULT_64_PRINCIPLES_SERIES.start_date,
          end_date: dbSeries.end_date || DEFAULT_64_PRINCIPLES_SERIES.end_date,
        }
      } else {
        series = DEFAULT_64_PRINCIPLES_SERIES
      }
    } else if (dbSeries) {
      series = dbSeries
    }

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    // 2. Fetch rounds
    let rounds = DEFAULT_64_PRINCIPLES_ROUNDS
    if (dbSeries) {
      const { data: dbRounds } = await supabase
        .from('quiz_series_rounds')
        .select('*, quiz_sessions(pin, is_active)')
        .eq('series_id', dbSeries.id)
        .order('day_number', { ascending: true })

      if (dbRounds && dbRounds.length > 0) {
        rounds = DEFAULT_64_PRINCIPLES_ROUNDS.map((defRound) => {
          const matchDb = dbRounds.find((r: any) => r.day_number === defRound.day_number)
          const unlockAt = matchDb?.unlock_at || defRound.unlock_at || getSeriesRoundUnlockTime(defRound.day_number)
          const activePin = matchDb?.quiz_sessions?.is_active ? matchDb.quiz_sessions.pin : null
          const isManualUnlocked = matchDb ? matchDb.is_unlocked : false
          return {
            ...defRound,
            id: matchDb ? matchDb.id : defRound.id,
            unlock_at: unlockAt,
            activePin,
            is_unlocked: isRoundEffectivelyUnlocked({ is_unlocked: isManualUnlocked, unlock_at: unlockAt, activePin }),
          }
        })
      }
    }

    // 3. Fetch standings from view (or fallback gracefully)
    let standings: any[] = []
    if (dbSeries) {
      const { data: dbStandings } = await supabase
        .from('series_leaderboard_view')
        .select('*')
        .eq('series_id', dbSeries.id)
        .order('total_points', { ascending: false })

      if (dbStandings) {
        standings = dbStandings.map((s: any, idx: number) => ({
          ...s,
          rank: idx + 1,
        }))
      }
    }

    return NextResponse.json(
      { series, rounds, standings },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch (err: any) {
    console.error('[Series Slug API Error]:', err)
    return NextResponse.json(
      {
        series: DEFAULT_64_PRINCIPLES_SERIES,
        rounds: DEFAULT_64_PRINCIPLES_ROUNDS,
        standings: [],
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    )
  }
}
