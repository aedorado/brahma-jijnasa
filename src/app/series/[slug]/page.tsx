'use client'

import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/UserAvatar'
import type { QuizSeries, QuizSeriesRound, SeriesStanding } from '@/types/series'
import { BHAKTISIDDHANTA_64_PRINCIPLES } from '@/lib/series-data'
import { BookPurchaseBanner, BOOK_QR_IMAGE, AMAZON_STORES } from '@/components/BookPurchaseBanner'
import { BookPurchaseModal } from '@/components/BookPurchaseModal'

function isSeriesRoundLive(round: {
  is_unlocked?: boolean
  unlock_at?: string
  activePin?: string | null
}): boolean {
  if (!round.activePin) return false
  if (round.is_unlocked && !round.unlock_at) return true
  if (round.unlock_at) {
    if (new Date() < new Date(round.unlock_at)) {
      return Boolean(round.is_unlocked)
    }
    return true
  }
  return Boolean(round.is_unlocked)
}

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
  const { t, language } = useLanguage()
  const supabase = createClient()

  const [series, setSeries] = useState<QuizSeries | null>(null)
  const [rounds, setRounds] = useState<QuizSeriesRound[]>([])
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [practiceStandings, setPracticeStandings] = useState<SeriesStanding[]>([])
  const [showPractice, setShowPractice] = useState(false)
  const [userAttempts, setUserAttempts] = useState<Record<string, { score: number; max_score: number; time_taken: number }>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roadmap' | 'leaderboard' | 'principles'>('roadmap')
  const [principleSearch, setPrincipleSearch] = useState('')
  const [principleScope, setPrincipleScope] = useState<'30' | '64'>('30')
  const [launchingRoundId, setLaunchingRoundId] = useState<string | null>(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>(
    language === 'pt' ? 'BR' : 'IN'
  )
  const [showAllHeroStores, setShowAllHeroStores] = useState(false)

  const selectedStore = AMAZON_STORES.find(s => s.code === selectedStoreCode) || AMAZON_STORES[0]

  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher'

  const handleLaunchSession = async (round: QuizSeriesRound) => {
    const key = round.id || round.quiz_id
    setLaunchingRoundId(key)
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
      const data = await res.json()
      if (res.ok && data.pin) {
        setRounds(prev =>
          prev.map(r =>
            (r.id && r.id === round.id) || r.quiz_id === round.quiz_id
              ? { ...r, activePin: data.pin, is_unlocked: true }
              : r
          )
        )
      } else {
        alert(`Could not launch live session: ${data.error || 'Server error'}`)
      }
    } catch (err: any) {
      alert(`Failed to launch live session: ${err.message}`)
    } finally {
      setLaunchingRoundId(null)
    }
  }

  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        const res = await fetch(`/api/series/${slug}`)
        if (res.ok) {
          const data = await res.json()
          setSeries(data.series)
          setRounds(data.rounds || [])
          setStandings(data.standings || [])
          setPracticeStandings(data.practiceStandings || [])
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
          <p className="text-muted" style={{ marginTop: '1rem' }}>{t.series.loadingSeries || 'Loading Sacred Teachings Series...'}</p>
        </div>
      </div>
    )
  }

  if (!series) {
    return (
      <div className="container text-center" style={{ padding: '6rem 0' }}>
        <h2>{t.series.seriesNotFound || 'Series Not Found'}</h2>
        <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          {t.series.seriesNotFoundDesc || 'The requested series does not exist.'}
        </p>
        <Link href="/series" className="btn btn-primary">{t.series.allSeriesTitle || 'Browse All Series'}</Link>
      </div>
    )
  }

  const unlockedCount = rounds.filter(r => r.is_unlocked).length
  const progressPct = Math.round((unlockedCount / (rounds.length || 1)) * 100)
  const userCompletedCount = rounds.filter(r => Boolean(userAttempts[r.quiz_id])).length
  const userProgressPct = Math.round((userCompletedCount / (rounds.length || 1)) * 100)
  const activeStandings = showPractice ? practiceStandings : standings
  const totalRoundsCount = showPractice ? rounds.length : (rounds.filter((r) => (r.day_number ?? 1) > 0).length || 30)

  return (
    <div style={{ padding: '2.5rem 0 6rem' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--color-muted)' }}>{t.series.home || 'Home'}</Link>
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
          {/* Main Hero Layout: Left description, Right prominent QR & Book card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '2rem',
              marginBottom: '2rem',
            }}
          >
            {/* Left Content Column */}
            <div style={{ flex: '1 1 520px', minWidth: 280 }}>
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
                  {t.series.specialSeriesBadge || '🌺 Kārtika Mahotsava Special Series'}
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
                  {t.series.dailyTimeBadge || '🕒 Daily 6:55 PM IST'}
                </span>
                <button
                  onClick={() => setShowAllHeroStores(prev => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(240, 199, 78, 0.35)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-gold)',
                    cursor: 'pointer',
                  }}
                >
                  <span>📖</span> 13 Amazon Stores {showAllHeroStores ? '▲' : '▾'}
                </button>
              </div>

              <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, marginBottom: '0.75rem', lineHeight: 1.2 }}>
                {series.title}
              </h1>

              {series.subtitle && (
                <p style={{ fontSize: '1.05rem', color: 'var(--color-gold)', marginBottom: '1rem', fontWeight: 600 }}>
                  {series.subtitle}
                </p>
              )}

              <p style={{ color: 'var(--color-text-secondary)', maxWidth: 740, lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
                {series.description}
              </p>
            </div>

            {/* Right Prominent QR & Book Companion Card */}
            <div className="book-companion-hero-card" style={{ flex: '0 0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📖 Official Companion Book
                </span>
              </div>

              {/* QR Image Box with Direct Store Link */}
              <a
                href={selectedStore.url}
                target="_blank"
                rel="noopener noreferrer"
                className="book-qr-box"
                style={{
                  cursor: 'pointer',
                  marginBottom: '0.75rem',
                  textDecoration: 'none',
                }}
                title={`Scan QR or click to open ${selectedStore.name} Amazon store`}
              >
                <Image
                  src={selectedStore.qrImage || BOOK_QR_IMAGE}
                  alt={`Scan QR code to buy 64 Principles Book on Amazon ${selectedStore.name}`}
                  width={125}
                  height={125}
                  style={{ display: 'block', borderRadius: 8 }}
                  priority
                />
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1a102f', marginTop: 5, letterSpacing: '0.02em' }}>
                  {selectedStore.flag} Scan to Buy ({selectedStore.name})
                </span>
              </a>

              {/* Direct Store Buy Button */}
              <a
                href={selectedStore.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm w-full"
                style={{
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: 8,
                  marginBottom: '0.65rem',
                  textDecoration: 'none',
                }}
              >
                <span>🛒 Buy on Amazon ({selectedStore.flag} {selectedStore.name})</span>
              </a>

              {/* Quick Country Pills with Inline Expansion (No Popup) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {(showAllHeroStores ? AMAZON_STORES : AMAZON_STORES.slice(0, 8)).map(s => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setSelectedStoreCode(s.code)}
                    className={`book-store-pill ${selectedStoreCode === s.code ? 'selected' : ''}`}
                    title={`${s.name} (${s.code})`}
                  >
                    {s.flag} {s.code}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAllHeroStores(prev => !prev)}
                  className="book-store-more-btn"
                  title={showAllHeroStores ? 'Show fewer countries' : 'Show all 13 international regional stores'}
                >
                  {showAllHeroStores ? '▲ Less' : `+${AMAZON_STORES.length - 8} More ▾`}
                </button>
              </div>
            </div>
          </div>

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
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-gold)' }}>23 Oct • 6:55 PM IST</p>
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
                  {t.series.curriculumSubtitle || 'Take today’s round live with your teacher or practice unlocked rounds anytime.'}
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
                const activePin = (round as any).activePin as string | null
                const isLive = isSeriesRoundLive(round)
                const hasScheduledPin = Boolean(activePin && !isLive)
                const isTimeArrived = Boolean(round.unlock_at && new Date() >= new Date(round.unlock_at))
                const isAwaitingSession = isTimeArrived && !activePin && !isCompleted
                const isUnlocked = isLive || isCompleted

                const dayTag = round.day_number === -2
                  ? 'Preparatory Quiz 1'
                  : round.day_number === -1
                    ? 'Preparatory Quiz 2'
                    : round.day_number === 0
                      ? 'Preparatory Quiz 3'
                      : `${t.series.dayLabel} ${round.day_number}`

                return (
                  <div
                    key={round.id || round.day_number}
                    className={`card ${isLive ? 'card-gold' : ''}`}
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: isUnlocked || hasScheduledPin || isAwaitingSession ? 1 : 0.65,
                      border: isLive
                        ? '1.5px solid var(--color-gold)'
                        : isCompleted
                          ? '1px solid rgba(74, 222, 128, 0.35)'
                          : isAwaitingSession
                            ? '1px solid rgba(240, 199, 78, 0.35)'
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
                                : hasScheduledPin
                                  ? 'rgba(240, 199, 78, 0.15)'
                                  : isAwaitingSession
                                    ? 'rgba(240, 199, 78, 0.15)'
                                    : 'rgba(255,255,255,0.05)',
                            color: isLive
                              ? '#4ade80'
                              : isCompleted
                                ? '#4ade80'
                                : hasScheduledPin
                                  ? 'var(--color-gold)'
                                  : isAwaitingSession
                                    ? 'var(--color-gold)'
                                    : 'var(--color-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {isLive
                            ? `🔴 ${t.series.liveClassNow}`
                            : isCompleted
                              ? `${dayTag} • ✅ ${t.series.completedBadge}`
                              : hasScheduledPin
                                ? `${dayTag} • ⏰ PIN Ready`
                                : isAwaitingSession
                                  ? `${dayTag} • ⏳ Starting Soon`
                                  : `🔒 ${dayTag}`}
                        </span>

                        {isCompleted ? (
                          <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                            ⭐ {t.series.scoreLabel}: {userAttempt.score} / {userAttempt.max_score} {t.series.pts}
                          </span>
                        ) : isLive ? (
                          <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                            ⚡ PIN: {activePin}
                          </span>
                        ) : hasScheduledPin ? (
                          <span style={{ fontSize: '0.75rem', color: '#f6ad55', fontWeight: 600 }}>
                            🔑 PIN: {activePin}
                          </span>
                        ) : isAwaitingSession ? (
                          <span style={{ fontSize: '0.75rem', color: '#f6ad55', fontWeight: 600 }}>
                            ✨ Scheduled time reached
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#f6ad55', fontWeight: 600 }}>
                            {`${t.series.unlocksAt} ${formatUnlockSchedule(round.unlock_at)}`}
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

                      {round.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                          {round.description}
                        </p>
                      )}
                    </div>

                    {/* Action Button: Series rounds ONLY run via Live Session PIN */}
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
                          href={`/session/${activePin}`}
                          className="btn btn-primary btn-sm w-full"
                          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <span>⚡</span> {t.series.joinLive} (PIN: {activePin})
                        </Link>
                      ) : hasScheduledPin ? (
                        <button
                          disabled
                          className="btn btn-ghost btn-sm w-full"
                          style={{ opacity: 0.75, cursor: 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', border: '1px solid rgba(240, 199, 78, 0.3)' }}
                        >
                          <span>⏰</span> Live Session at {formatUnlockSchedule(round.unlock_at)}
                        </button>
                      ) : isAwaitingSession ? (
                        isAdminOrTeacher ? (
                          <button
                            onClick={() => handleLaunchSession(round)}
                            disabled={launchingRoundId === (round.id || round.quiz_id)}
                            className="btn btn-primary btn-sm w-full"
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                          >
                            <span>🚀</span> {launchingRoundId === (round.id || round.quiz_id) ? 'Launching Live Room...' : 'Start Live Session (Create PIN)'}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="btn btn-ghost btn-sm w-full"
                            style={{ opacity: 0.75, cursor: 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', border: '1px solid rgba(240, 199, 78, 0.3)' }}
                          >
                            <span>⏳</span> Waiting for Teacher to Start Live Room
                          </button>
                        )
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
        {activeTab === 'leaderboard' && (() => {
          const activeStandings = showPractice ? practiceStandings : standings
          const totalRoundsCount = showPractice ? rounds.length : (rounds.filter((r) => (r.day_number ?? 1) > 0).length || 30)

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t.series.standingsTab}</h2>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {showPractice
                      ? 'Total points earned including the 3 preparatory practice quizzes.'
                      : (t.series.standingsSubtitle || 'Total points earned across all daily rounds of the series.')}
                  </p>
                </div>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--color-border)',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '20px',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showPractice}
                    onChange={(e) => setShowPractice(e.target.checked)}
                    style={{ accentColor: 'var(--color-gold)', cursor: 'pointer', width: 15, height: 15 }}
                  />
                  <span>{showPractice ? '🌟 Practice Quizzes Included' : 'Include Practice Quizzes'}</span>
                </label>
              </div>

              {/* Prominent Book Companion & QR Banner on Series Standings */}
              <div style={{ marginBottom: '2rem' }}>
                <BookPurchaseBanner variant="card" />
              </div>

              {activeStandings.length === 0 ? (
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
                        {activeStandings.map((devotee) => (
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
                              {devotee.days_attended} / {totalRoundsCount}
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
          )
        })()}

        {/* TAB 3: PRINCIPLES GUIDE */}
        {activeTab === 'principles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t.series.principlesHeading || 'Śrīla Bhaktisiddhānta’s Principles for Community'}</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {t.series.principlesSubtitle || 'Spiritual directives for community harmony and unalloyed service from Reflections on Sacred Teachings V by His Holiness Bhakti Tirtha Swami Maharaja.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => setPrincipleScope('30')}
                    className={`btn btn-sm ${principleScope === '30' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 6 }}
                  >
                    {t.series.principlesCurrent || 'Principles 1–30 (Current Series)'}
                  </button>
                  <button
                    onClick={() => setPrincipleScope('64')}
                    className={`btn btn-sm ${principleScope === '64' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 6 }}
                  >
                    {t.series.principlesAll || 'All 64 Book Principles'}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={t.series.searchPrinciples || 'Search principles...'}
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

            {/* Book Purchase Companion Banner */}
            <BookPurchaseBanner variant="card" />

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
        {/* Book Purchase Modal */}
        <BookPurchaseModal isOpen={showBookModal} onClose={() => setShowBookModal(false)} />
      </div>
    </div>
  )
}
