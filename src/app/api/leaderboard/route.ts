import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateUserRating, DEVOTEE_LEVELS, type DevoteeLevel } from '@/lib/levels'

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
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('user_id, quiz_id, score, max_score, time_taken, profiles(full_name, avatar_url, email)')
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('[Leaderboard API Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!attempts || attempts.length === 0) {
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
      if (!att.user_id || att.user_id.startsWith('guest_')) continue

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
    })

    return NextResponse.json(
      {
        devotees,
        totalParticipants: devotees.length,
        levels: DEVOTEE_LEVELS,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    )
  } catch (err: any) {
    console.error('[Leaderboard Unexpected Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
