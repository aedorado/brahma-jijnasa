'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { OmSymbol } from '@/components/OmSymbol'

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
        const { data } = await supabase
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
  }, [loading, user])

  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ animation: 'pulse 1.5s infinite' }}>
          <OmSymbol size={48} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-sm" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="card-gold" style={{ padding: '2.5rem', maxWidth: 420, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🙏</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
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
      <div className="card-gold" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--color-gold)', boxShadow: '0 0 15px rgba(212,143,24,0.3)' }}
          />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            👤
          </div>
        )}

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user.full_name}</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              {user.role === 'admin' ? '👑 Admin' : user.role === 'teacher' ? '⚡ Teacher' : '🎓 Student'}
            </span>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{user.email}</p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign Out
            </button>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <Link href="/admin" className="btn btn-primary btn-sm">
                ⚡ Open Teacher Dashboard →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Quizzes Taken</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold)' }}>{attempts.length}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Total Points</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>{totalPoints}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Average Accuracy</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-2)' }}>
            {attempts.length > 0 ? `${avgPercentage}%` : '—'}
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
