'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { QuizMeta, QuizSession, Category, AnswerMap } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'
import { FlashcardReviewModal } from '@/components/FlashcardReviewModal'

interface UserAttemptSummary {
  id: string
  quiz_id: string
  session_id: string | null
  score: number
  max_score: number
  percentage: number
  time_taken: number | null
  completed_at: string
  answers?: AnswerMap
}

type TabMode = 'live' | 'review'
type LiveSubFilter = 'all' | 'unattempted' | 'completed'

export default function LiveQuizzesPage() {
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const { language, t } = useLanguage()
  const supabase = createClient()

  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [activeSessions, setActiveSessions] = useState<QuizSession[]>([])
  const [userAttempts, setUserAttempts] = useState<UserAttemptSummary[]>([])
  const [loading, setLoading] = useState(true)

  // View Mode
  const [tabMode, setTabMode] = useState<TabMode>('live')
  const [liveSubFilter, setLiveSubFilter] = useState<LiveSubFilter>('all')

  // Direct PIN Entry fallback
  const [manualPin, setManualPin] = useState('')

  // Flashcard review modal
  const [selectedReview, setSelectedReview] = useState<{
    quizId: string
    title: string
    answers?: AnswerMap
  } | null>(null)

  // 1. Fetch Quizzes Metadata
  const loadQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) {
        const data: QuizMeta[] = await res.json()
        setQuizzes(data)
      }
    } catch (err) {
      console.warn('Failed to load quizzes:', err)
    }
  }

  // 2. Fetch Active Live Sessions
  const loadActiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })

      if (!error && data) {
        setActiveSessions(data as QuizSession[])
      }
    } catch (err) {
      console.warn('Failed to load active live sessions:', err)
    }
  }

  // 3. Fetch User Attempts (if logged in)
  const loadUserAttempts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, session_id, score, max_score, time_taken, completed_at, answers')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      if (!error && data) {
        const list: UserAttemptSummary[] = data.map(att => {
          const score = Number(att.score || 0)
          const max = Number(att.max_score || 0)
          const percentage = max > 0 ? Math.round((score / max) * 100) : 0
          return {
            id: att.id,
            quiz_id: att.quiz_id,
            session_id: att.session_id,
            score,
            max_score: max,
            percentage,
            time_taken: att.time_taken,
            completed_at: att.completed_at,
            answers: att.answers,
          }
        })
        setUserAttempts(list)
      }
    } catch (err) {
      console.warn('Failed to load user attempts:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        loadQuizzes(),
        loadActiveSessions(),
        user ? loadUserAttempts(user.id) : Promise.resolve(),
      ])
      setLoading(false)
    }
    init()

    // Realtime channel: Listen to quiz_sessions changes
    const channel = supabase
      .channel('live_quizzes_active_radar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_sessions' },
        () => {
          loadActiveSessions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Lookup map: quiz_id -> QuizMeta
  const quizMetaMap = useMemo(() => {
    const map = new Map<string, QuizMeta>()
    quizzes.forEach(q => map.set(q.id, q))
    return map
  }, [quizzes])

  // Map user attempts by session_id and quiz_id
  const userAttemptLookup = useMemo(() => {
    const bySession = new Map<string, UserAttemptSummary>()
    const byQuiz = new Map<string, UserAttemptSummary>()

    userAttempts.forEach(att => {
      if (att.session_id) bySession.set(att.session_id, att)
      if (!byQuiz.has(att.quiz_id) || byQuiz.get(att.quiz_id)!.score < att.score) {
        byQuiz.set(att.quiz_id, att)
      }
    })

    return { bySession, byQuiz }
  }, [userAttempts])

  // Live session items with attempt info
  const liveItems = useMemo(() => {
    return activeSessions.map(session => {
      const meta = quizMetaMap.get(session.quiz_id)
      const sessionAttempt = userAttemptLookup.bySession.get(session.id)
      const pastQuizAttempt = userAttemptLookup.byQuiz.get(session.quiz_id)
      const attempt = sessionAttempt || pastQuizAttempt
      // A user is considered attempted in this live room only if they actually submitted to this specific session
      const isAttempted = !!sessionAttempt
      return {
        session,
        meta,
        attempt,
        isAttempted,
        isPastQuizAttempted: !!pastQuizAttempt && !sessionAttempt,
      }
    })
  }, [activeSessions, quizMetaMap, userAttemptLookup])

  // Filtered live items based on subfilter (unattempted vs completed)
  const filteredLiveItems = useMemo(() => {
    if (liveSubFilter === 'unattempted') return liveItems.filter(item => !item.isAttempted)
    if (liveSubFilter === 'completed') return liveItems.filter(item => item.isAttempted)
    return liveItems
  }, [liveItems, liveSubFilter])

  // Counts
  const unattemptedLiveCount = liveItems.filter(item => !item.isAttempted).length
  const completedLiveCount = liveItems.filter(item => item.isAttempted).length

  // Past unique completed quizzes for the review tab
  const pastAttemptsList = useMemo(() => {
    return Array.from(userAttemptLookup.byQuiz.values())
  }, [userAttemptLookup])

  const handleManualPinJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = manualPin.trim()
    if (!clean) return
    router.push(`/session/${clean}`)
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1rem 6rem', maxWidth: 960 }}>
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '2.25rem', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.9rem',
            borderRadius: 20,
            background: 'rgba(74, 222, 128, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            color: '#4ade80',
            fontSize: '0.8rem',
            fontWeight: 800,
            marginBottom: '0.75rem',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
          LIVE CLASSROOM ROOMS
        </div>

        <h1 style={{ fontSize: '2.3rem', fontWeight: 900, marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
          Live Quizzes
        </h1>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', maxWidth: 620, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
          Currently active live quizzes started by your teachers. Join to attempt in real time, or review questions from your completed live rounds.
        </p>

        {/* PRIMARY MODE TABS: LIVE QUIZZES vs REVIEW PAST ATTEMPTS */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.3rem',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            gap: '0.35rem',
          }}
        >
          <button
            className={`btn btn-sm ${tabMode === 'live' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setTabMode('live')}
            style={{ fontWeight: 800, padding: '0.45rem 1.25rem', borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeSessions.length > 0 ? '#4ade80' : 'var(--color-muted)' }} />
            Active Live Quizzes ({activeSessions.length})
          </button>

          {user && (
            <button
              className={`btn btn-sm ${tabMode === 'review' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setTabMode('review')}
              style={{ fontWeight: 700, padding: '0.45rem 1.25rem', borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <span>🎴</span> Review My Attempts ({pastAttemptsList.length})
            </button>
          )}
        </div>
      </div>

      {/* GUEST NOTICE BANNER (If not logged in) */}
      {!user && !authLoading && (
        <div
          className="card"
          style={{
            padding: '1.25rem 1.75rem',
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(232, 118, 10, 0.04))',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🙏</span>
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
                Sign in to save your live quiz scores & question reviews
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', margin: 0 }}>
                Logging in preserves your quiz history, allows you to review wrong answers, and updates your student ranking.
              </p>
            </div>
          </div>

          <button
            className="btn btn-gold btn-sm"
            onClick={() => login('/quizzes')}
            style={{ fontWeight: 700, padding: '0.5rem 1.25rem' }}
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: ACTIVE LIVE QUIZZES ONLY */}
      {/* ========================================================================= */}
      {tabMode === 'live' && (
        <div>
          {/* SUBFILTER PILLS: ALL / UNATTEMPTED / COMPLETED */}
          {activeSessions.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                padding: '0.75rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                  Show:
                </span>
                <button
                  className={`btn btn-xs ${liveSubFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLiveSubFilter('all')}
                  style={{ borderRadius: 6, fontWeight: 700 }}
                >
                  All Active ({activeSessions.length})
                </button>
                <button
                  className={`btn btn-xs ${liveSubFilter === 'unattempted' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLiveSubFilter('unattempted')}
                  style={{ borderRadius: 6, fontWeight: 700 }}
                >
                  🎯 To Attempt ({unattemptedLiveCount})
                </button>
                <button
                  className={`btn btn-xs ${liveSubFilter === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLiveSubFilter('completed')}
                  style={{ borderRadius: 6, fontWeight: 700 }}
                >
                  ✅ Completed ({completedLiveCount})
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                Realtime Synchronized
              </div>
            </div>
          )}

          {/* LOADING SPINNER */}
          {loading ? (
            <div style={{ minHeight: '35vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner-gold" />
            </div>
          ) : filteredLiveItems.length === 0 ? (
            /* EMPTY STATE: NO LIVE QUIZZES ACTIVE RIGHT NOW */
            <div
              className="card text-center"
              style={{
                padding: '3.5rem 2rem',
                background: 'var(--glass-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(212, 175, 55, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  fontSize: '2.2rem',
                }}
              >
                📡
              </div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                {activeSessions.length === 0
                  ? 'No Live Quizzes Active Right Now'
                  : 'No Live Quizzes Match this Filter'}
              </h3>

              <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', maxWidth: 480, margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                {activeSessions.length === 0
                  ? 'When your teacher starts a live room, it will appear here automatically in real time without refreshing.'
                  : 'You have completed all active rooms under this filter.'}
              </p>

              {activeSessions.length > 0 && liveSubFilter !== 'all' && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-gold btn-sm"
                    onClick={() => setLiveSubFilter('all')}
                    style={{ fontWeight: 700 }}
                  >
                    👀 Show All Active Rooms ({activeSessions.length})
                  </button>
                </div>
              )}

              {/* MANUAL PIN INPUT FALLBACK */}
              <div
                style={{
                  maxWidth: 360,
                  margin: '0 auto',
                  padding: '1.25rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--color-gold)' }}>
                  Have a 4-Digit Classroom PIN?
                </div>
                <form onSubmit={handleManualPinJoin} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Enter PIN"
                    value={manualPin}
                    onChange={e => setManualPin(e.target.value.replace(/\D/g, ''))}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                    }}
                  />
                  <button type="submit" className="btn btn-gold btn-sm" disabled={manualPin.length !== 4 && manualPin !== '000' && manualPin !== '0000'}>
                    Join
                  </button>
                </form>

                <div style={{ marginTop: '0.75rem' }}>
                  <Link
                    href="/session/0000"
                    style={{ fontSize: '0.78rem', color: 'var(--color-muted)', textDecoration: 'underline' }}
                  >
                    ✨ Or try test demo room (PIN: 0000)
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE LIVE QUIZZES LIST */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredLiveItems.map(({ session, meta, attempt, isAttempted }) => {
                const title = meta?.title || session.quiz_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                const category = meta?.category || 'general'
                const totalQuestions = meta?.totalQuestions ?? 20
                const difficulty = meta?.difficulty || 'medium'
                const timeMinutes = Math.round((meta?.timeLimit || 720) / 60)

                return (
                  <div
                    key={session.id}
                    className="card-gold animate-fadeIn"
                    style={{
                      padding: '1.75rem',
                      border: isAttempted ? '1px solid var(--color-border-gold)' : '1.5px solid #4ade80',
                      background: isAttempted
                        ? 'var(--glass-bg)'
                        : 'linear-gradient(135deg, rgba(74, 222, 128, 0.06) 0%, rgba(0, 0, 0, 0.35) 100%)',
                      boxShadow: isAttempted ? undefined : '0 0 20px rgba(74, 222, 128, 0.12)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1.5rem',
                    }}
                  >
                    {/* Left: Info & Badges */}
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                          LIVE SESSION
                        </span>

                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            color: '#4ade80',
                            fontFamily: 'monospace',
                            letterSpacing: '0.08em',
                            background: 'rgba(74, 222, 128, 0.12)',
                            padding: '0.15rem 0.55rem',
                            borderRadius: 6,
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                          }}
                        >
                          PIN {session.pin}
                        </span>

                        <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                          {CATEGORY_ICONS[category as Category] || '📜'} {CATEGORY_LABELS[category as Category] || category}
                        </span>

                        {isAttempted ? (
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: attempt!.percentage >= 75 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                              color: attempt!.percentage >= 75 ? '#4ade80' : 'var(--color-gold)',
                              border: attempt!.percentage >= 75 ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(217, 119, 6, 0.3)',
                            }}
                          >
                            ✓ Completed • {attempt!.score}/{attempt!.max_score} ({attempt!.percentage}%)
                          </span>
                        ) : (
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            🎯 Ready to Attempt
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                        {title}
                      </h3>

                      {meta?.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.85rem', lineHeight: 1.45, maxWidth: 640 }}>
                          {meta.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        <span>📝 {totalQuestions} Questions</span>
                        <span>•</span>
                        <span>⏱️ {timeMinutes} Mins</span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {difficulty === 'easy' ? '🟢 Easy' : difficulty === 'hard' ? '🔴 Hard' : '🟡 Medium'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 200 }}>
                      {isAttempted ? (
                        <button
                          className="btn btn-gold w-full"
                          onClick={() => {
                            setSelectedReview({
                              quizId: session.quiz_id,
                              title,
                              answers: attempt?.answers,
                            })
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                          }}
                        >
                          <span>🎴</span> Review My Answers
                        </button>
                      ) : (
                        <Link
                          href={`/session/${session.pin}`}
                          className="btn btn-primary w-full"
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.45rem',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            padding: '0.75rem 1.25rem',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <span>⚡</span> Attempt Live Quiz
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: REVIEW MY PAST ATTEMPTS */}
      {/* ========================================================================= */}
      {tabMode === 'review' && (
        <div>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              Completed Quizzes & Score Review
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              {pastAttemptsList.length} Quizzes Completed
            </span>
          </div>

          {pastAttemptsList.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                No completed quizzes yet
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Join an active live quiz or series round to start recording your scores!
              </p>
              <button className="btn btn-gold btn-sm" onClick={() => setTabMode('live')}>
                View Active Live Quizzes →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pastAttemptsList.map(att => {
                const meta = quizMetaMap.get(att.quiz_id)
                const title = meta?.title || att.quiz_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                const category = meta?.category || 'general'

                return (
                  <div
                    key={att.id}
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                          {CATEGORY_ICONS[category as Category] || '📜'} {CATEGORY_LABELS[category as Category] || category}
                        </span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: att.percentage >= 75 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                            color: att.percentage >= 75 ? '#4ade80' : 'var(--color-gold)',
                          }}
                        >
                          {att.score} / {att.max_score} pts ({att.percentage}%)
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
                        {title}
                      </h3>

                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        Completed: {(() => {
                          try {
                            const d = new Date(att.completed_at)
                            return isNaN(d.getTime()) ? att.completed_at : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                          } catch {
                            return att.completed_at
                          }
                        })()}
                        {att.time_taken ? ` • ⏱️ ${Math.floor(att.time_taken / 60)}m ${att.time_taken % 60}s` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        className="btn btn-gold btn-sm"
                        onClick={() => {
                          setSelectedReview({
                            quizId: att.quiz_id,
                            title,
                            answers: att.answers,
                          })
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.82rem' }}
                      >
                        <span>🎴</span> Review Flashcards
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* FLASHCARD REVIEW MODAL */}
      {selectedReview && (
        <FlashcardReviewModal
          quizId={selectedReview.quizId}
          quizTitle={selectedReview.title}
          userAnswers={selectedReview.answers || {}}
          isOpen={true}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  )
}
