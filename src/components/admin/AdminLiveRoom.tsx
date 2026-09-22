'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserAvatar } from '@/components/UserAvatar'
import type { QuizSession, QuizMeta } from '@/types/quiz'

export interface LiveEntry {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  score: number
  max_score: number
  time_taken: number | null
}

interface AdminLiveRoomProps {
  activeSession: QuizSession | null
  liveStats: {
    joined: number
    completed: number
    entries: LiveEntry[]
  }
  quizzes: QuizMeta[]
  onStartSession: (quizId: string) => Promise<void>
  onEndSession: () => Promise<void>
  starting: string | null
}

export function AdminLiveRoom({
  activeSession,
  liveStats,
  quizzes,
  onStartSession,
  onEndSession,
  starting,
}: AdminLiveRoomProps) {
  const [copiedPin, setCopiedPin] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')

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
    q.category.toLowerCase().includes(quickSearch.toLowerCase())
  )

  return (
    <div className="animate-fadeIn">
      {/* 1. ACTIVE LIVE SESSION PANEL */}
      {activeSession ? (
        <div className="card-gold" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  ACTIVE CLASSROOM SESSION
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  Auto-synced via Supabase Realtime
                </span>
              </div>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text)', fontWeight: 700 }}>
                Active Quiz: <span style={{ color: 'var(--color-gold)' }}>{activeSession.quiz_id}</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={onEndSession}
                id="end-session-btn"
                style={{ fontWeight: 600 }}
              >
                ⏹ End Live Session
              </button>
            </div>
          </div>

          {/* Big PIN Display Card */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
      ) : (
        /* 2. NO ACTIVE SESSION - QUICK LAUNCHER */
        <div style={{ marginBottom: '2.5rem' }}>
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
              No Active Classroom Session
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', maxWidth: 460, margin: '0 auto 1.5rem' }}>
              Select any quiz from your catalog below to generate a 4-digit PIN for your live classroom.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Quick Launch Quiz
              </h3>
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
              {filteredQuizzes.map(quiz => (
                <div
                  key={quiz.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{quiz.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{quiz.totalQuestions} Questions</span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>{quiz.title}</h4>
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
                    {starting === quiz.id ? 'Spawning PIN...' : 'Start Live Classroom Session'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
