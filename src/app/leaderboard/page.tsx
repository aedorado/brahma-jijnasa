'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { DEVOTEE_LEVELS, getLocalizedLevelText } from '@/lib/levels'
import type { LeaderboardDevotee } from '@/app/api/leaderboard/route'

function DevoteeAvatar({
  name,
  url,
  size = 36,
  border = '1px solid var(--color-border)',
}: {
  name: string
  url: string | null
  size?: number
  border?: string
}) {
  const [hasError, setHasError] = useState(false)
  const initial = (name || 'D').trim().charAt(0).toUpperCase()

  if (url && !hasError) {
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border,
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--color-surface-2)',
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.42,
        color: 'var(--color-gold)',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [devotees, setDevotees] = useState<LeaderboardDevotee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all')
  const [showLevelGuide, setShowLevelGuide] = useState(false)
  const [period, setPeriod] = useState<'all' | 'weekly'>('all')
  const [selectedDevotee, setSelectedDevotee] = useState<LeaderboardDevotee | null>(null)
  const [shareDevotee, setShareDevotee] = useState<LeaderboardDevotee | null>(null)
  const [copiedNotification, setCopiedNotification] = useState(false)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?period=${period}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setDevotees(data.devotees || [])
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [period])

  // Filter devotees by search query & level
  const filteredDevotees = useMemo(() => {
    return devotees.filter(d => {
      const matchesSearch = d.fullName.toLowerCase().includes(search.toLowerCase().trim())
      const matchesLevel = selectedLevelFilter === 'all' || d.level.level === selectedLevelFilter
      return matchesSearch && matchesLevel
    })
  }, [devotees, search, selectedLevelFilter])

  // Current logged in user's position
  const myEntry = useMemo(() => {
    if (!user) return null
    return devotees.find(d => d.userId === user.id) || null
  }, [user, devotees])

  // Devotee directly ahead of logged-in user
  const devoteeAhead = useMemo(() => {
    if (!myEntry || myEntry.rank <= 1) return null
    return devotees[myEntry.rank - 2] || null
  }, [myEntry, devotees])

  // Top 3 for the podium
  const topThree = useMemo(() => {
    const gold = devotees[0] || null
    const silver = devotees[1] || null
    const bronze = devotees[2] || null
    return { gold, silver, bronze }
  }, [devotees])

  // Compose WhatsApp share link
  const getWhatsAppShareUrl = (devotee: LeaderboardDevotee) => {
    const text = `Hare Krishna! 🙏\n\nI am currently at Level ${devotee.level.level}: ${devotee.level.title} (${devotee.level.stage}) on Brahma Jijñāsā!\n\n🏆 Global Standings: Rank #${devotee.rank}\n⭐ Sacred Rating: ${devotee.rating.toLocaleString()} pts\n🎯 Accuracy: ${devotee.accuracyPct}%\n📖 Quizzes Completed: ${devotee.totalQuizzes}\n\nJoin the daily sacred quizzes and study with us:\nhttps://brahmajijnasa.org/leaderboard`
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
  }

  const handleCopyShareText = (devotee: LeaderboardDevotee) => {
    const text = `Hare Krishna! 🙏\nI am currently at Level ${devotee.level.level}: ${devotee.level.title} (${devotee.level.stage}) on Brahma Jijñāsā!\n🏆 Global Standings: Rank #${devotee.rank} (${devotee.rating.toLocaleString()} pts • ${devotee.accuracyPct}% accuracy • ${devotee.totalQuizzes} quizzes)\n\nJoin the sacred study: https://brahmajijnasa.org/leaderboard`
    navigator.clipboard.writeText(text)
    setCopiedNotification(true)
    setTimeout(() => setCopiedNotification(false), 3000)
  }

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '2.5rem 1.25rem 6rem' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--color-border-gold)', padding: '0.35rem 1rem', borderRadius: 99, marginBottom: '1rem' }}>
          <span style={{ fontSize: '1rem' }}>🏆</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t.leaderboard?.globalStandingsBadge || 'Brahma Jijñāsā Global Standings'}
          </span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          {t.leaderboard?.title || 'Global Devotee Leaderboard'}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', maxWidth: 640, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          {t.leaderboard?.subtitle || 'Track your śāstric journey through the 9 canonical stages of wisdom from Śrīla Rūpa Gosvāmī’s Bhakti-rasāmṛta-sindhu.'}
        </p>

        {/* Toggleable 9-Stage Guide Button */}
        <button
          onClick={() => setShowLevelGuide(prev => !prev)}
          className="btn btn-ghost btn-sm"
          style={{ border: '1px solid var(--color-border)', fontSize: '0.8rem' }}
        >
          {showLevelGuide
            ? (t.leaderboard?.hideLevels || '▲ Hide 9 Devotee Levels')
            : (t.leaderboard?.showLevels || '▼ Explore the 9 Devotee Levels (Bhakti-rasāmṛta-sindhu)')}
        </button>
      </div>

      {/* 9-Stage Philosophy & Tiers Explainer */}
      {showLevelGuide && (
        <div className="card animate-fadeIn" style={{ padding: '1.75rem', marginBottom: '2.5rem', border: '1px solid var(--color-border-gold)', background: 'var(--color-surface-2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
              {t.leaderboard?.canonicalSource || 'Canonical Source: Bhakti-rasāmṛta-sindhu 1.4.15–16'}
            </p>
            <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-text)', maxWidth: 700, margin: '0 auto' }}>
              “ādau śraddhā tataḥ sādhu-saṅgo &apos;tha bhajana-kriyā · tato &apos;nartha-nivṛttiḥ syāt tato niṣṭhā rucis tataḥ · athāsaktis tato bhāvas tataḥ premābhyudañcati...”
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {DEVOTEE_LEVELS.map(lvl => {
              const { meaning, titleSecondary, titleDisplay } = getLocalizedLevelText(lvl, language)
              return (
                <div
                  key={lvl.level}
                  style={{
                    padding: '1rem',
                    borderRadius: 10,
                    background: lvl.badgeBg,
                    border: `1.5px solid ${lvl.badgeBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: lvl.color }}>
                        LEVEL {lvl.level}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                        {lvl.minRating}+ {t.leaderboard?.pts || 'pts'} {lvl.minQuizzes > 0 ? `• ≥${lvl.minQuizzes} Qs` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: lvl.color }}>
                      {titleDisplay}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                      {titleSecondary} • <em>{lvl.stage}</em>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text)', lineHeight: 1.45 }}>
                      {meaning}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FEATURE 2: TIME-SLICED LEADERBOARD TABS (All-Time vs Weekly Sādhana) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '0.35rem',
            background: 'var(--color-surface-2)',
            borderRadius: 99,
            border: '1px solid var(--color-border)',
            gap: '0.4rem',
          }}
        >
          <button
            onClick={() => setPeriod('all')}
            className="btn btn-sm"
            style={{
              borderRadius: 99,
              padding: '0.45rem 1.4rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: period === 'all' ? 'var(--color-gold)' : 'transparent',
              color: period === 'all' ? '#000' : 'var(--color-muted)',
              border: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            🌐 {t.leaderboard?.allTimeTab || 'All-Time Master'}
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className="btn btn-sm"
            style={{
              borderRadius: 99,
              padding: '0.45rem 1.4rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: period === 'weekly' ? 'var(--color-gold)' : 'transparent',
              color: period === 'weekly' ? '#000' : 'var(--color-muted)',
              border: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            ⚡ {t.leaderboard?.weeklyTab || 'This Week’s Sādhana'}
            {period === 'weekly' && !loading && (
              <span
                style={{
                  marginLeft: '0.4rem',
                  fontSize: '0.72rem',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 99,
                }}
              >
                {devotees.length} active
              </span>
            )}
          </button>
        </div>
      </div>

      {/* FEATURE 1: "DEVOTEES NEAR YOU" (RIVALRY & MOTIVATION CALLOUT) */}
      <div style={{ marginBottom: '2rem' }}>
        {myEntry ? (
          <div
            className="card animate-fadeIn"
            style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--color-surface-2) 100%)',
              border: '1px solid var(--color-border-gold)',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 260, flex: 1 }}>
                <span style={{ fontSize: '2rem' }}>{myEntry.rank === 1 ? '👑' : '🎯'}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {myEntry.rank === 1 ? 'Global Champion' : 'Your Sacred Horizon'}
                    </span>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                      Rank #{myEntry.rank}
                    </span>
                  </div>
                  {myEntry.rank === 1 ? (
                    <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--color-text)' }}>
                      You are leading the global standings with <strong>{myEntry.rating.toLocaleString()} pts</strong>!
                      {devotees[1] && ` Rank #2 (${devotees[1].fullName}) is ${myEntry.rating - devotees[1].rating} pts behind you.`} Keep your daily sādhana blazing!
                    </p>
                  ) : devoteeAhead ? (
                    <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--color-text)' }}>
                      You have <strong>{myEntry.rating.toLocaleString()} pts</strong>. You are only{' '}
                      <strong style={{ color: '#10b981' }}>
                        {(devoteeAhead.rating - myEntry.rating + 1).toLocaleString()} pts behind Rank #{devoteeAhead.rank} ({devoteeAhead.fullName})
                      </strong>! Complete 1 more quiz with high accuracy to overtake!
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--color-text)' }}>
                      You are at Rank #{myEntry.rank}. Keep taking daily quizzes to climb the devotional ladder!
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShareDevotee(myEntry)}
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  <span>📲</span> Share Standing
                </button>
                <Link href="/" className="btn btn-primary btn-sm">
                  Take Next Quiz ➔
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✨</span>
              <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--color-muted)' }}>
                Sign in with Google to view your personal rank, track level progress, and compete in the sacred standings!
              </p>
            </div>
            <Link href="/api/auth/google" className="btn btn-primary btn-sm">
              Sign In to View Rank ➔
            </Link>
          </div>
        )}
      </div>

      {/* Top 3 Podium Cards */}
      {!loading && devotees.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '3rem', alignItems: 'end' }}>
          {/* Silver #2 */}
          {topThree.silver && (
            <div
              className="card text-center animate-fadeIn"
              onClick={() => setSelectedDevotee(topThree.silver)}
              style={{
                padding: '1.75rem 1.25rem',
                border: '1.5px solid rgba(192, 192, 192, 0.4)',
                background: 'linear-gradient(180deg, rgba(192, 192, 192, 0.08) 0%, var(--color-surface) 100%)',
                order: 1,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🥈</div>
              <div style={{ margin: '0 auto 0.75rem', display: 'flex', justifyContent: 'center' }}>
                <DevoteeAvatar
                  name={topThree.silver.fullName}
                  url={topThree.silver.avatarUrl}
                  size={64}
                  border="2px solid silver"
                />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: topThree.silver.level.color, marginBottom: '0.25rem' }}>
                {topThree.silver.fullName}
              </h3>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 99,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: topThree.silver.level.badgeBg,
                  color: topThree.silver.level.color,
                  border: `1px solid ${topThree.silver.level.badgeBorder}`,
                  marginBottom: '0.75rem',
                }}
              >
                {t.leaderboard?.levelPrefix || 'Level'} {topThree.silver.level.level}: {getLocalizedLevelText(topThree.silver.level, language).titleDisplay}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                {topThree.silver.rating.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>{t.leaderboard?.pts || 'pts'}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {topThree.silver.totalQuizzes} {t.leaderboard?.quizzes || 'quizzes'} • {topThree.silver.accuracyPct}% {t.leaderboard?.accuracy || 'accuracy'}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', marginTop: '0.4rem', display: 'inline-block' }}>
                View Profile ➔
              </span>
            </div>
          )}

          {/* Gold #1 (Champion) */}
          {topThree.gold && (
            <div
              className="card text-center animate-fadeIn"
              onClick={() => setSelectedDevotee(topThree.gold)}
              style={{
                padding: '2.25rem 1.5rem',
                border: '2px solid var(--color-gold)',
                background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, var(--color-surface) 100%)',
                boxShadow: '0 8px 32px rgba(212, 175, 55, 0.25)',
                order: 0,
                transform: 'scale(1.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05) translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.6))' }}>👑</div>
              <div style={{ margin: '0 auto 0.75rem', display: 'flex', justifyContent: 'center' }}>
                <DevoteeAvatar
                  name={topThree.gold.fullName}
                  url={topThree.gold.avatarUrl}
                  size={80}
                  border="3px solid var(--color-gold)"
                />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: topThree.gold.level.color, marginBottom: '0.3rem' }}>
                {topThree.gold.fullName}
              </h3>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.8rem',
                  borderRadius: 99,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: topThree.gold.level.badgeBg,
                  color: topThree.gold.level.color,
                  border: `1.5px solid ${topThree.gold.level.badgeBorder}`,
                  boxShadow: `0 0 12px ${topThree.gold.level.glow}`,
                  marginBottom: '0.85rem',
                }}
              >
                {t.leaderboard?.levelPrefix || 'Level'} {topThree.gold.level.level}: {getLocalizedLevelText(topThree.gold.level, language).titleDisplay}
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                {topThree.gold.rating.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 400 }}>{t.leaderboard?.pts || 'pts'}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                {topThree.gold.totalQuizzes} {t.leaderboard?.quizzes || 'quizzes'} • {topThree.gold.accuracyPct}% {t.leaderboard?.accuracy || 'accuracy'}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', marginTop: '0.4rem', display: 'inline-block' }}>
                View Profile ➔
              </span>
            </div>
          )}

          {/* Bronze #3 */}
          {topThree.bronze && (
            <div
              className="card text-center animate-fadeIn"
              onClick={() => setSelectedDevotee(topThree.bronze)}
              style={{
                padding: '1.75rem 1.25rem',
                border: '1.5px solid rgba(205, 127, 50, 0.4)',
                background: 'linear-gradient(180deg, rgba(205, 127, 50, 0.08) 0%, var(--color-surface) 100%)',
                order: 2,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🥉</div>
              <div style={{ margin: '0 auto 0.75rem', display: 'flex', justifyContent: 'center' }}>
                <DevoteeAvatar
                  name={topThree.bronze.fullName}
                  url={topThree.bronze.avatarUrl}
                  size={64}
                  border="2px solid #CD7F32"
                />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: topThree.bronze.level.color, marginBottom: '0.25rem' }}>
                {topThree.bronze.fullName}
              </h3>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 99,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: topThree.bronze.level.badgeBg,
                  color: topThree.bronze.level.color,
                  border: `1px solid ${topThree.bronze.level.badgeBorder}`,
                  marginBottom: '0.75rem',
                }}
              >
                {t.leaderboard?.levelPrefix || 'Level'} {topThree.bronze.level.level}: {getLocalizedLevelText(topThree.bronze.level, language).titleDisplay}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                {topThree.bronze.rating.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>{t.leaderboard?.pts || 'pts'}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {topThree.bronze.totalQuizzes} {t.leaderboard?.quizzes || 'quizzes'} • {topThree.bronze.accuracyPct}% {t.leaderboard?.accuracy || 'accuracy'}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', marginTop: '0.4rem', display: 'inline-block' }}>
                View Profile ➔
              </span>
            </div>
          )}
        </div>
      )}

      {/* Roster Controls: Search & Level Filter */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder={t.leaderboard?.searchPlaceholder || '🔍 Search devotee name...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', padding: '0.65rem 1rem' }}
            />
          </div>

          {/* Level Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{t.leaderboard?.levelLabel || 'Level:'}</label>
            <select
              value={selectedLevelFilter}
              onChange={e => setSelectedLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="input"
              style={{ padding: '0.65rem 1rem', minWidth: 160 }}
            >
              <option value="all">{t.leaderboard?.allLevels || 'All Levels (1–9)'}</option>
              {DEVOTEE_LEVELS.map(lvl => {
                const { titleDisplay } = getLocalizedLevelText(lvl, language)
                return (
                  <option key={lvl.level} value={lvl.level}>
                    {t.leaderboard?.lvlPrefix || 'Lvl'} {lvl.level}: {titleDisplay} ({lvl.minRating}+ {t.leaderboard?.pts || 'pts'}{lvl.minQuizzes > 0 ? `, ≥${lvl.minQuizzes} Qs` : ''})
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="spinner-gold" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">{t.leaderboard?.loading || 'Loading sacred standings...'}</p>
          </div>
        ) : filteredDevotees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
            <p style={{ fontWeight: 600 }}>{t.leaderboard?.noDevotees || 'No devotees found.'}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{t.leaderboard?.noDevoteesDesc || 'Try adjusting your search or level filter.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="leaderboard-table-desktop" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '1rem 1.25rem', width: 85, textAlign: 'center' }}>{t.leaderboard?.rank || 'Rank'}</th>
                    <th style={{ padding: '1rem 1.25rem', minWidth: 220 }}>{t.leaderboard?.devotee || 'Devotee'}</th>
                    <th style={{ padding: '1rem 1.25rem', minWidth: 180 }}>{t.leaderboard?.bhaktiLevel || 'Bhakti Level'}</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', minWidth: 110 }}>{t.leaderboard?.rating || 'Rating'}</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', minWidth: 90 }}>{t.leaderboard?.quizzes || 'Quizzes'}</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', minWidth: 90 }}>{t.leaderboard?.accuracy || 'Accuracy'}</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', width: 60 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevotees.map(devotee => {
                    const isMe = user?.id === devotee.userId
                    const { titleDisplay, stageDisplay } = getLocalizedLevelText(devotee.level, language)
                    return (
                      <tr
                        key={devotee.userId}
                        onClick={() => setSelectedDevotee(devotee)}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: isMe ? 'rgba(212,175,55,0.08)' : undefined,
                          transition: 'background 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (!isMe) e.currentTarget.style.background = 'var(--color-surface-2)'
                        }}
                        onMouseLeave={e => {
                          if (!isMe) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {/* FEATURE 3: Rank + Momentum Indicator (▲ / ▼ / 🔥) */}
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontWeight: 800 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                            {devotee.rank === 1 ? (
                              <span style={{ fontSize: '1.25rem' }}>🥇</span>
                            ) : devotee.rank === 2 ? (
                              <span style={{ fontSize: '1.25rem' }}>🥈</span>
                            ) : devotee.rank === 3 ? (
                              <span style={{ fontSize: '1.25rem' }}>🥉</span>
                            ) : (
                              <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
                                #{devotee.rank}
                              </span>
                            )}
                            {devotee.rankDelta && devotee.rankDelta > 0 ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#10b981',
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                ▲+{devotee.rankDelta}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Devotee Info */}
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <DevoteeAvatar
                              name={devotee.fullName}
                              url={devotee.avatarUrl}
                              size={38}
                              border={`1.5px solid ${devotee.level.badgeBorder}`}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: devotee.level.color }}>
                                  {devotee.fullName}
                                </span>
                                {devotee.isSurging && (
                                  <span title="Active sādhaka surging in rankings!" style={{ fontSize: '0.75rem' }}>🔥</span>
                                )}
                                {isMe && (
                                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{t.leaderboard?.youBadge || 'YOU'}</span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                                {t.leaderboard?.stage || 'Stage'}: {stageDisplay}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Level Badge */}
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.3rem 0.75rem',
                              borderRadius: 99,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: devotee.level.badgeBg,
                              color: devotee.level.color,
                              border: `1px solid ${devotee.level.badgeBorder}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: devotee.level.color }} />
                            {t.leaderboard?.lvlPrefix || 'Lvl'} {devotee.level.level}: {titleDisplay}
                          </span>
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: devotee.level.color }}>
                            {devotee.rating.toLocaleString()}
                          </span>
                        </td>

                        {/* Quizzes Taken */}
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text)' }}>
                          {devotee.totalQuizzes}
                        </td>

                        {/* Accuracy */}
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: devotee.accuracyPct >= 75 ? 'var(--color-success)' : devotee.accuracyPct >= 50 ? 'var(--color-gold)' : 'var(--color-muted)' }}>
                            {devotee.accuracyPct}%
                          </span>
                        </td>

                        {/* Share Action */}
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShareDevotee(devotee)
                            }}
                            title="Share Devotee Standing on WhatsApp"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '0.2rem',
                            }}
                          >
                            📲
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-based Roster View */}
            <div className="leaderboard-cards-mobile" style={{ padding: '0.85rem' }}>
              {filteredDevotees.map(devotee => {
                const isMe = user?.id === devotee.userId
                const { titleDisplay } = getLocalizedLevelText(devotee.level, language)
                return (
                  <div
                    key={devotee.userId}
                    onClick={() => setSelectedDevotee(devotee)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.75rem',
                      borderRadius: 10,
                      background: isMe ? 'rgba(212,175,55,0.1)' : 'var(--color-surface-2)',
                      border: `1px solid ${isMe ? 'var(--color-border-gold)' : 'var(--color-border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Rank */}
                    <div style={{ width: 34, textAlign: 'center', fontWeight: 800, flexShrink: 0 }}>
                      {devotee.rank === 1 ? '🥇' : devotee.rank === 2 ? '🥈' : devotee.rank === 3 ? '🥉' : (
                        <span style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>#{devotee.rank}</span>
                      )}
                      {devotee.rankDelta && devotee.rankDelta > 0 ? (
                        <div style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 800 }}>▲+{devotee.rankDelta}</div>
                      ) : null}
                    </div>

                    {/* Avatar */}
                    <DevoteeAvatar
                      name={devotee.fullName}
                      url={devotee.avatarUrl}
                      size={32}
                      border={`1.5px solid ${devotee.level.badgeBorder}`}
                    />

                    {/* Name & Level Badge */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: devotee.level.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {devotee.fullName}
                        </span>
                        {devotee.isSurging && <span style={{ fontSize: '0.7rem' }}>🔥</span>}
                        {isMe && <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>YOU</span>}
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: devotee.level.color,
                          marginTop: '0.1rem',
                        }}
                      >
                        {t.leaderboard?.lvlPrefix || 'Lvl'} {devotee.level.level}: {titleDisplay}
                      </span>
                    </div>

                    {/* Score & Stats */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-gold)' }}>
                        {devotee.rating.toLocaleString()} <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--color-muted)' }}>pts</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)' }}>
                        {devotee.totalQuizzes} Qs • {devotee.accuracyPct}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* FEATURE 7: INTERACTIVE DEVOTEE PROFILE MODAL / DRAWER */}
      {selectedDevotee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedDevotee(null)}
        >
          <div
            className="card animate-fadeIn"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '1.75rem',
              borderRadius: 16,
              background: 'var(--color-surface)',
              border: `2px solid ${selectedDevotee.level.badgeBorder}`,
              boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDevotee(null)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-muted)',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            {/* Devotee Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <DevoteeAvatar
                name={selectedDevotee.fullName}
                url={selectedDevotee.avatarUrl}
                size={64}
                border={`2px solid ${selectedDevotee.level.color}`}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedDevotee.level.color }}>
                    {selectedDevotee.fullName}
                  </h3>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                    Rank #{selectedDevotee.rank}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                  Stage: <strong>{selectedDevotee.level.stage}</strong> ({selectedDevotee.level.stageDevanagari})
                </div>
              </div>
            </div>

            {/* Level Badge Card */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: selectedDevotee.level.badgeBg,
                border: `1px solid ${selectedDevotee.level.badgeBorder}`,
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: selectedDevotee.level.color }}>
                  LEVEL {selectedDevotee.level.level}: {selectedDevotee.level.title}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  <em>{selectedDevotee.level.verseSnippet}</em>
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.45 }}>
                {selectedDevotee.level.verseMeaning}
              </p>
            </div>

            {/* Stats 4-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Rating Points</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                  {selectedDevotee.rating.toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Accuracy</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>
                  {selectedDevotee.accuracyPct}%
                </div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Quizzes Done</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {selectedDevotee.totalQuizzes}
                </div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Total Score</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {selectedDevotee.totalScore} / {selectedDevotee.totalMax}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href={`/profile?userId=${selectedDevotee.userId}`}
                className="btn btn-gold btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
              >
                <span>👤</span> View Complete Profile ➔
              </Link>
              <button
                onClick={() => {
                  setShareDevotee(selectedDevotee)
                  setSelectedDevotee(null)
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>📲</span> Share on WhatsApp
              </button>
              <button
                onClick={() => setSelectedDevotee(null)}
                className="btn btn-ghost btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 6: WHATSAPP SHAREABLE DEVOTEE CARD MODAL */}
      {shareDevotee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShareDevotee(null)}
        >
          <div
            className="card animate-fadeIn"
            style={{
              maxWidth: 440,
              width: '100%',
              padding: '1.75rem',
              borderRadius: 16,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border-gold)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <span style={{ fontSize: '2.5rem', display: 'inline-block', marginBottom: '0.5rem' }}>📲</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.3rem', color: 'var(--color-text)' }}>
              Share Standing on WhatsApp
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
              Inspire your temple sangha & friends with your devotional progress on Brahma Jijñāsā!
            </p>

            {/* Visual Card Preview (Light & Dark Theme Harmonious) */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(240,199,78,0.12) 0%, var(--color-surface-2) 100%)',
                padding: '1.25rem',
                borderRadius: 12,
                border: '1.5px solid var(--color-border-gold)',
                marginBottom: '1.5rem',
                textAlign: 'left',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <DevoteeAvatar name={shareDevotee.fullName} url={shareDevotee.avatarUrl} size={48} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: shareDevotee.level.color }}>
                    {shareDevotee.fullName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                    Rank #{shareDevotee.rank} • {shareDevotee.level.stage}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
                ⭐️ <strong>{shareDevotee.level.title}</strong> (Level {shareDevotee.level.level})<br />
                🎯 <strong>{shareDevotee.rating.toLocaleString()} pts</strong> • {shareDevotee.accuracyPct}% accuracy<br />
                📖 <strong>{shareDevotee.totalQuizzes} sacred quizzes</strong> completed
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={getWhatsAppShareUrl(shareDevotee)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: 8,
                }}
              >
                <span>💬</span> Open WhatsApp to Share
              </a>

              <button
                onClick={() => handleCopyShareText(shareDevotee)}
                className="btn btn-ghost btn-sm"
                style={{ border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
              >
                {copiedNotification ? '✓ Copied to Clipboard!' : '📋 Copy Text to Clipboard'}
              </button>

              <button
                onClick={() => setShareDevotee(null)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky "My Standing" Bottom Bar */}
      {myEntry && (
        <div className="leaderboard-sticky-bar">
          <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                #{myEntry.rank}
              </span>
              <span style={{ fontWeight: 700, color: myEntry.level.color, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {myEntry.fullName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                ({myEntry.level.title})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontSize: '0.95rem' }}>
                  {myEntry.rating.toLocaleString()} {t.leaderboard?.pts || 'pts'}
                </span>
              </div>
              <button
                onClick={() => setShareDevotee(myEntry)}
                className="btn btn-ghost btn-sm"
                style={{ border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
              >
                <span>📲</span> Share
              </button>
              <Link href="/" className="btn btn-primary btn-sm">
                {t.leaderboard?.takeNextQuiz || 'Next Quiz ➔'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
