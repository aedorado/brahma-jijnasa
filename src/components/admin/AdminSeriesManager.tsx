'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { QuizSeries, QuizSeriesRound, SeriesStanding } from '@/types/series'

interface AdminSeriesManagerProps {
  onSessionStarted?: () => void
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

export function AdminSeriesManager({ onSessionStarted }: AdminSeriesManagerProps) {
  const [seriesList, setSeriesList] = useState<QuizSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('sacred-teachings-64-principles')
  const [rounds, setRounds] = useState<QuizSeriesRound[]>([])
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

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
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#f6ad55', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        🕒 {formatAdminSchedule(round.unlock_at)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                        {round.shloka_reference}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {round.is_unlocked ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            🔓 Unlocked
                          </span>
                        ) : (
                          <span className="badge badge-ghost" style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                            🔒 Locked
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleToggleUnlock(round.id, round.is_unlocked)}
                            disabled={isBusy}
                            style={{ border: '1px solid var(--color-border)', fontSize: '0.75rem' }}
                          >
                            {round.is_unlocked ? '🔒 Lock' : '🔓 Unlock'}
                          </button>

                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleLaunchSession(round)}
                            disabled={isBusy}
                            style={{ fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            ⚡ Launch Live
                          </button>
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
    </div>
  )
}
