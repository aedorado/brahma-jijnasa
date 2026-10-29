import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_64_PRINCIPLES_SERIES,
  DEFAULT_64_PRINCIPLES_ROUNDS,
  getSeriesRoundUnlockTime,
  isRoundEffectivelyUnlocked,
} from '@/lib/series-data'
import { generateUniqueActivePin } from '@/lib/pin'
import type { SeriesStanding, QuizSeriesRound } from '@/types/series'

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
              // If matchDb exists in DB, respect its quiz_id (even if unlinked/empty). Fall back to defRound only if no DB row exists.
              const quizId = matchDb ? (matchDb.quiz_id ?? '') : defRound.quiz_id
              let activePin = quizId ? (activePinMap.get(quizId) || null) : null
              const isManualUnlocked = matchDb ? Boolean(matchDb.is_unlocked) : false
              const isTimeArrived = unlockAt ? new Date() >= new Date(unlockAt) : false

              // If scheduled release time has arrived (or manually unlocked) but no session exists,
              // auto-generate a collision-free PIN session so the series round is immediately ready for students to join!
              if (quizId && !activePin && (isTimeArrived || isManualUnlocked)) {
                try {
                  const { data: existingSession } = await supabase
                    .from('quiz_sessions')
                    .select('id, pin, is_active')
                    .eq('quiz_id', quizId)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                  if (existingSession?.pin) {
                    const pin = String(existingSession.pin)
                    activePin = pin
                    activePinMap.set(quizId, pin)

                    if (!existingSession.is_active) {
                      await supabase
                        .from('quiz_sessions')
                        .update({ is_active: true, ended_at: null, started_at: new Date().toISOString() })
                        .eq('id', existingSession.id)
                    }

                    if (matchDb?.id) {
                      await supabase
                        .from('quiz_series_rounds')
                        .update({ active_session_id: existingSession.id })
                        .eq('id', matchDb.id)
                    }
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
                quiz_id: quizId,
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
              let activePin = r.quiz_id ? (activePinMap.get(r.quiz_id) || null) : null
              const isTimeArrived = r.unlock_at ? new Date() >= new Date(r.unlock_at) : false

              if (r.quiz_id && !activePin && (isTimeArrived || r.is_unlocked)) {
                try {
                  const { data: existingSession } = await supabase
                    .from('quiz_sessions')
                    .select('id, pin, is_active')
                    .eq('quiz_id', r.quiz_id)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                  if (existingSession?.pin) {
                    const pin = String(existingSession.pin)
                    activePin = pin
                    activePinMap.set(r.quiz_id, pin)

                    if (!existingSession.is_active) {
                      await supabase
                        .from('quiz_sessions')
                        .update({ is_active: true, ended_at: null, started_at: new Date().toISOString() })
                        .eq('id', existingSession.id)
                    }

                    await supabase
                      .from('quiz_series_rounds')
                      .update({ active_session_id: existingSession.id })
                      .eq('id', r.id)
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

    // 3. Fetch standings (both without practice and with practice)
    let standings: SeriesStanding[] = []
    let practiceStandings: SeriesStanding[] = []
    const hasStarted = series.start_date ? new Date() >= new Date(series.start_date) : false
    if (dbSeries && hasStarted) {
      const allRoundsList = (rounds as QuizSeriesRound[] || [])
      const allQuizIds = allRoundsList.map((r) => r.quiz_id).filter(Boolean)
      const officialQuizIds = new Set(
        allRoundsList.filter((r) => (r.day_number ?? 1) > 0).map((r) => r.quiz_id)
      )

      if (allQuizIds.length > 0) {
        try {
          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('user_id, quiz_id, score, max_score, completed_at, profiles(full_name, avatar_url)')
            .in('quiz_id', allQuizIds)
            .not('user_id', 'is', null)

          if (attempts && attempts.length > 0) {
            const aggregate = (filterFn?: (id: string) => boolean): SeriesStanding[] => {
              const bestMap = new Map<string, any>()
              for (const a of (attempts as any[])) {
                if (!a.user_id || String(a.user_id).startsWith('guest_')) continue
                if (filterFn && !filterFn(a.quiz_id)) continue
                const key = `${a.user_id}:${a.quiz_id}`
                const cur = bestMap.get(key)
                if (!cur || Number(a.score) > Number(cur.score)) {
                  bestMap.set(key, a)
                }
              }

              const userMap = new Map<string, any>()
              for (const a of bestMap.values()) {
                const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
                let u = userMap.get(a.user_id)
                if (!u) {
                  u = {
                    user_id: a.user_id,
                    series_id: dbSeries.id,
                    full_name: p?.full_name || 'Anonymous Seeker',
                    avatar_url: p?.avatar_url || null,
                    days_attended: 0,
                    total_points: 0,
                    total_max_points: 0,
                    accs: [] as number[],
                  }
                  userMap.set(a.user_id, u)
                }
                u.days_attended += 1
                u.total_points += Number(a.score) || 0
                u.total_max_points += Number(a.max_score) || 0
                if (Number(a.max_score) > 0) {
                  u.accs.push((Number(a.score) / Number(a.max_score)) * 100)
                }
              }

              return Array.from(userMap.values())
                .map((u) => ({
                  user_id: u.user_id,
                  series_id: u.series_id,
                  full_name: u.full_name,
                  avatar_url: u.avatar_url,
                  days_attended: u.days_attended,
                  total_points: Math.round(u.total_points * 10) / 10,
                  total_max_points: Math.round(u.total_max_points * 10) / 10,
                  avg_accuracy: u.accs.length
                    ? Math.round((u.accs.reduce((sum: number, v: number) => sum + v, 0) / u.accs.length) * 10) / 10
                    : 0,
                }))
                .sort((a, b) => b.total_points - a.total_points || b.days_attended - a.days_attended)
                .map((s, idx) => ({ ...s, rank: idx + 1 }))
            }

            standings = aggregate((id) => officialQuizIds.has(id))
            practiceStandings = aggregate()
          }
        } catch (calcErr) {
          console.warn('[Series Standings Calculation Error]:', calcErr)
        }
      }
    }

    return NextResponse.json(
      { series, rounds, standings, practiceStandings },
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
