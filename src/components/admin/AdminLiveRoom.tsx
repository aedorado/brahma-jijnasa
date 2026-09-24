'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserAvatar } from '@/components/UserAvatar'
import type { QuizSession, QuizMeta, Category } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'

export interface LiveEntry {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  score: number
  max_score: number
  time_taken: number | null
}

interface AdminLiveRoomProps {
  activeSessions: QuizSession[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
  liveStats: {
    joined: number
    completed: number
    entries: LiveEntry[]
  }
  quizzes: QuizMeta[]
  onStartSession: (quizId: string) => Promise<void>
  onEndSession: (sessionId: string) => Promise<void>
  starting: string | null
}

export function AdminLiveRoom({
  activeSessions,
  selectedSessionId,
  onSelectSession,
  liveStats,
  quizzes,
  onStartSession,
  onEndSession,
  starting,
}: AdminLiveRoomProps) {
  const [copiedPin, setCopiedPin] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')

  const activeSession = activeSessions.find(s => s.id === selectedSessionId) || activeSessions[0] || null

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  const handleCopyStudentLink = (pin: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/session/${pin}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(quickSearch.toLowerCase()) ||
    q.category.toLowerCase().includes(quickSearch.toLowerCase()) ||
    q.id.toLowerCase().includes(quickSearch.toLowerCase())
  )

  const activeQuizMeta = activeSession ? quizzes.find(q => q.id === activeSession.quiz_id) : null

  return (
    <div className="animate-fadeIn">
      {/* 1. MULTI-ROOM SWITCHER TABS (if 1 or more sessions are active) */}
      {activeSessions.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Active Live Rooms ({activeSessions.length})
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                • Click to switch live scoreboard
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Multiple rooms running simultaneously
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.6rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
            }}
          >
            {activeSessions.map((session) => {
              const isSelected = session.id === (activeSession?.id)
              const sessionQuiz = quizzes.find(q => q.id === session.quiz_id)
              const title = sessionQuiz?.title || session.quiz_id

              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 1rem',
                    borderRadius: 12,
                    border: isSelected ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? 'var(--color-gold)' : 'var(--color-text)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#4ade80',
                      display: 'inline-block',
                      animation: isSelected ? 'pulse 1.5s infinite' : 'none',
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    PIN {session.pin}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: isSelected ? 'var(--color-text)' : 'var(--color-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. SELECTED ACTIVE ROOM SPOTLIGHT */}
      {activeSession && (
        <div className="card-gold" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  LIVE CLASSROOM
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  Auto-synced via Supabase Realtime
                </span>
              </div>
              <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text)', fontWeight: 800 }}>
                {activeQuizMeta?.title || activeSession.quiz_id}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onEndSession(activeSession.id)}
                id="end-session-btn"
                style={{ fontWeight: 600 }}
              >
                ⏹ End This Session
              </button>
            </div>
          </div>

          {/* Compact Monospace PIN Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(240, 199, 78, 0.12), rgba(255, 107, 43, 0.08))',
              border: '2px dashed rgba(240, 199, 78, 0.5)',
              borderRadius: 16,
              padding: '2rem 1.5rem',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>
              Classroom Join PIN
            </p>
            <div
              style={{
                fontSize: '4.5rem',
                fontWeight: 900,
                color: 'var(--color-gold)',
                letterSpacing: '0.25em',
                lineHeight: 1,
                marginBottom: '1.25rem',
                fontFamily: 'monospace',
                textShadow: '0 0 25px rgba(240, 199, 78, 0.4)',
              }}
            >
              {activeSession.pin}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopyPin(activeSession.pin)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>{copiedPin ? '✓ Copied PIN' : '📋 Copy PIN'}</span>
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleCopyStudentLink(activeSession.pin)}
                id="copy-student-link-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>{copiedLink ? '✓ Copied Link' : '🔗 Copy Student Direct Link'}</span>
              </button>

              <Link
                href={`/session/${activeSession.pin}`}
                target="_blank"
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--color-border)' }}
              >
                <span>📺 Open Projector / TV View ↗</span>
              </Link>
            </div>
          </div>

          {/* Live Attendance Leaderboard */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Live Class Standings
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  {liveStats.completed} {liveStats.completed === 1 ? 'devotee has' : 'devotees have'} submitted
                </p>
              </div>
            </div>

            {liveStats.entries.length === 0 ? (
              <div
                style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="spinner-gold" style={{ width: 28, height: 28, margin: '0 auto 1rem' }} />
                <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                  Waiting for devotees to submit...
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Ask your students to enter PIN <strong style={{ color: 'var(--color-gold)' }}>{activeSession.pin}</strong> on the homepage!
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.75rem 1rem', width: 60 }}>Rank</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Devotee</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Time</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveStats.entries.map((entry, idx) => (
                      <tr
                        key={entry.user_id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: idx === 0 ? 'rgba(240, 199, 78, 0.08)' : undefined,
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <UserAvatar name={entry.full_name} url={entry.avatar_url} size={28} />
                            <span style={{ fontWeight: 600 }}>{entry.full_name || 'Anonymous Devotee'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                          {entry.time_taken ? `${entry.time_taken}s` : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-gold)' }}>
                          {entry.score} / {entry.max_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PERSISTENT QUICK LAUNCHER (Always available so teachers can launch multiple rooms) */}
      <div style={{ marginTop: activeSessions.length > 0 ? '2rem' : '0' }}>
        {activeSessions.length === 0 && (
          <div
            className="card"
            style={{
              padding: '2.5rem 2rem',
              textAlign: 'center',
              marginBottom: '2rem',
              border: '1.5px dashed var(--color-border)',
              background: 'rgba(255,255,255,0.015)',
            }}
          >
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚡</p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              No Active Classroom Sessions
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', maxWidth: 460, margin: '0 auto 1.5rem' }}>
              Select any quiz from your catalog below to generate a 4-digit PIN for your live classroom. You can run multiple rooms concurrently!
            </p>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {activeSessions.length > 0 ? '⚡ Launch Another Live Room' : 'Quick Launch Quiz'}
              </h3>
              {activeSessions.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Launch another quiz concurrently. Each room gets its own unique PIN.
                </p>
              )}
            </div>

            <input
              type="text"
              placeholder="Search quiz to launch..."
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
                width: 240,
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredQuizzes.map(quiz => {
              const isAlreadyRunning = activeSessions.some(s => s.quiz_id === quiz.id)

              return (
                <div
                  key={quiz.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isAlreadyRunning ? '1px solid rgba(74, 222, 128, 0.4)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {CATEGORY_ICONS[quiz.category as Category] || '📜'} {CATEGORY_LABELS[quiz.category as Category] || quiz.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {quiz.totalQuestions} Questions
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{quiz.title}</h4>
                      {isAlreadyRunning && (
                        <span className="badge badge-success" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.4, marginBottom: '1rem' }}>
                      {quiz.description}
                    </p>
                  </div>

                  <button
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => onStartSession(quiz.id)}
                    disabled={starting === quiz.id}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>⚡</span>
                    {starting === quiz.id ? 'Spawning PIN...' : isAlreadyRunning ? 'Spawn Another Room' : 'Start Live Classroom Session'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
