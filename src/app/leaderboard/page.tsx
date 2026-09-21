'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { DEVOTEE_LEVELS } from '@/lib/levels'
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
        crossOrigin="anonymous"
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
  const [devotees, setDevotees] = useState<LeaderboardDevotee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all')
  const [showLevelGuide, setShowLevelGuide] = useState(false)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard')
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
  }, [])

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

  // Top 3 for the podium
  const topThree = useMemo(() => {
    const gold = devotees[0] || null
    const silver = devotees[1] || null
    const bronze = devotees[2] || null
    return { gold, silver, bronze }
  }, [devotees])

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '2.5rem 1.25rem 6rem' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--color-border-gold)', padding: '0.35rem 1rem', borderRadius: 99, marginBottom: '1rem' }}>
          <span style={{ fontSize: '1rem' }}>🏆</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Brahma Jijñāsā Global Standings
          </span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Global Devotee Leaderboard
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', maxWidth: 640, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          Track your śāstric journey through the 9 canonical stages of wisdom from Śrīla Rūpa Gosvāmī’s <em>Bhakti-rasāmṛta-sindhu</em>.
        </p>

        {/* Toggleable 9-Stage Guide Button */}
        <button
          onClick={() => setShowLevelGuide(prev => !prev)}
          className="btn btn-ghost btn-sm"
          style={{ border: '1px solid var(--color-border)', fontSize: '0.8rem' }}
        >
          {showLevelGuide ? '▲ Hide 9 Devotee Levels' : '▼ Explore the 9 Devotee Levels (Bhakti-rasāmṛta-sindhu)'}
        </button>
      </div>

      {/* 9-Stage Philosophy & Codeforces Tiers Explainer */}
      {showLevelGuide && (
        <div className="card animate-fadeIn" style={{ padding: '1.75rem', marginBottom: '2.5rem', border: '1px solid var(--color-border-gold)', background: 'var(--color-surface-2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
              Canonical Source: Bhakti-rasāmṛta-sindhu 1.4.15–16
            </p>
            <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--color-text)', maxWidth: 700, margin: '0 auto' }}>
              “ādau śraddhā tataḥ sādhu-saṅgo 'tha bhajana-kriyā · tato 'nartha-nivṛttiḥ syāt tato niṣṭhā rucis tataḥ · athāsaktis tato bhāvas tataḥ premābhyudañcati...”
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {DEVOTEE_LEVELS.map(lvl => (
              <div
                key={lvl.level}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 10,
                  background: 'var(--color-surface)',
                  border: `1px solid ${lvl.badgeBorder}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <span
                  style={{
                    background: lvl.badgeBg,
                    color: lvl.color,
                    border: `1px solid ${lvl.badgeBorder}`,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}
                >
                  {lvl.level}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: lvl.color, fontSize: '0.9rem' }}>
                      {lvl.title} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({lvl.titleDevanagari})</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                      {lvl.minRating}+ pts
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    <em>"{lvl.verseSnippet}"</em> — {lvl.verseMeaning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {!loading && devotees.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '3rem', alignItems: 'end' }}>
          {/* Silver #2 */}
          {topThree.silver && (
            <div
              className="card text-center animate-fadeIn"
              style={{
                padding: '1.75rem 1.25rem',
                border: '1.5px solid rgba(192, 192, 192, 0.4)',
                background: 'linear-gradient(180deg, rgba(192, 192, 192, 0.08) 0%, var(--color-surface) 100%)',
                order: 1,
              }}
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
                Level {topThree.silver.level.level}: {topThree.silver.level.title}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                {topThree.silver.rating.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {topThree.silver.totalQuizzes} quizzes • {topThree.silver.accuracyPct}% accuracy
              </p>
            </div>
          )}

          {/* Gold #1 (Champion) */}
          {topThree.gold && (
            <div
              className="card text-center animate-fadeIn"
              style={{
                padding: '2.25rem 1.5rem',
                border: '2px solid var(--color-gold)',
                background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, var(--color-surface) 100%)',
                boxShadow: '0 8px 32px rgba(212, 175, 55, 0.25)',
                order: 0,
                transform: 'scale(1.03)',
              }}
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
                Level {topThree.gold.level.level}: {topThree.gold.level.title} ({topThree.gold.level.titleDevanagari})
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                {topThree.gold.rating.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                {topThree.gold.totalQuizzes} quizzes • {topThree.gold.accuracyPct}% accuracy
              </p>
            </div>
          )}

          {/* Bronze #3 */}
          {topThree.bronze && (
            <div
              className="card text-center animate-fadeIn"
              style={{
                padding: '1.75rem 1.25rem',
                border: '1.5px solid rgba(205, 127, 50, 0.4)',
                background: 'linear-gradient(180deg, rgba(205, 127, 50, 0.08) 0%, var(--color-surface) 100%)',
                order: 2,
              }}
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
                Level {topThree.bronze.level.level}: {topThree.bronze.level.title}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                {topThree.bronze.rating.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>pts</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {topThree.bronze.totalQuizzes} quizzes • {topThree.bronze.accuracyPct}% accuracy
              </p>
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
              placeholder="🔍 Search devotee name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', padding: '0.65rem 1rem' }}
            />
          </div>

          {/* Level Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>Level:</label>
            <select
              value={selectedLevelFilter}
              onChange={e => setSelectedLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="input"
              style={{ padding: '0.65rem 1rem', minWidth: 160 }}
            >
              <option value="all">All Levels (1–9)</option>
              {DEVOTEE_LEVELS.map(lvl => (
                <option key={lvl.level} value={lvl.level}>
                  Lvl {lvl.level}: {lvl.title} ({lvl.minRating}+)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="spinner-gold" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading sacred standings...</p>
          </div>
        ) : filteredDevotees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
            <p style={{ fontWeight: 600 }}>No devotees found.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Try adjusting your search or level filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '1rem 1.25rem', width: 70, textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '1rem 1.25rem', minWidth: 220 }}>Devotee</th>
                  <th style={{ padding: '1rem 1.25rem', minWidth: 180 }}>Bhakti Level</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', minWidth: 110 }}>Rating</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center', minWidth: 90 }}>Quizzes</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', minWidth: 90 }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevotees.map(devotee => {
                  const isMe = user?.id === devotee.userId
                  return (
                    <tr
                      key={devotee.userId}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isMe ? 'rgba(212,175,55,0.08)' : undefined,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isMe) e.currentTarget.style.background = 'var(--color-surface-2)'
                      }}
                      onMouseLeave={e => {
                        if (!isMe) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontWeight: 800 }}>
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
                              {isMe && (
                                <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>YOU</span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                              Stage: {devotee.level.stage}
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
                          Lvl {devotee.level.level}: {devotee.level.title}
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky "My Standing" Bottom Bar */}
      {myEntry && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(15, 12, 28, 0.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--color-border-gold)',
            padding: '0.85rem 1.25rem',
            zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span className="badge badge-gold" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                Rank #{myEntry.rank}
              </span>
              <span style={{ fontWeight: 700, color: myEntry.level.color, fontSize: '0.95rem' }}>
                {myEntry.fullName}
              </span>
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: 99,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: myEntry.level.badgeBg,
                  color: myEntry.level.color,
                  border: `1px solid ${myEntry.level.badgeBorder}`,
                }}
              >
                Level {myEntry.level.level}: {myEntry.level.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block' }}>Rating</span>
                <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                  {myEntry.rating.toLocaleString()} pts
                </span>
              </div>
              <Link href="/" className="btn btn-primary btn-sm">
                Take Next Quiz ➔
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
