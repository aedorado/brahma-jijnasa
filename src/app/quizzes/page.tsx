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
  score: number
  max_score: number
  percentage: number
  time_taken: number | null
  completed_at: string
  answers?: AnswerMap
}

type StatusFilter = 'all' | 'live' | 'unattempted' | 'completed'

export default function QuizzesHubPage() {
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const { language, t } = useLanguage()
  const supabase = createClient()

  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [activeSessions, setActiveSessions] = useState<QuizSession[]>([])
  const [attemptsMap, setAttemptsMap] = useState<Record<string, UserAttemptSummary>>({})
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Flashcard review modal
  const [selectedReview, setSelectedReview] = useState<{
    quizId: string
    title: string
    answers?: AnswerMap
  } | null>(null)

  // 1. Fetch Quizzes Catalog
  const loadQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) {
        const data: QuizMeta[] = await res.json()
        setQuizzes(data)
      }
    } catch (err) {
      console.warn('Failed to load quizzes catalog:', err)
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
      console.warn('Failed to load live sessions:', err)
    }
  }

  // 3. Fetch User Attempts (if logged in)
  const loadUserAttempts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, score, max_score, time_taken, completed_at, answers')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      if (!error && data) {
        const map: Record<string, UserAttemptSummary> = {}
        for (const att of data) {
          const score = Number(att.score || 0)
          const max = Number(att.max_score || 0)
          const percentage = max > 0 ? Math.round((score / max) * 100) : 0
          // Keep best or most recent
          if (!map[att.quiz_id] || map[att.quiz_id].score < score) {
            map[att.quiz_id] = {
              id: att.id,
              quiz_id: att.quiz_id,
              score,
              max_score: max,
              percentage,
              time_taken: att.time_taken,
              completed_at: att.completed_at,
              answers: att.answers,
            }
          }
        }
        setAttemptsMap(map)
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

    // Realtime subscription to live sessions so active session lights up dynamically
    const channel = supabase
      .channel('quizzes_hub_live_sessions')
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

  // Computed Metrics
  const metrics = useMemo(() => {
    const totalQuizzes = quizzes.length
    const liveSessionMap = new Map<string, QuizSession>()
    activeSessions.forEach(s => liveSessionMap.set(s.quiz_id, s))

    let completedCount = 0
    let totalScoreEarned = 0
    let unattemptedCount = 0

    quizzes.forEach(q => {
      const att = attemptsMap[q.id]
      if (att) {
        completedCount++
        totalScoreEarned += att.score
      } else {
        unattemptedCount++
      }
    })

    return {
      totalQuizzes,
      liveCount: activeSessions.length,
      completedCount,
      unattemptedCount,
      totalScoreEarned,
      liveSessionMap,
    }
  }, [quizzes, activeSessions, attemptsMap])

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      const isLive = metrics.liveSessionMap.has(q.id)
      const isAttempted = !!attemptsMap[q.id]

      // Status filter
      if (statusFilter === 'live' && !isLive) return false
      if (statusFilter === 'unattempted' && isAttempted) return false
      if (statusFilter === 'completed' && !isAttempted) return false

      // Category filter
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false

      // Difficulty filter
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = q.title.toLowerCase().includes(query)
        const matchDesc = q.description?.toLowerCase().includes(query)
        const matchCategory = q.category?.toLowerCase().includes(query)
        const matchId = q.id.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchCategory && !matchId) return false
      }

      return true
    })
  }, [quizzes, statusFilter, selectedCategory, selectedDifficulty, searchQuery, metrics.liveSessionMap, attemptsMap])

  const categories = ['all', 'bhagavad-gita', 'puranas', 'mahabharata', 'caitanya', 'upanishads', 'vedas', 'general']

  return (
    <div className="container" style={{ padding: '2.5rem 1rem 6rem', maxWidth: 1140 }}>
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.9rem',
            borderRadius: 20,
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid var(--color-border-gold)',
            color: 'var(--color-gold)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
          }}
        >
          <span>📜</span> SCRIPTURE LIBRARY & LIVE QUIZZES
        </div>

        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          Explore, Attempt & Review Quizzes
        </h1>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', maxWidth: 660, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          Join live classroom rounds in real-time, test your realization on unattempted scriptures, or review your completed answers with interactive flashcards.
        </p>

        {/* METRICS STRIP */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            padding: '0.9rem 1.75rem',
            borderRadius: 16,
            background: 'var(--glass-bg)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Live Sessions Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: metrics.liveCount > 0 ? '#4ade80' : 'var(--color-muted)',
                display: 'inline-block',
                boxShadow: metrics.liveCount > 0 ? '0 0 10px #4ade80' : undefined,
                animation: metrics.liveCount > 0 ? 'pulse 1.5s infinite' : undefined,
              }}
            />
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
              {metrics.liveCount} {metrics.liveCount === 1 ? 'Live Room' : 'Live Rooms'}
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1rem' }}>🎯</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              {metrics.unattemptedCount} To Attempt
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1rem' }}>✅</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              {metrics.completedCount} Completed
            </span>
          </div>

          {user && (
            <>
              <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1rem' }}>🌟</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                  {metrics.totalScoreEarned} Total Pts
                </span>
              </div>
            </>
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
                Track your spiritual progress across all scriptures
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', margin: 0 }}>
                Sign in with Google to automatically track completed quizzes, view detailed question reviews, and save your bhakti stage rating.
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

      {/* ACTIVE LIVE SESSIONS BANNER (If any live sessions are running) */}
      {metrics.liveCount > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#4ade80',
                display: 'inline-block',
                boxShadow: '0 0 10px #4ade80',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#4ade80' }}>
              Happening Right Now: Live Classroom Rooms
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {activeSessions.map(session => {
              const quizInfo = quizzes.find(q => q.id === session.quiz_id)
              return (
                <div
                  key={session.id}
                  className="card-gold"
                  style={{
                    padding: '1.5rem',
                    border: '1.5px solid #4ade80',
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), rgba(0, 0, 0, 0.4))',
                    boxShadow: '0 0 20px rgba(74, 222, 128, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                        LIVE SESSION
                      </span>
                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 900,
                          color: '#4ade80',
                          letterSpacing: '0.1em',
                          fontFamily: 'monospace',
                          background: 'rgba(74, 222, 128, 0.12)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 6,
                          border: '1px solid rgba(74, 222, 128, 0.3)',
                        }}
                      >
                        PIN {session.pin}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                      {quizInfo?.title || session.quiz_id.replace(/-/g, ' ')}
                    </h3>

                    {quizInfo?.description && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                        {quizInfo.description}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/session/${session.pin}`}
                    className="btn btn-primary w-full"
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                    }}
                  >
                    <span>⚡</span> Join Live Session (PIN: {session.pin})
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        {/* Top: Status Tabs & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Status Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.25rem',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: '0.25rem',
            }}
          >
            <button
              className={`btn btn-xs ${statusFilter === 'all' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('all')}
              style={{ fontWeight: 700, padding: '0.4rem 0.85rem', borderRadius: 8 }}
            >
              All Quizzes ({quizzes.length})
            </button>
            <button
              className={`btn btn-xs ${statusFilter === 'live' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('live')}
              style={{ fontWeight: 700, padding: '0.4rem 0.85rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: metrics.liveCount > 0 ? '#4ade80' : 'var(--color-muted)' }} />
              Live Now ({metrics.liveCount})
            </button>
            <button
              className={`btn btn-xs ${statusFilter === 'unattempted' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('unattempted')}
              style={{ fontWeight: 700, padding: '0.4rem 0.85rem', borderRadius: 8 }}
            >
              🎯 To Attempt ({metrics.unattemptedCount})
            </button>
            <button
              className={`btn btn-xs ${statusFilter === 'completed' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('completed')}
              style={{ fontWeight: 700, padding: '0.4rem 0.85rem', borderRadius: 8 }}
            >
              ✅ Completed ({metrics.completedCount})
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, maxWidth: 360, minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search by title, scripture, topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
              }}
            />
            {searchQuery && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setSearchQuery('')}
                style={{ padding: '0.4rem 0.6rem' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Bottom: Scripture Category Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginRight: '0.25rem', fontWeight: 600 }}>
            Scripture:
          </span>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat
            const icon = CATEGORY_ICONS[cat as Category] || '🕉️'
            const label = cat === 'all' ? 'All Scriptures' : (CATEGORY_LABELS[cat as Category] || cat)
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 800 : 500,
                  background: isSelected ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                  border: isSelected ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{icon}</span> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* QUIZZES GRID */}
      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner-gold" />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No quizzes found matching your filters
          </h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Try adjusting your search query, status tab, or scripture category filter.
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setStatusFilter('all')
              setSelectedCategory('all')
              setSelectedDifficulty('all')
              setSearchQuery('')
            }}
            style={{ border: '1px solid var(--color-border)' }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredQuizzes.map(quiz => {
            const activeSession = metrics.liveSessionMap.get(quiz.id)
            const attempt = attemptsMap[quiz.id]
            const isCompleted = !!attempt

            return (
              <div
                key={quiz.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  border: activeSession
                    ? '1.5px solid #4ade80'
                    : isCompleted
                    ? '1px solid rgba(212, 175, 55, 0.4)'
                    : '1px solid var(--color-border)',
                  background: activeSession
                    ? 'linear-gradient(180deg, rgba(74, 222, 128, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%)'
                    : 'var(--glass-bg)',
                  boxShadow: activeSession ? '0 0 15px rgba(74, 222, 128, 0.1)' : undefined,
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>{CATEGORY_ICONS[quiz.category as Category] || '📜'}</span>
                      {CATEGORY_LABELS[quiz.category as Category] || quiz.category}
                    </span>

                    {/* Status Pill */}
                    {activeSession ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                        Live PIN {activeSession.pin}
                      </span>
                    ) : isCompleted ? (
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: attempt.percentage >= 75 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                          color: attempt.percentage >= 75 ? '#4ade80' : 'var(--color-gold)',
                          border: attempt.percentage >= 75 ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(217, 119, 6, 0.3)',
                        }}
                      >
                        ✓ {attempt.score}/{attempt.max_score} ({attempt.percentage}%)
                      </span>
                    ) : (
                      <span className="badge badge-ghost" style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                        🎯 Unattempted
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.35 }}>
                    {quiz.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    {quiz.description}
                  </p>
                </div>

                <div>
                  {/* Metadata Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      fontSize: '0.78rem',
                      color: 'var(--color-muted)',
                      marginBottom: '1.25rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <span>📝 {quiz.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>⏱️ {Math.round((quiz.timeLimit || 720) / 60)} Mins</span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {quiz.difficulty === 'easy' ? '🟢 Easy' : quiz.difficulty === 'hard' ? '🔴 Hard' : '🟡 Medium'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Live Room Priority Action */}
                    {activeSession && (
                      <Link
                        href={`/session/${activeSession.pin}`}
                        className="btn btn-primary btn-sm w-full"
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                        }}
                      >
                        <span>⚡</span> Join Live Room (PIN {activeSession.pin})
                      </Link>
                    )}

                    {/* Attempted: Review vs Retake */}
                    {isCompleted ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          className="btn btn-gold btn-sm"
                          onClick={() => {
                            setSelectedReview({
                              quizId: quiz.id,
                              title: quiz.title,
                              answers: attempt.answers,
                            })
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                          title="Review questions, correct answers, and flashcards"
                        >
                          <span>🎴</span> Review
                        </button>

                        <Link
                          href={`/q/${quiz.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.82rem',
                          }}
                        >
                          <span>🏹</span> Retake
                        </Link>
                      </div>
                    ) : (
                      /* Unattempted: Start Quiz */
                      <Link
                        href={`/q/${quiz.id}`}
                        className="btn btn-primary btn-sm w-full"
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontWeight: 700,
                        }}
                      >
                        <span>🏹</span> Start Quiz →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
