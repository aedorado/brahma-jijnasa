'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { QuizSeries, QuizSeriesRound, SeriesStanding } from '@/types/series'
import type { QuizMeta } from '@/types/quiz'
import { isSeriesRoundLive } from '@/lib/series-data'
import { SeriesDayLinkModal } from './SeriesDayLinkModal'

interface ActiveSessionSummary {
  id: string
  quiz_id: string
  pin: string
  is_active?: boolean
}

interface AdminSeriesManagerProps {
  quizzes?: QuizMeta[]
  onSessionStarted?: () => void
  onDryRunQuiz?: (quizId: string) => void
  activeSessions?: ActiveSessionSummary[]
  onSelectSession?: (sessionId: string) => void
  onCreateQuizForDay?: (dayNumber: number) => void
  onEditQuiz?: (quizId: string) => void
  isAdmin?: boolean
  canManageSeries?: boolean
}

function formatAdminSchedule(iso?: string): string {
  if (!iso) return 'Scheduled'
  try {
    const date = new Date(iso)
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(date) + ' IST'
  } catch {
    return 'Scheduled'
  }
}

export function AdminSeriesManager({
  quizzes = [],
  onSessionStarted,
  onDryRunQuiz,
  activeSessions = [],
  onSelectSession,
  onCreateQuizForDay,
  onEditQuiz,
  isAdmin = false,
  canManageSeries = false,
}: AdminSeriesManagerProps) {
  const canManage = isAdmin || canManageSeries
  const [seriesList, setSeriesList] = useState<QuizSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('sacred-teachings-64-principles')
  const [rounds, setRounds] = useState<QuizSeriesRound[]>([])
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [linkingRound, setLinkingRound] = useState<QuizSeriesRound | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const loadSeriesDetails = async (slug: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/series/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setRounds(data.rounds || [])
        setStandings(data.standings || [])
      }
    } catch (e) {
      console.warn('Error loading series:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchSeriesList = async () => {
      try {
        const res = await fetch('/api/series')
        if (res.ok) {
          const list = await res.json()
          setSeriesList(list)
          if (list.length > 0) {
            setSelectedSeries(list[0].slug)
            loadSeriesDetails(list[0].slug)
            return
          }
        }
      } catch (e) {
        console.warn('Failed to fetch series list:', e)
      }
      loadSeriesDetails('sacred-teachings-64-principles')
    }
    fetchSeriesList()
  }, [])

  const handleSaveRoundLink = async (targetQuizId: string, unlockAtIso?: string) => {
    if (!linkingRound) return
    setModalLoading(true)
    try {
      const res = await fetch('/api/series/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link_round',
          roundId: linkingRound.id,
          dayNumber: linkingRound.day_number,
          targetQuizId,
          unlockAt: unlockAtIso,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to attach quiz.')
      }
      await loadSeriesDetails(selectedSeries)
      setLinkingRound(null)
    } catch (e: any) {
      alert(`Error linking round: ${e.message}`)
    } finally {
      setModalLoading(false)
    }
  }

  const handleUnlinkRound = async () => {
    if (!linkingRound) return
    if (!confirm(`Are you sure you want to unlink quiz "${linkingRound.quiz_id}" from Day ${linkingRound.day_number}?`)) return
    setModalLoading(true)
    try {
      const res = await fetch('/api/series/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlink_round',
          roundId: linkingRound.id,
          dayNumber: linkingRound.day_number,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to unlink.')
      }
      await loadSeriesDetails(selectedSeries)
      setLinkingRound(null)
    } catch (e: any) {
      alert(`Error unlinking round: ${e.message}`)
    } finally {
      setModalLoading(false)
    }
  }

  const handleQuickUnlink = async (round: QuizSeriesRound) => {
    if (!confirm(`Are you sure you want to unlink quiz "${round.quiz_id}" from Day ${round.day_number}?`)) return
    setActionLoading(`unlink_${round.id}`)
    try {
      const res = await fetch('/api/series/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlink_round',
          roundId: round.id,
          dayNumber: round.day_number,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to unlink.')
      }
      await loadSeriesDetails(selectedSeries)
    } catch (e: any) {
      alert(`Error unlinking round: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleUnlock = async (roundId: string, currentUnlocked: boolean) => {
    setActionLoading(roundId)
    try {
      const res = await fetch('/api/series/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_unlock',
          roundId,
          isUnlocked: !currentUnlocked,
        }),
      })
      if (res.ok) {
        setRounds(prev =>
          prev.map(r => (r.id === roundId ? { ...r, is_unlocked: !currentUnlocked } : r))
        )
      } else {
        // Local optimistic toggle if remote table not yet migrated
        setRounds(prev =>
          prev.map(r => (r.id === roundId ? { ...r, is_unlocked: !currentUnlocked } : r))
        )
      }
    } catch {
      // Local optimistic fallback
      setRounds(prev =>
        prev.map(r => (r.id === roundId ? { ...r, is_unlocked: !currentUnlocked } : r))
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleLaunchSession = async (round: QuizSeriesRound) => {
    setActionLoading(`launch_${round.id}`)
    try {
      const res = await fetch('/api/series/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'launch_session',
          roundId: round.id,
          quizId: round.quiz_id,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`🎉 Live Session Launched for Day ${round.day_number}! PIN: ${data.pin}`)
        if (onSessionStarted) onSessionStarted()
        await loadSeriesDetails(selectedSeries)
      } else {
        alert('Could not launch live session. Please check if another session is active.')
      }
    } catch (e: any) {
      alert(`Error launching session: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRounds = rounds.filter(r =>
    r.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (r.principles_range && r.principles_range.toLowerCase().includes(filterQuery.toLowerCase())) ||
    String(r.day_number).includes(filterQuery)
  )

  const unlockedCount = rounds.filter(r => r.is_unlocked).length

  return (
    <div className="animate-fadeIn">
      {/* Series Control Banner */}
      <div className="card-gold" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-gold">📚 Series Control Room</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Kārtika Mahotsava</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Reflections on Sacred Teachings — Principles for Community (1–30)
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: 680, lineHeight: 1.5 }}>
              Manage day-by-day unlocks and launch classroom rounds for Śrīla Bhaktisiddhānta's community principles (1–30) from <em>Reflections on Sacred Teachings V</em>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Link
              href={`/series/${selectedSeries}`}
              target="_blank"
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--color-border)' }}
            >
              <span>🌐 Open Student Series Hub ↗</span>
            </Link>
          </div>
        </div>

        {/* Series Metric Chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '1rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Total Schedule</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gold)' }}>30 Days</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Unlocked Rounds</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80' }}>{unlockedCount} / {rounds.length}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Active Devotees</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{standings.length}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Daily Authority</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)' }}>Śrīla Bhaktisiddhānta</p>
          </div>
        </div>
      </div>

      {/* Rounds Table & Day Actions */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>30-Day Curriculum Management</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Launch live classroom sessions or toggle self-paced access for any day.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search days or principles..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              width: 260,
            }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner-gold" />
            <p className="text-muted" style={{ marginTop: '0.75rem' }}>Loading Series Rounds...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', width: 70 }}>Day</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Topic & Principles</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Release Schedule (IST)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Shāstric Reference</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRounds.map((round) => {
                  const isBusy = actionLoading === round.id || actionLoading === `launch_${round.id}`
                  const liveSession = activeSessions.find(s =>
                    (round.active_session_id && s.id === round.active_session_id) ||
                    (round.quiz_id && s.quiz_id === round.quiz_id) ||
                    ((round as any).activePin && s.pin === (round as any).activePin)
                  )
                  const roundPin = (round as any).activePin || liveSession?.pin || null
                  const isLive = isSeriesRoundLive({
                    is_unlocked: round.is_unlocked,
                    unlock_at: round.unlock_at,
                    activePin: roundPin,
                  })
                  const quizExists = (quizzes || []).some(q => q.id === round.quiz_id)

                  return (
                    <tr
                      key={round.id || round.day_number}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: round.is_unlocked ? 'rgba(74, 222, 128, 0.02)' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--color-gold)' }}>
                        Day {round.day_number}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                          {round.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                          <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{round.principles_range}</span> — {round.description}
                        </div>
                        {quizExists ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            <span className="badge badge-gold" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              🔗 Quiz: <strong>{round.quiz_id}</strong>
                            </span>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setLinkingRound(round)}
                                  className="btn btn-ghost btn-xs"
                                  style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 4 }}
                                  title="Reassign or change attached quiz"
                                >
                                  🔄 Reassign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickUnlink(round)}
                                  disabled={actionLoading === `unlink_${round.id}`}
                                  className="btn btn-ghost btn-xs"
                                  style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 4 }}
                                  title="Unlink quiz from this day"
                                >
                                  ✕ Detach
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          canManage && (
                            <div style={{ marginTop: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => setLinkingRound(round)}
                                className="btn btn-gold btn-xs"
                                style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <span>➕</span> Attach Quiz from Library
                              </button>
                            </div>
                          )
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#f6ad55', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>🕒 {formatAdminSchedule(round.unlock_at)}</span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setLinkingRound(round)}
                              className="btn btn-ghost btn-xs"
                              style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', opacity: 0.8 }}
                              title="Edit release schedule"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                        {round.shloka_reference}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {!quizExists ? (
                          <span
                            className="badge badge-ghost"
                            style={{
                              fontSize: '0.72rem',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              color: '#f59e0b',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ⚠️ Missing Quiz
                          </span>
                        ) : isLive ? (
                          <span
                            className="badge badge-success"
                            style={{
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(74, 222, 128, 0.15)',
                              border: '1px solid #4ade80',
                              color: '#4ade80',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                            LIVE (PIN: {roundPin || liveSession?.pin})
                          </span>
                        ) : roundPin ? (
                          <span
                            className="badge badge-ghost"
                            style={{
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(246, 173, 85, 0.12)',
                              border: '1px solid rgba(246, 173, 85, 0.4)',
                              color: '#f6ad55',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🕒 Scheduled (PIN: {roundPin})
                          </span>
                        ) : round.is_unlocked ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            🔓 Unlocked
                          </span>
                        ) : (
                          <span className="badge badge-ghost" style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                            🔒 Locked
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'stretch', width: '135px', marginLeft: 'auto' }}>
                          {!quizExists ? (
                            <button
                              type="button"
                              className="btn btn-gold btn-xs"
                              onClick={() => onCreateQuizForDay?.(round.day_number)}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontWeight: 800, fontSize: '0.75rem', width: '100%' }}
                              title={`Create quiz for Day ${round.day_number} in Quiz Studio`}
                            >
                              <span>✨</span> Create Quiz
                            </button>
                          ) : (
                            <>
                              {onEditQuiz && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => onEditQuiz(round.quiz_id)}
                                  style={{ border: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, justifyContent: 'center', width: '100%' }}
                                  title={`Edit ${round.title} in Quiz Studio`}
                                >
                                  ✏️ Edit
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-gold btn-xs"
                                onClick={() => onDryRunQuiz?.(round.quiz_id)}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontWeight: 700, fontSize: '0.75rem', width: '100%' }}
                                title={`Dry run interactive simulation for ${round.title}`}
                              >
                                <span>🧪</span> Dry Run
                              </button>

                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleToggleUnlock(round.id, round.is_unlocked)}
                                disabled={isBusy}
                                style={{ border: '1px solid var(--color-border)', fontSize: '0.75rem', justifyContent: 'center', width: '100%' }}
                              >
                                {round.is_unlocked ? '🔒 Lock' : '🔓 Unlock'}
                              </button>

                              {isLive ? (
                                liveSession && onSelectSession ? (
                                  <button
                                    type="button"
                                    className="btn btn-xs"
                                    onClick={() => onSelectSession(liveSession.id)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.35rem',
                                      background: 'rgba(74, 222, 128, 0.18)',
                                      border: '1.5px solid #4ade80',
                                      color: '#4ade80',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      width: '100%',
                                    }}
                                    title="Open active live classroom room and student scoreboard"
                                  >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                                    Live Room ({roundPin || liveSession.pin})
                                  </button>
                                ) : roundPin ? (
                                  <Link
                                    href={`/session/${roundPin}`}
                                    target="_blank"
                                    className="btn btn-xs"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.35rem',
                                      background: 'rgba(74, 222, 128, 0.18)',
                                      border: '1.5px solid #4ade80',
                                      color: '#4ade80',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      width: '100%',
                                    }}
                                    title="Open student session room"
                                  >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                                    Live Room ({roundPin})
                                  </Link>
                                ) : null
                              ) : (
                                <button
                                  className="btn btn-primary btn-xs"
                                  onClick={() => handleLaunchSession(round)}
                                  disabled={isBusy}
                                  style={{ fontSize: '0.75rem', fontWeight: 600, justifyContent: 'center', width: '100%' }}
                                >
                                  ⚡ Launch Live
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <SeriesDayLinkModal
          isOpen={Boolean(linkingRound)}
          onClose={() => setLinkingRound(null)}
          round={linkingRound}
          allQuizzes={quizzes}
          allRounds={rounds}
          onSaveLink={handleSaveRoundLink}
          onUnlink={handleUnlinkRound}
          loading={modalLoading}
        />
      )}
    </div>
  )
}
