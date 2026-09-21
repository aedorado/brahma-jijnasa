'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { calculateUserRating } from '@/lib/levels'
import { UserAvatar } from '@/components/UserAvatar'

interface Attempt {
  id: string
  quiz_id: string
  score: number
  max_score: number
  time_taken: number | null
  completed_at: string
}

export default function ProfilePage() {
  const { user, loading, logout, login, refresh } = useAuth()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (loading) return
    if (!user) {
      return
    }

    const loadAttempts = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id, quiz_id, score, max_score, time_taken, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })

        if (data) setAttempts(data as Attempt[])
      } catch (e) {
        console.warn('Could not load attempts:', e)
      } finally {
        setLoadingAttempts(false)
      }
    }

    loadAttempts()
  }, [user, loading, supabase])

  const stats = useMemo(() => {
    return calculateUserRating(attempts.map(a => ({
      quiz_id: a.quiz_id,
      score: a.score,
      max_score: a.max_score,
      time_taken: a.time_taken || 0,
    })))
  }, [attempts])

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-gold" />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card text-center" style={{ maxWidth: 400, padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🙏</div>
          <h2 style={{ marginBottom: '0.75rem', fontWeight: 800 }}>Welcome to Brahma Jijñāsā</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Sign in with Google to view your profile and saved quiz history.
          </p>
          <button className="btn btn-primary w-full" onClick={() => login('/profile')}>
            Sign In with Google
          </button>
        </div>
      </div>
    )
  }

  const totalPoints = attempts.reduce((acc, a) => acc + Number(a.score || 0), 0)
  const totalMax = attempts.reduce((acc, a) => acc + Number(a.max_score || 0), 0)
  const avgPercentage = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0

  return (
    <div className="container-sm" style={{ padding: '3rem 1rem 5rem', maxWidth: 680 }}>
      {/* Profile Header */}
      <div className="card-gold" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <UserAvatar
          name={user.full_name}
          url={user.avatar_url}
          size={80}
          border="3px solid var(--color-gold)"
          style={{ boxShadow: '0 0 15px rgba(212,143,24,0.3)' }}
        />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user.full_name}</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              {user.role === 'admin' ? '👑 Admin' : user.role === 'teacher' ? '⚡ Teacher' : '🎓 Student'}
            </span>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{user.email}</p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/leaderboard" className="btn btn-primary btn-sm">
              🏆 View Leaderboard
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign Out
            </button>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <Link href="/admin" className="btn btn-ghost btn-sm">
                ⚡ Teacher Dashboard →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bhakti Level & Rating Card */}
      <div
        className="card animate-fadeIn"
        style={{
          padding: '1.75rem',
          marginBottom: '2rem',
          border: `1.5px solid ${stats.level.badgeBorder}`,
          background: `linear-gradient(180deg, ${stats.level.badgeBg} 0%, var(--color-surface) 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
              Devotee Standing • Bhakti-rasāmṛta-sindhu
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: stats.level.color }}>
                Level {stats.level.level}: {stats.level.title}
              </span>
              <span style={{ fontSize: '1rem', color: stats.level.color, opacity: 0.85 }}>
                ({stats.level.titleDevanagari})
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block' }}>Rating Index</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-gold)' }}>
              {stats.rating.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
            </span>
          </div>
        </div>

        {/* Verse snippet */}
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          “{stats.level.verseSnippet}” — {stats.level.verseMeaning}.
        </p>

        {/* Progress to Next Level */}
        {stats.nextLevel ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem', color: 'var(--color-muted)' }}>
              <span>Progress to Level {stats.nextLevel.level}: <strong>{stats.nextLevel.title}</strong></span>
              <span><strong>{stats.pointsToNext} pts</strong> needed</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${stats.progressPct}%`,
                  height: '100%',
                  background: stats.level.color,
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gold)', fontWeight: 700, margin: 0 }}>
            🌟 You have achieved the highest transcendental rating tier (Premī)!
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Unique Quizzes</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold)' }}>{stats.totalQuizzes}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Best Points</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.totalEarned}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Mastery Accuracy</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-2)' }}>
            {attempts.length > 0 ? `${stats.accuracyPct}%` : '—'}
          </p>
        </div>
      </div>

      {/* Attempt History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>📜 Attempt History</h2>
          <Link href="/" className="btn btn-secondary btn-sm">
            Take Another Quiz →
          </Link>
        </div>

        {loadingAttempts ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Loading past attempts...</p>
        ) : attempts.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              You haven't completed any quizzes yet.
            </p>
            <Link href="/q/mahabharata-authentic-01" className="btn btn-primary btn-sm">
              🏹 Start Mahābhārata Quiz
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {attempts.map(att => (
              <div key={att.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{att.quiz_id}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {(() => {
                      try {
                        const d = new Date(att.completed_at)
                        return isNaN(d.getTime()) ? att.completed_at : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      } catch {
                        return att.completed_at
                      }
                    })()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.85rem' }}>
                    {att.score} / {att.max_score} pts
                  </span>
                  {att.time_taken && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                      ⏱️ {Math.floor(att.time_taken / 60)}m {att.time_taken % 60}s
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
