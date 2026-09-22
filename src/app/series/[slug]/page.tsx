'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/UserAvatar'
import type { QuizSeries, QuizSeriesRound, SeriesStanding } from '@/types/series'
import { BHAKTISIDDHANTA_64_PRINCIPLES } from '@/lib/series-data'

function formatUnlockSchedule(iso?: string): string {
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

interface SeriesPageProps {
  params: Promise<{ slug: string }>
}

export default function SeriesPage({ params }: SeriesPageProps) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLanguage()
  const supabase = createClient()

  const [series, setSeries] = useState<QuizSeries | null>(null)
  const [rounds, setRounds] = useState<QuizSeriesRound[]>([])
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [userAttempts, setUserAttempts] = useState<Record<string, { score: number; max_score: number; time_taken: number }>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roadmap' | 'leaderboard' | 'principles'>('roadmap')
  const [principleSearch, setPrincipleSearch] = useState('')
  const [principleScope, setPrincipleScope] = useState<'30' | '64'>('30')

  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        const res = await fetch(`/api/series/${slug}`)
        if (res.ok) {
          const data = await res.json()
          setSeries(data.series)
          setRounds(data.rounds || [])
          setStandings(data.standings || [])
        }
      } catch (e) {
        console.error('Failed to load series data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSeriesData()
  }, [slug])

  useEffect(() => {
    if (!user) {
      setUserAttempts({})
      return
    }
    const loadUserAttempts = async () => {
      try {
        const { data } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, score, max_score, time_taken')
          .eq('user_id', user.id)

        if (data) {
          const map: Record<string, { score: number; max_score: number; time_taken: number }> = {}
          data.forEach((a: any) => {
            if (a.quiz_id) {
              map[a.quiz_id] = { score: a.score, max_score: a.max_score, time_taken: a.time_taken }
            }
          })
          setUserAttempts(map)
        }
      } catch (err) {
        console.warn('Failed to load user attempts for series:', err)
      }
    }
    loadUserAttempts()
  }, [user])

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div className="spinner-gold" />
          <p className="text-muted" style={{ marginTop: '1rem' }}>Loading Sacred Teachings Series...</p>
        </div>
      </div>
    )
  }

  if (!series) {
    return (
      <div className="container text-center" style={{ padding: '6rem 0' }}>
        <h2>Series Not Found</h2>
        <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          The requested series does not exist.
        </p>
        <Link href="/series" className="btn btn-primary">{t.series.allSeriesTitle || 'Browse All Series'}</Link>
      </div>
    )
  }

  const unlockedCount = rounds.filter(r => r.is_unlocked).length
  const progressPct = Math.round((unlockedCount / (rounds.length || 1)) * 100)
  const userCompletedCount = rounds.filter(r => Boolean(userAttempts[r.quiz_id])).length
  const userProgressPct = Math.round((userCompletedCount / (rounds.length || 1)) * 100)

  return (
    <div style={{ padding: '2.5rem 0 6rem' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--color-muted)' }}>Home</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--color-border)' }}>/</span>
          <Link href="/series" style={{ color: 'var(--color-muted)' }}>{t.nav.allSeries || 'Series'}</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--color-border)' }}>/</span>
          <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{series.title}</span>
        </div>

        {/* Hero Banner Card */}
        <div
          className="card-gold animate-fadeIn"
          style={{
            padding: '2.5rem 2rem',
            marginBottom: '2.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.8rem',
                borderRadius: '9999px',
                background: 'rgba(240, 199, 78, 0.15)',
                border: '1px solid rgba(240, 199, 78, 0.35)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-gold)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              🌺 Kārtika Mahotsava Special Series
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              {t.series.daysDaily}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.7rem',
                borderRadius: '9999px',
                background: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#4ade80',
              }}
            >
              🕒 Daily 7:05 PM IST
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, marginBottom: '0.75rem', lineHeight: 1.2 }}>
            {series.title}
          </h1>

          {series.subtitle && (
            <p style={{ fontSize: '1.05rem', color: 'var(--color-gold)', marginBottom: '1rem', fontWeight: 600 }}>
              {series.subtitle}
            </p>
          )}

          <p style={{ color: 'var(--color-text-secondary)', maxWidth: 780, lineHeight: 1.65, fontSize: '0.95rem', marginBottom: '1.75rem' }}>
            {series.description}
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.series.scheduleLaunch}</p>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-gold)' }}>26 Oct • 7:05 PM IST</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.series.totalDuration}</p>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)' }}>{t.series.daysDaily}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.series.unlockedStatus}</p>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#4ade80' }}>{unlockedCount} / {rounds.length} {t.series.roundsCount}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.series.authoritySource}</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)' }}>Śrīla Bhaktisiddhānta (Principles 1–30)</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.75rem',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`btn btn-sm ${activeTab === 'roadmap' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: 10 }}
          >
            <span>🗺️</span> {t.series.roadmapTab} ({rounds.length})
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`btn btn-sm ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: 10 }}
          >
            <span>🏆</span> {t.series.standingsTab} ({standings.length})
          </button>
          <button
            onClick={() => setActiveTab('principles')}
            className={`btn btn-sm ${activeTab === 'principles' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: 10 }}
          >
            <span>📜</span> {t.series.principlesTab}
          </button>
        </div>

        {/* TAB 1: ROADMAP */}
        {activeTab === 'roadmap' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t.series.roadmapTab}</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Take today’s round live with your teacher or practice unlocked rounds anytime.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  {user ? `${t.series.yourCompleted}: ${userCompletedCount}/${rounds.length}` : `${t.series.seriesUnlocked}: ${unlockedCount}/${rounds.length}`}
                </span>
                <div style={{ width: 120, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${user ? userProgressPct : progressPct}%`,
                      height: '100%',
                      background: user && userCompletedCount > 0 ? '#4ade80' : 'var(--color-gold)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {rounds.map((round) => {
                const userAttempt = userAttempts[round.quiz_id]
                const isCompleted = !!userAttempt
                const isLive = Boolean((round as any).activePin)
                const isUnlocked = round.is_unlocked || isLive || isCompleted

                return (
                  <div
                    key={round.id || round.day_number}
                    className={`card ${isLive ? 'card-gold' : ''}`}
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: isUnlocked ? 1 : 0.65,
                      border: isLive
                        ? '1.5px solid var(--color-gold)'
                        : isCompleted
                        ? '1px solid rgba(74, 222, 128, 0.35)'
                        : undefined,
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            background: isLive
                              ? 'rgba(74, 222, 128, 0.15)'
                              : isCompleted
                              ? 'rgba(74, 222, 128, 0.15)'
                              : isUnlocked
                              ? 'rgba(240, 199, 78, 0.15)'
                              : 'rgba(255,255,255,0.05)',
                            color: isLive
                              ? '#4ade80'
                              : isCompleted
                              ? '#4ade80'
                              : isUnlocked
                              ? 'var(--color-gold)'
                              : 'var(--color-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {isLive
                            ? `🔴 ${t.series.liveClassNow}`
                            : isCompleted
                            ? `${t.series.dayLabel} ${round.day_number} • ✅ ${t.series.completedBadge}`
                            : isUnlocked
                            ? `${t.series.dayLabel} ${round.day_number} • ✨ ${t.series.unlockedBadge}`
                            : `🔒 ${t.series.dayLabel} ${round.day_number}`}
                        </span>

                        {isCompleted ? (
                          <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                            ⭐ {t.series.scoreLabel}: {userAttempt.score} / {userAttempt.max_score} {t.series.pts}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: isUnlocked ? 'var(--color-muted)' : '#f6ad55', fontWeight: isUnlocked ? 400 : 600 }}>
                            {isUnlocked ? round.principles_range : `${t.series.unlocksAt} ${formatUnlockSchedule(round.unlock_at)}`}
                          </span>
                        )}
                      </div>

                      {/* Title & Reference */}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.35 }}>
                        {round.title}
                      </h3>

                      {round.shloka_reference && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                          📖 {round.shloka_reference}
                        </p>
                      )}

                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                        {round.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                      {isCompleted ? (
                        <Link
                          href={`/q/${round.quiz_id}`}
                          className="btn btn-ghost btn-sm w-full"
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.4rem',
                            border: '1px solid rgba(74, 222, 128, 0.4)',
                            color: '#4ade80',
                            background: 'rgba(74, 222, 128, 0.05)',
                          }}
                        >
                          <span>📜</span> {t.series.viewScorecard}
                        </Link>
                      ) : isLive ? (
                        <Link
                          href={`/session/${(round as any).activePin}`}
                          className="btn btn-primary btn-sm w-full"
                          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <span>⚡</span> {t.series.joinLive} (PIN: {(round as any).activePin})
                        </Link>
                      ) : isUnlocked ? (
                        <Link
                          href={`/q/${round.quiz_id}`}
                          className="btn btn-ghost btn-sm w-full"
                          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--color-border)' }}
                        >
                          <span>✨</span> {t.series.takePractice}
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="btn btn-ghost btn-sm w-full"
                          style={{ opacity: 0.65, cursor: 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                        >
                          <span>🔒</span> {t.series.unlocksAt} {formatUnlockSchedule(round.unlock_at)}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SERIES STANDINGS */}
        {activeTab === 'leaderboard' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t.series.standingsTab}</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Total points earned across all daily rounds of the series.
              </p>
            </div>

            {standings.length === 0 ? (
              <div className="card text-center" style={{ padding: '3.5rem 1.5rem' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</p>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>{t.series.noSubmissions}</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem', maxWidth: 420, margin: '0 auto' }}>
                  {t.series.noSubmissionsDesc}
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.9rem 1.25rem', width: 60 }}>{t.series.rank}</th>
                        <th style={{ padding: '0.9rem 1.25rem' }}>{t.series.participant}</th>
                        <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>{t.series.daysAttended}</th>
                        <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>{t.series.accuracy}</th>
                        <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{t.series.totalPoints}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((devotee) => (
                        <tr
                          key={devotee.user_id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: devotee.rank === 1 ? 'rgba(240, 199, 78, 0.05)' : undefined,
                          }}
                        >
                          <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>
                            {devotee.rank === 1 ? '🥇 1' : devotee.rank === 2 ? '🥈 2' : devotee.rank === 3 ? '🥉 3' : `#${devotee.rank}`}
                          </td>
                          <td style={{ padding: '0.9rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <UserAvatar name={devotee.full_name} url={devotee.avatar_url} size={28} />
                              <span style={{ fontWeight: 600 }}>{devotee.full_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center', color: 'var(--color-gold)', fontWeight: 600 }}>
                            {devotee.days_attended} / {rounds.length}
                          </td>
                          <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>
                            {devotee.avg_accuracy}%
                          </td>
                          <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-gold)' }}>
                            {devotee.total_points} {t.series.pts}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRINCIPLES GUIDE */}
        {activeTab === 'principles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Śrīla Bhaktisiddhānta’s Principles for Community</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Spiritual directives for community harmony and unalloyed service from <em>Reflections on Sacred Teachings V</em> by His Holiness Bhakti Tirtha Swami Maharaja.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => setPrincipleScope('30')}
                    className={`btn btn-sm ${principleScope === '30' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 6 }}
                  >
                    Principles 1–30 (Current Series)
                  </button>
                  <button
                    onClick={() => setPrincipleScope('64')}
                    className={`btn btn-sm ${principleScope === '64' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 6 }}
                  >
                    All 64 Book Principles
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search principles..."
                  value={principleSearch}
                  onChange={e => setPrincipleSearch(e.target.value)}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontSize: '0.85rem',
                    minWidth: 200,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {BHAKTISIDDHANTA_64_PRINCIPLES
                .filter(p => {
                  if (principleScope === '30' && p.number > 30) return false
                  if (!principleSearch) return true
                  return (
                    p.statement.toLowerCase().includes(principleSearch.toLowerCase()) ||
                    String(p.number).includes(principleSearch)
                  )
                })
                .map(p => (
                  <div
                    key={p.number}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.02)',
                      border: p.number <= 30 ? '1px solid rgba(240, 199, 78, 0.3)' : '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className={`badge ${p.number <= 30 ? 'badge-gold' : 'badge-ghost'}`} style={{ fontSize: '0.72rem' }}>
                          Principle {p.number} {p.number <= 30 ? '• Day ' + p.number : ''}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                          Śrīla Bhaktisiddhānta
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.55, fontWeight: 500 }}>
                        “{p.statement}”
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
