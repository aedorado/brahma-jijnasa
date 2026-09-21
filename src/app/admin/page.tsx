'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { OmSymbol } from '@/components/OmSymbol'
import { scoreQuestion } from '@/lib/scoring'
import type { Quiz, QuizMeta, QuizSession, Question } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'

interface LiveStats {
  joined: number
  completed: number
  entries: Array<{
    user_id: string
    full_name: string | null
    avatar_url: string | null
    score: number
    max_score: number
    time_taken: number | null
  }>
}

interface AttemptRecord {
  id: string
  user_id: string
  quiz_id: string
  session_id: string | null
  score: number
  max_score: number
  time_taken: number | null
  answers: Record<string | number, any>
  completed_at: string
  profiles?: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 !== 0) {
    return sorted[mid]
  }
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'analytics'>('live')
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null)
  const [liveStats, setLiveStats] = useState<LiveStats>({ joined: 0, completed: 0, entries: [] })
  const [allAttempts, setAllAttempts] = useState<AttemptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedPin, setCopiedPin] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Analytics filters & drill-down
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all')
  const [searchStudent, setSearchStudent] = useState<string>('')
  const [inspectAttempt, setInspectAttempt] = useState<AttemptRecord | null>(null)
  const [inspectQuizDetails, setInspectQuizDetails] = useState<Quiz | null>(null)
  const [loadingInspectQuiz, setLoadingInspectQuiz] = useState(false)

  // Cache for loaded full quiz definitions (questions)
  const [quizDetailsCache, setQuizDetailsCache] = useState<Record<string, Quiz>>({})

  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const loadQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) setQuizzes(await res.json())
    } catch (e) {
      console.warn('Error loading quizzes:', e)
    }
  }

  const loadActiveSession = async () => {
    try {
      const { data } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('is_active', true)
        .single()
      setActiveSession(data || null)
    } catch (e) {
      // ignore
    }
  }

  const loadAllAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*, profiles(full_name, avatar_url, email)')
        .order('completed_at', { ascending: false })

      if (data) {
        setAllAttempts(data as AttemptRecord[])
      }
    } catch (e) {
      console.warn('Error loading attempts:', e)
    }
  }

  const loadLiveStats = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, max_score, time_taken, profiles(full_name, avatar_url)')
        .eq('session_id', sessionId)
        .order('score', { ascending: false })

      if (data) {
        setLiveStats({
          joined: data.length,
          completed: data.length,
          entries: (data as any[]).map(d => ({
            user_id: d.user_id,
            full_name: d.profiles?.full_name || 'Anonymous Student',
            avatar_url: d.profiles?.avatar_url || null,
            score: d.score,
            max_score: d.max_score,
            time_taken: d.time_taken,
          })),
        })
      }
    } catch (err) {
      console.warn('Error loading live stats:', err)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      activeSession ? loadLiveStats(activeSession.id) : Promise.resolve(),
      loadAllAttempts(),
    ])
    setTimeout(() => setRefreshing(false), 400)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      router.push('/')
      return
    }

    const init = async () => {
      await Promise.all([loadQuizzes(), loadActiveSession(), loadAllAttempts()])
      setLoading(false)
    }
    init()
  }, [authLoading, user])

  // Real-time updates + 3s fallback polling when session is active
  useEffect(() => {
    if (!activeSession?.id) return
    loadLiveStats(activeSession.id)
    const interval = setInterval(() => {
      loadLiveStats(activeSession.id)
      loadAllAttempts()
    }, 3500)

    const channel = supabase
      .channel(`realtime_session_${activeSession.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_attempts' },
        () => {
          loadLiveStats(activeSession.id)
          loadAllAttempts()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [activeSession?.id])

  // Fetch full quiz details for question-by-question analytics
  useEffect(() => {
    const targetQuizId = selectedQuizFilter !== 'all' 
      ? selectedQuizFilter 
      : (allAttempts[0]?.quiz_id || quizzes[0]?.id)

    if (!targetQuizId || quizDetailsCache[targetQuizId]) return

    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quiz/${targetQuizId}`)
        if (res.ok) {
          const data = await res.json()
          setQuizDetailsCache(prev => ({ ...prev, [targetQuizId]: data }))
        }
      } catch (e) {
        console.warn('Failed to load quiz details:', e)
      }
    }
    fetchQuiz()
  }, [selectedQuizFilter, allAttempts, quizzes, quizDetailsCache])

  // Load details when inspecting an attempt
  useEffect(() => {
    if (!inspectAttempt) {
      setInspectQuizDetails(null)
      return
    }

    const qId = inspectAttempt.quiz_id
    if (quizDetailsCache[qId]) {
      setInspectQuizDetails(quizDetailsCache[qId])
      return
    }

    setLoadingInspectQuiz(true)
    fetch(`/api/quiz/${qId}`)
      .then(res => res.json())
      .then(data => {
        setQuizDetailsCache(prev => ({ ...prev, [qId]: data }))
        setInspectQuizDetails(data)
      })
      .catch(console.error)
      .finally(() => setLoadingInspectQuiz(false))
  }, [inspectAttempt, quizDetailsCache])

  const startSession = async (quizId: string) => {
    setStarting(quizId)
    const pin = String(Math.floor(1000 + Math.random() * 9000))

    const { error } = await supabase.from('quiz_sessions').insert({
      quiz_id: quizId,
      pin,
      created_by: user?.id,
    })

    if (error) {
      alert('Could not start session. Another session may already be active.')
    } else {
      await loadActiveSession()
      setActiveTab('live')
    }
    setStarting(null)
  }

  const endSession = async () => {
    if (!activeSession) return
    if (!confirm('Are you sure you want to end this live session? Students will no longer be able to submit.')) return
    await supabase
      .from('quiz_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', activeSession.id)
    setActiveSession(null)
    setLiveStats({ joined: 0, completed: 0, entries: [] })
    await loadAllAttempts()
  }

  const copyLink = (quizId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/q/${quizId}`)
    setCopiedId(quizId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyStudentLink = (pin: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/session/${pin}`)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  // Filtered attempts for Analytics
  const filteredAttempts = useMemo(() => {
    return allAttempts.filter(att => {
      const matchQuiz = selectedQuizFilter === 'all' || att.quiz_id === selectedQuizFilter
      const studentName = (att.profiles?.full_name || '').toLowerCase()
      const studentEmail = (att.profiles?.email || '').toLowerCase()
      const q = searchStudent.toLowerCase().trim()
      const matchSearch = !q || studentName.includes(q) || studentEmail.includes(q) || att.quiz_id.toLowerCase().includes(q)
      return matchQuiz && matchSearch
    })
  }, [allAttempts, selectedQuizFilter, searchStudent])

  // Analytics Metrics (Median, Mean, Max, Min, Duration)
  const analyticsMetrics = useMemo(() => {
    if (filteredAttempts.length === 0) {
      return {
        count: 0,
        meanScore: 0,
        medianScore: 0,
        meanPercentage: 0,
        medianPercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        avgDurationSecs: 0,
      }
    }

    const scores = filteredAttempts.map(a => a.score)
    const percentages = filteredAttempts.map(a => Math.round((a.score / (a.max_score || 1)) * 100))
    const durations = filteredAttempts.map(a => a.time_taken || 0).filter(t => t > 0)

    const sumScore = scores.reduce((acc, s) => acc + s, 0)
    const sumPct = percentages.reduce((acc, p) => acc + p, 0)
    const sumDur = durations.reduce((acc, d) => acc + d, 0)

    return {
      count: filteredAttempts.length,
      meanScore: Math.round((sumScore / filteredAttempts.length) * 10) / 10,
      medianScore: calculateMedian(scores),
      meanPercentage: Math.round(sumPct / filteredAttempts.length),
      medianPercentage: calculateMedian(percentages),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      avgDurationSecs: durations.length > 0 ? Math.round(sumDur / durations.length) : 0,
    }
  }, [filteredAttempts])

  // Question-by-Question Item Analysis for active quiz
  const questionDiagnostics = useMemo(() => {
    const targetQuizId = selectedQuizFilter !== 'all' 
      ? selectedQuizFilter 
      : (filteredAttempts[0]?.quiz_id || allAttempts[0]?.quiz_id)

    if (!targetQuizId || !quizDetailsCache[targetQuizId]) return null

    const quizObj = quizDetailsCache[targetQuizId]
    const quizAttempts = allAttempts.filter(a => a.quiz_id === targetQuizId)
    if (quizAttempts.length === 0) return { quiz: quizObj, questionsData: [], attemptsCount: 0 }

    const questionsData = quizObj.questions.map((q: Question) => {
      let correctCount = 0
      let partialCount = 0
      let wrongCount = 0

      quizAttempts.forEach(att => {
        const userAns = att.answers?.[q.id]
        if (userAns === undefined || userAns === null) {
          wrongCount++
          return
        }
        const res = scoreQuestion(q, userAns)
        if (res.correct) {
          correctCount++
        } else if (res.earned > 0) {
          partialCount++
        } else {
          wrongCount++
        }
      })

      const total = quizAttempts.length
      const accuracyPct = Math.round((correctCount / total) * 100)

      return {
        question: q,
        correctCount,
        partialCount,
        wrongCount,
        total,
        accuracyPct,
      }
    })

    // Sort to find easiest & toughest
    const sortedByAccuracy = [...questionsData].sort((a, b) => a.accuracyPct - b.accuracyPct)
    const toughestId = sortedByAccuracy[0]?.question.id
    const easiestId = sortedByAccuracy[sortedByAccuracy.length - 1]?.question.id

    return {
      quiz: quizObj,
      questionsData,
      attemptsCount: quizAttempts.length,
      toughestId,
      easiestId,
    }
  }, [selectedQuizFilter, filteredAttempts, allAttempts, quizDetailsCache])

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div style={{ marginBottom: '1rem', animation: 'pulse 1.5s ease infinite' }}>
            <OmSymbol size={52} />
          </div>
          <p className="text-muted">Loading Admin & Teacher Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 0 5rem' }}>
      <div className="container">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Teacher & Admin Dashboard</h1>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                {user?.role === 'admin' ? '👑 Admin' : '⚡ Teacher'}
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Launch live sessions with 4-digit PINs, monitor student progress, and inspect deep question-level analytics.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              {refreshing ? 'Updating...' : 'Refresh Data'}
            </button>
            <Link href="/" className="btn btn-ghost btn-sm">
              ← View Quizzes
            </Link>
          </div>
        </div>

        {/* Dashboard Main Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('live')}
            className={`btn btn-sm ${activeTab === 'live' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
          >
            <span>⚡</span> Live Sessions & PINs
            {activeSession && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
          >
            <span>📊</span> Analytics & Question Insights
            <span className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}>
              {allAttempts.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LIVE SESSIONS & PIN CONTROL                                        */}
        {/* ========================================================================= */}
        {activeTab === 'live' && (
          <div>
            {/* Active Session Panel */}
            {activeSession ? (
              <div className="card-gold animate-fadeIn" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                        LIVE REALTIME SESSION
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        WebSocket stream + 3.5s auto-poll
                      </span>
                    </div>
                    <p style={{ fontSize: '1rem', color: 'var(--color-text)', fontWeight: 600 }}>
                      Active Quiz: <span style={{ color: 'var(--color-gold)' }}>{activeSession.quiz_id}</span>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button className="btn btn-danger btn-sm" onClick={endSession} id="end-session-btn">
                      End Session
                    </button>
                  </div>
                </div>

                {/* BIG PIN Display */}
                <div className="text-center" style={{ marginBottom: '2rem', background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--color-border-gold)' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.65rem', fontWeight: 500 }}>
                    Share this 4-digit PIN with your students:
                  </p>
                  <div className="pin-display" style={{ fontSize: '3.6rem', letterSpacing: '0.25em', margin: '0.5rem 0' }}>
                    {activeSession.pin}
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => copyStudentLink(activeSession.pin)}
                    >
                      {copiedPin ? '✓ Student Link Copied!' : '📋 Copy Direct Student Link'}
                    </button>
                    <a
                      href={`/session/${activeSession.pin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      Open Student View ↗
                    </a>
                  </div>
                </div>

                {/* Live Stats KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Completed Submissions</p>
                    <p style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-gold)', lineHeight: 1 }}>{liveStats.completed}</p>
                  </div>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Live Class Average</p>
                    <p style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>
                      {liveStats.entries.length > 0 
                        ? `${Math.round((liveStats.entries.reduce((acc, cur) => acc + (cur.score / (cur.max_score || 1)), 0) / liveStats.entries.length) * 100)}%` 
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Live Leaderboard */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📊 Real-Time Class Rankings
                    </h3>
                  </div>

                  {liveStats.entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', animation: 'bounce 2s infinite' }}>📡</div>
                      <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                        Waiting for student submissions...
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                        Tell students to enter PIN <strong style={{ color: 'var(--color-gold)' }}>{activeSession.pin}</strong> at {typeof window !== 'undefined' ? window.location.host : 'the site'}.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {liveStats.entries.map((entry, i) => (
                        <div 
                          key={entry.user_id + i} 
                          className="leaderboard-row animate-fadeIn"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            padding: '0.9rem 1.25rem', 
                            background: 'var(--color-surface)',
                            borderRadius: 12,
                            border: i === 0 ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border)',
                          }}
                        >
                          <span className={`rank-badge rank-${i < 3 ? i + 1 : 'n'}`} style={{ width: 32, height: 32, fontSize: '0.85rem' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </span>
                          {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--color-gold)' }} />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                              👤
                            </div>
                          )}
                          <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>
                            {entry.full_name}
                          </span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                              {entry.score} <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 400 }}>/ {entry.max_score} pts</span>
                            </span>
                            {entry.time_taken && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', margin: 0 }}>
                                ⏱ {Math.floor(entry.time_taken / 60)}m {entry.time_taken % 60}s
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No Active Session State */
              <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border-gold)', textAlign: 'center' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>No Active Live Session</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', maxWidth: 500, margin: '0 auto 1.25rem' }}>
                  Pick a quiz below and click <strong>&quot;Start Session&quot;</strong> to generate a unique 4-digit PIN for your classroom.
                </p>
              </div>
            )}

            {/* Quizzes to Launch */}
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Available Scripture Quizzes
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {quizzes.map(quiz => (
                <div key={quiz.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{CATEGORY_ICONS[quiz.category] || '📚'}</span>
                      <span className={`badge badge-${quiz.difficulty}`}>{quiz.difficulty.toUpperCase()}</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{quiz.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                      {quiz.description}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>
                        {CATEGORY_LABELS[quiz.category] || quiz.category}
                      </span>
                      <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                        {quiz.totalQuestions} Qs
                      </span>
                      {quiz.timeLimit && (
                        <span className="badge badge-muted" style={{ fontSize: '0.75rem' }}>
                          ⏱ {Math.round(quiz.timeLimit / 60)}M
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={starting === quiz.id || !!activeSession}
                      onClick={() => startSession(quiz.id)}
                    >
                      {starting === quiz.id ? 'Starting...' : '▶ Start Session'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyLink(quiz.id)}
                      title="Copy Direct Practice Link"
                    >
                      {copiedId === quiz.id ? '✓ Copied' : '🔗'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ANALYTICS & QUESTION INTELLIGENCE                                  */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div>
            {/* Filter Bar */}
            <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    Filter by Quiz
                  </label>
                  <select
                    value={selectedQuizFilter}
                    onChange={e => setSelectedQuizFilter(e.target.value)}
                    style={{
                      background: 'var(--color-surface-2)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      minWidth: 220,
                    }}
                  >
                    <option value="all">All Quizzes ({allAttempts.length} attempts)</option>
                    {quizzes.map(q => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    Search Student
                  </label>
                  <input
                    type="text"
                    placeholder="Search by student name or email..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                    style={{
                      background: 'var(--color-surface-2)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      minWidth: 240,
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                Showing <strong>{filteredAttempts.length}</strong> of {allAttempts.length} submissions
              </div>
            </div>

            {/* COHORT SUMMARY KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              {/* Total Attempts */}
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>Total Attempts</p>
                <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-gold)', lineHeight: 1 }}>
                  {analyticsMetrics.count}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Submissions logged
                </span>
              </div>

              {/* MEDIAN SCORE (User requested) */}
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', border: '1.5px solid var(--color-gold)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-gold)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  ⚖️ MEDIAN SCORE
                </p>
                <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-gold)', lineHeight: 1 }}>
                  {analyticsMetrics.medianScore} <span style={{ fontSize: '1rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem', display: 'block' }}>
                  {analyticsMetrics.medianPercentage}% (50th percentile)
                </span>
              </div>

              {/* Mean (Average) Score */}
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>Mean (Average) Score</p>
                <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>
                  {analyticsMetrics.meanScore} <span style={{ fontSize: '1rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem', display: 'block' }}>
                  {analyticsMetrics.meanPercentage}% accuracy
                </span>
              </div>

              {/* Score Range */}
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>Score Range</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
                  {analyticsMetrics.lowestScore} – {analyticsMetrics.highestScore} <span style={{ fontSize: '0.9rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Min vs Max earned
                </span>
              </div>

              {/* Average Duration */}
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>Average Time Taken</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent-2)', lineHeight: 1.2 }}>
                  {analyticsMetrics.avgDurationSecs > 0 
                    ? `${Math.floor(analyticsMetrics.avgDurationSecs / 60)}m ${analyticsMetrics.avgDurationSecs % 60}s` 
                    : '—'}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Per completed attempt
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* QUESTION-BY-QUESTION ITEM ANALYSIS (RIGHT vs WRONG BREAKDOWN)             */}
            {/* ========================================================================= */}
            {questionDiagnostics && questionDiagnostics.questionsData.length > 0 && (
              <div className="card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      🎯 Question-by-Question Diagnostics
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      Analyzing {questionDiagnostics.attemptsCount} student responses for <strong>{questionDiagnostics.quiz.title}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-success)' }} /> Correct
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-gold)' }} /> Partial
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-error)' }} /> Incorrect
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {questionDiagnostics.questionsData.map((item) => {
                    const isToughest = item.question.id === questionDiagnostics.toughestId && item.accuracyPct < 70
                    const isEasiest = item.question.id === questionDiagnostics.easiestId && item.accuracyPct > 60

                    return (
                      <div 
                        key={item.question.id}
                        style={{
                          padding: '1.1rem 1.25rem',
                          background: 'var(--color-surface-2)',
                          borderRadius: 12,
                          border: isToughest ? '1.5px solid var(--color-error)' : isEasiest ? '1.5px solid var(--color-success)' : '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.65rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-gold)' }}>
                                Q{item.question.id}
                              </span>
                              <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                                {item.question.type}
                              </span>
                              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                                {item.question.points} pts
                              </span>

                              {isToughest && (
                                <span className="badge badge-danger" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                  🔥 TOUGHEST QUESTION (Needs Review)
                                </span>
                              )}
                              {isEasiest && (
                                <span className="badge badge-success" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                  🌟 HIGHEST MASTERY
                                </span>
                              )}
                            </div>

                            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4 }}>
                              {item.question.question}
                            </p>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span 
                              style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: 800, 
                                color: item.accuracyPct >= 75 ? 'var(--color-success)' : item.accuracyPct >= 50 ? 'var(--color-gold)' : 'var(--color-error)' 
                              }}
                            >
                              {item.accuracyPct}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block' }}>
                              {item.correctCount}/{item.total} correct
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Breakdown */}
                        <div style={{ height: 8, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${(item.correctCount / item.total) * 100}%`, background: 'var(--color-success)' }} title={`Correct: ${item.correctCount}`} />
                          <div style={{ width: `${(item.partialCount / item.total) * 100}%`, background: 'var(--color-gold)' }} title={`Partial: ${item.partialCount}`} />
                          <div style={{ width: `${(item.wrongCount / item.total) * 100}%`, background: 'var(--color-error)' }} title={`Wrong: ${item.wrongCount}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* WHO ATTEMPTED & SUBMISSIONS TABLE                                         */}
            {/* ========================================================================= */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    📋 Student Attempt Records
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Detailed log of who attempted the quiz, their scores, accuracy, and full answer sheets.
                  </p>
                </div>
              </div>

              {filteredAttempts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>No student attempts found.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    {allAttempts.length === 0 ? 'No students have taken quizzes yet.' : 'Try adjusting your search or quiz filter.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Quiz Title</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Accuracy</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Time Taken</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Mode</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttempts.map((att) => {
                        const pct = Math.round((att.score / (att.max_score || 1)) * 100)
                        return (
                          <tr 
                            key={att.id} 
                            style={{ 
                              borderBottom: '1px solid var(--color-border)',
                              fontSize: '0.9rem',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            {/* Student */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {att.profiles?.avatar_url ? (
                                  <img 
                                    src={att.profiles.avatar_url} 
                                    alt="" 
                                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--color-gold)' }} 
                                  />
                                ) : (
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                    👤
                                  </div>
                                )}
                                <div>
                                  <p style={{ fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>
                                    {att.profiles?.full_name || 'Anonymous Student'}
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                                    {att.profiles?.email || att.user_id.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Quiz ID */}
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: 'var(--color-gold)' }}>
                              {att.quiz_id}
                            </td>

                            {/* Score */}
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                              {att.score} <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>/ {att.max_score} pts</span>
                            </td>

                            {/* Accuracy */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span 
                                className={`badge ${pct >= 75 ? 'badge-success' : pct >= 50 ? 'badge-gold' : 'badge-danger'}`}
                                style={{ fontSize: '0.75rem', fontWeight: 700 }}
                              >
                                {pct}%
                              </span>
                            </td>

                            {/* Time Taken */}
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                              {att.time_taken ? `⏱ ${Math.floor(att.time_taken / 60)}m ${att.time_taken % 60}s` : '—'}
                            </td>

                            {/* Mode */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              {att.session_id ? (
                                <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                                  PIN Live
                                </span>
                              ) : (
                                <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                                  Direct Practice
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                              {(() => {
                                try {
                                  const d = new Date(att.completed_at)
                                  return isNaN(d.getTime()) ? att.completed_at : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                                } catch {
                                  return att.completed_at
                                }
                              })()}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setInspectAttempt(att)}
                                style={{ fontSize: '0.75rem', gap: '0.3rem' }}
                              >
                                🔍 Inspect
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STUDENT ANSWER SHEET INSPECTOR MODAL                                      */}
        {/* ========================================================================= */}
        {inspectAttempt && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setInspectAttempt(null)}
          >
            <div 
              className="card animate-scaleUp"
              style={{
                background: 'var(--color-surface)',
                maxWidth: 800,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                borderRadius: 16,
                border: '1.5px solid var(--color-gold)',
                position: 'relative',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {inspectAttempt.profiles?.avatar_url ? (
                    <img 
                      src={inspectAttempt.profiles.avatar_url} 
                      alt="" 
                      style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--color-gold)' }} 
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                      👤
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                      {inspectAttempt.profiles?.full_name || 'Anonymous Student'}&apos;s Answers
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      Quiz: <strong style={{ color: 'var(--color-gold)' }}>{inspectAttempt.quiz_id}</strong> • Score: <strong>{inspectAttempt.score} / {inspectAttempt.max_score} pts</strong> ({Math.round((inspectAttempt.score / (inspectAttempt.max_score || 1)) * 100)}%)
                    </p>
                  </div>
                </div>

                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setInspectAttempt(null)}
                  style={{ fontSize: '1.1rem', padding: '0.2rem 0.6rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Questions List */}
              {loadingInspectQuiz ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                  <p className="text-muted" style={{ marginTop: '0.5rem' }}>Loading question key...</p>
                </div>
              ) : inspectQuizDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {inspectQuizDetails.questions.map((q: Question, idx: number) => {
                    const studentAns = inspectAttempt.answers?.[q.id]
                    const qRes = studentAns !== undefined ? scoreQuestion(q, studentAns) : { earned: 0, max: q.points, correct: false }

                    return (
                      <div 
                        key={q.id}
                        style={{
                          padding: '1.25rem',
                          borderRadius: 12,
                          background: qRes.correct ? 'rgba(82, 196, 133, 0.08)' : qRes.earned > 0 ? 'rgba(212, 143, 24, 0.08)' : 'rgba(224, 86, 74, 0.08)',
                          border: `1.5px solid ${qRes.correct ? 'var(--color-success)' : qRes.earned > 0 ? 'var(--color-gold)' : 'var(--color-error)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-gold)' }}>
                            Question {idx + 1} ({q.type})
                          </span>
                          <span 
                            className={`badge ${qRes.correct ? 'badge-success' : qRes.earned > 0 ? 'badge-gold' : 'badge-danger'}`}
                            style={{ fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {qRes.correct ? `✓ Correct (+${qRes.earned} pts)` : qRes.earned > 0 ? `~ Partial (+${qRes.earned}/${qRes.max} pts)` : `✗ Incorrect (0/${qRes.max} pts)`}
                          </span>
                        </div>

                        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
                          {q.question}
                        </p>

                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <strong style={{ color: 'var(--color-muted)' }}>Student Answer: </strong>
                            <span>{studentAns === undefined ? '— Unanswered —' : JSON.stringify(studentAns)}</span>
                          </div>
                        </div>

                        {q.explanation && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
                            💡 <strong>Explanation: </strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p className="text-muted">Could not load question metadata for this quiz.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
