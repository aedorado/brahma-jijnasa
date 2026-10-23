import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_64_PRINCIPLES_SERIES,
  DEFAULT_64_PRINCIPLES_ROUNDS,
  getSeriesRoundUnlockTime,
  isRoundEffectivelyUnlocked,
} from '@/lib/series-data'
import { generateUniqueActivePin } from '@/lib/pin'

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
        .select('*')
        .eq('series_id', dbSeries.id)
        .order('day_number', { ascending: true })

      // Fetch active live sessions by quiz_id
      const { data: activeSessions } = await supabase
        .from('quiz_sessions')
        .select('quiz_id, pin')
        .eq('is_active', true)

      const activePinMap = new Map<string, string>()
      if (activeSessions) {
        for (const s of activeSessions) {
          if (s.quiz_id && s.pin) {
            activePinMap.set(s.quiz_id, s.pin)
          }
        }
      }

      if (dbRounds && dbRounds.length > 0) {
        if (slug === DEFAULT_64_PRINCIPLES_SERIES.slug) {
          rounds = await Promise.all(
            DEFAULT_64_PRINCIPLES_ROUNDS.map(async (defRound) => {
              const matchDb = dbRounds.find((r: any) => r.day_number === defRound.day_number)
              const unlockAt = matchDb?.unlock_at || defRound.unlock_at || getSeriesRoundUnlockTime(defRound.day_number)
              const quizId = matchDb?.quiz_id || defRound.quiz_id
              let activePin = activePinMap.get(quizId) || null
              const isManualUnlocked = matchDb ? Boolean(matchDb.is_unlocked) : false
              const isTimeArrived = unlockAt ? new Date() >= new Date(unlockAt) : false

              // If scheduled release time has arrived (or manually unlocked) but no session exists,
              // auto-generate a collision-free PIN session so the series round is immediately ready for students to join!
              if (!activePin && (isTimeArrived || isManualUnlocked)) {
                try {
                  const { data: existingSession } = await supabase
                    .from('quiz_sessions')
                    .select('id, pin')
                    .eq('quiz_id', quizId)
                    .eq('is_active', true)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                  if (existingSession?.pin) {
                    const pin = String(existingSession.pin)
                    activePin = pin
                    activePinMap.set(quizId, pin)
                  } else {
                    const newPin = await generateUniqueActivePin(supabase)
                    const { data: newSession } = await supabase
                      .from('quiz_sessions')
                      .insert({
                        quiz_id: quizId,
                        pin: newPin,
                      })
                      .select('id, pin')
                      .maybeSingle()

                    if (newSession?.pin) {
                      const pin = String(newSession.pin)
                      activePin = pin
                      activePinMap.set(quizId, pin)
                      if (matchDb?.id) {
                        await supabase
                          .from('quiz_series_rounds')
                          .update({ active_session_id: newSession.id })
                          .eq('id', matchDb.id)
                      }
                    }
                  }
                } catch (sessionErr) {
                  console.warn(`[Auto-PIN] Could not auto-create session for ${quizId}:`, sessionErr)
                }
              }

              return {
                ...defRound,
                id: matchDb ? matchDb.id : defRound.id,
                title: matchDb?.title || defRound.title,
                description: matchDb?.description !== undefined && matchDb?.description !== null ? matchDb.description : defRound.description,
                principles_range: matchDb?.principles_range !== undefined && matchDb?.principles_range !== null ? matchDb.principles_range : defRound.principles_range,
                shloka_reference: matchDb?.shloka_reference !== undefined && matchDb?.shloka_reference !== null ? matchDb.shloka_reference : defRound.shloka_reference,
                unlock_at: unlockAt,
                activePin,
                is_unlocked: isRoundEffectivelyUnlocked({ is_unlocked: isManualUnlocked, unlock_at: unlockAt, activePin }),
              }
            })
          )
        } else {
          rounds = await Promise.all(
            dbRounds.map(async (r: any) => {
              let activePin = activePinMap.get(r.quiz_id) || null
              const isTimeArrived = r.unlock_at ? new Date() >= new Date(r.unlock_at) : false

              if (!activePin && (isTimeArrived || r.is_unlocked)) {
                try {
                  const { data: existingSession } = await supabase
                    .from('quiz_sessions')
                    .select('id, pin')
                    .eq('quiz_id', r.quiz_id)
                    .eq('is_active', true)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                  if (existingSession?.pin) {
                    const pin = String(existingSession.pin)
                    activePin = pin
                    activePinMap.set(r.quiz_id, pin)
                  } else {
                    const newPin = await generateUniqueActivePin(supabase)
                    const { data: newSession } = await supabase
                      .from('quiz_sessions')
                      .insert({
                        quiz_id: r.quiz_id,
                        pin: newPin,
                      })
                      .select('id, pin')
                      .maybeSingle()

                    if (newSession?.pin) {
                      const pin = String(newSession.pin)
                      activePin = pin
                      activePinMap.set(r.quiz_id, pin)
                      await supabase
                        .from('quiz_series_rounds')
                        .update({ active_session_id: newSession.id })
                        .eq('id', r.id)
                    }
                  }
                } catch (sessionErr) {
                  console.warn(`[Auto-PIN] Could not auto-create session for ${r.quiz_id}:`, sessionErr)
                }
              }

              return {
                ...r,
                activePin,
                is_unlocked: isRoundEffectivelyUnlocked({ is_unlocked: r.is_unlocked, unlock_at: r.unlock_at, activePin }),
              }
            })
          )
        }
      }
    }

    // 3. Fetch standings from view (only when series has already started)
    let standings: any[] = []
    const hasStarted = series.start_date ? new Date() >= new Date(series.start_date) : false
    if (dbSeries && hasStarted) {
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
