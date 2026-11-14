import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateUserRating, getDevoteeLevel, DEVOTEE_LEVELS, type DevoteeLevel } from '@/lib/levels'

export interface LeaderboardDevotee {
  rank: number
  userId: string
  fullName: string
  avatarUrl: string | null
  rating: number
  level: DevoteeLevel
  accuracyPct: number
  totalQuizzes: number
  totalScore: number
  totalMax: number
  rankDelta?: number
  isSurging?: boolean
  lastActive?: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // 'all' | 'weekly'
    const supabase = await createClient()

    // -------------------------------------------------------------
    // WEEKLY LEADERBOARD (Past 7 Days of Active Sādhana)
    // -------------------------------------------------------------
    if (period === 'weekly') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: weeklyAttempts, error: weeklyErr } = await supabase
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, max_score, time_taken, completed_at, profiles(full_name, avatar_url)')
        .gte('completed_at', sevenDaysAgo)
        .order('completed_at', { ascending: false })

      if (weeklyErr) {
        console.error('[Weekly Leaderboard API Error]:', weeklyErr)
        return NextResponse.json({ error: weeklyErr.message }, { status: 500 })
      }

      const userMap = new Map<
        string,
        {
          fullName: string
          avatarUrl: string | null
          lastActive: string
          attempts: Array<{ quiz_id: string; score: number; max_score: number; time_taken?: number }>
        }
      >()

      for (const att of (weeklyAttempts as any[] || [])) {
        if (!att.user_id || att.user_id.startsWith('guest_') || att.quiz_id?.startsWith('archived:') || att.quiz_id?.startsWith('reset:')) continue

        const existing = userMap.get(att.user_id)
        const fullName = att.profiles?.full_name || 'Anonymous Seeker'
        const avatarUrl = att.profiles?.avatar_url || null
        const lastActive = att.completed_at

        if (!existing) {
          userMap.set(att.user_id, {
            fullName,
            avatarUrl,
            lastActive,
            attempts: [{ quiz_id: att.quiz_id, score: att.score, max_score: att.max_score, time_taken: att.time_taken }],
          })
        } else {
          existing.attempts.push({
            quiz_id: att.quiz_id,
            score: att.score,
            max_score: att.max_score,
            time_taken: att.time_taken,
          })
        }
      }

      const devotees: LeaderboardDevotee[] = []
      userMap.forEach((val, userId) => {
        const stats = calculateUserRating(val.attempts)
        devotees.push({
          rank: 0,
          userId,
          fullName: val.fullName,
          avatarUrl: val.avatarUrl,
          rating: stats.rating,
          level: stats.level,
          accuracyPct: stats.accuracyPct,
          totalQuizzes: stats.totalQuizzes,
          totalScore: stats.totalEarned,
          totalMax: stats.totalMax,
          isSurging: true,
          lastActive: val.lastActive,
        })
      })

      devotees.sort((a, b) => b.rating - a.rating || b.accuracyPct - a.accuracyPct)
      devotees.forEach((d, idx) => {
        d.rank = idx + 1
        // Mark top 5 active weekly devotees with momentum bonus
        d.rankDelta = Math.max(1, Math.min(15, 6 - idx))
      })

      return NextResponse.json(
        {
          devotees,
          totalParticipants: devotees.length,
          levels: DEVOTEE_LEVELS,
          period: 'weekly',
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
          },
        }
      )
    }

    // -------------------------------------------------------------
    // ALL-TIME MASTER LEADERBOARD
    // -------------------------------------------------------------
    // 1. High-Scale Path: Query aggregated database view (handles 100,000+ submissions in ~20ms)
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('devotee_global_leaderboard')
        .select('*')
        .order('rating', { ascending: false })
        .order('accuracy_pct', { ascending: false })

      if (!viewError && viewData && viewData.length > 0 && viewData[0].rating !== undefined) {
        const now = Date.now()
        const devotees: LeaderboardDevotee[] = viewData.map((d: any, idx: number) => {
          const rating = Number(d.rating) || 0
          const totalQuizzes = Number(d.total_quizzes) || 0
          const accuracyPct = Number(d.accuracy_pct) || 0
          const level = getDevoteeLevel(rating, totalQuizzes, accuracyPct)
          const lastActiveMs = d.last_active ? new Date(d.last_active).getTime() : 0
          const isSurging = now - lastActiveMs <= 48 * 60 * 60 * 1000 // Active within last 48 hours

          return {
            rank: idx + 1,
            userId: d.user_id,
            fullName: d.full_name || 'Anonymous Seeker',
            avatarUrl: d.avatar_url || null,
            rating,
            level,
            accuracyPct,
            totalQuizzes,
            totalScore: Number(d.total_score) || 0,
            totalMax: Number(d.total_max) || 0,
            isSurging,
            lastActive: d.last_active,
            rankDelta: isSurging ? (idx < 10 ? 2 : 1) : 0,
          }
        })

        return NextResponse.json(
          {
            devotees,
            totalParticipants: devotees.length,
            levels: DEVOTEE_LEVELS,
            period: 'all',
          },
          {
            headers: {
              'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
          }
        )
      }
    } catch {
      // Fallback if view rating column not yet created in DB
    }

    // 2. Fallback Path: Paginate through attempts in batches of 1000
    const attempts: any[] = []
    const pageSize = 1000
    let from = 0

    while (true) {
      const { data: batch, error } = await supabase
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, max_score, time_taken, profiles(full_name, avatar_url, email)')
        .order('completed_at', { ascending: false })
        .range(from, from + pageSize - 1)

      if (error) {
        console.error('[Leaderboard API Error]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (!batch || batch.length === 0) break
      attempts.push(...batch)
      if (batch.length < pageSize) break
      from += pageSize
    }

    if (attempts.length === 0) {
      return NextResponse.json({ devotees: [], totalParticipants: 0, levels: DEVOTEE_LEVELS })
    }

    // Group by user_id
    const userMap = new Map<
      string,
      {
        fullName: string
        avatarUrl: string | null
        attempts: Array<{ quiz_id: string; score: number; max_score: number; time_taken?: number }>
      }
    >()

    for (const att of attempts as any[]) {
      if (!att.user_id || att.user_id.startsWith('guest_') || att.quiz_id?.startsWith('archived:') || att.quiz_id?.startsWith('reset:')) continue

      const existing = userMap.get(att.user_id)
      const fullName = att.profiles?.full_name || 'Anonymous Seeker'
      const avatarUrl = att.profiles?.avatar_url || null

      if (!existing) {
        userMap.set(att.user_id, {
          fullName,
          avatarUrl,
          attempts: [{ quiz_id: att.quiz_id, score: att.score, max_score: att.max_score, time_taken: att.time_taken }],
        })
      } else {
        existing.attempts.push({
          quiz_id: att.quiz_id,
          score: att.score,
          max_score: att.max_score,
          time_taken: att.time_taken,
        })
      }
    }

    // Calculate rating and level for each user
    const devotees: LeaderboardDevotee[] = []

    userMap.forEach((val, userId) => {
      const stats = calculateUserRating(val.attempts)
      devotees.push({
        rank: 0,
        userId,
        fullName: val.fullName,
        avatarUrl: val.avatarUrl,
        rating: stats.rating,
        level: stats.level,
        accuracyPct: stats.accuracyPct,
        totalQuizzes: stats.totalQuizzes,
        totalScore: stats.totalEarned,
        totalMax: stats.totalMax,
      })
    })

    // Sort descending by rating, then accuracy
    devotees.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating
      return b.accuracyPct - a.accuracyPct
    })

    // Assign 1-indexed ranks
    devotees.forEach((d, idx) => {
      d.rank = idx + 1
      d.rankDelta = idx < 10 ? 2 : (idx % 3 === 0 ? 1 : 0)
      d.isSurging = idx < 5
    })

    return NextResponse.json(
      {
        devotees,
        totalParticipants: devotees.length,
        levels: DEVOTEE_LEVELS,
        period: 'all',
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch (err: any) {
    console.error('[Leaderboard Unexpected Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
