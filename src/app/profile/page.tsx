'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { calculateUserRating, getLocalizedLevelText } from '@/lib/levels'
import { UserAvatar } from '@/components/UserAvatar'
import { FlashcardReviewModal } from '@/components/FlashcardReviewModal'
import type { AnswerMap } from '@/types/quiz'

interface Attempt {
  id: string
  quiz_id: string
  score: number
  max_score: number
  time_taken: number | null
  completed_at: string
  answers?: AnswerMap
}

interface ProfileUser {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
  email?: string
}

function ProfileContent() {
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('userId')

  const { user, loading: authLoading, logout, login } = useAuth()
  const { language, t } = useLanguage()
  const supabase = createClient()

  // Viewing someone else's profile?
  const isViewingOther = Boolean(targetUserId && targetUserId !== user?.id)
  const activeUserId = isViewingOther ? targetUserId : user?.id

  // Profile data & attempts
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)

  // Viewer's own attempts (used for comparison filter when viewing another devotee)
  const [myAttemptMap, setMyAttemptMap] = useState<Map<string, { score: number; max_score: number }>>(new Map())

  // Quiz titles map (id -> friendly title from DB)
  const [quizTitles, setQuizTitles] = useState<Record<string, string>>({})

  // UI state
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unattempted'>('all')
  const [selectedReviewAttempt, setSelectedReviewAttempt] = useState<Attempt | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  // 1. Fetch Quiz Titles Catalog
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const { data } = await supabase.from('quizzes').select('id, title')
        if (data) {
          const map: Record<string, string> = {}
          data.forEach(q => {
            if (q.id && q.title) map[q.id] = q.title
          })
          setQuizTitles(map)
        }
      } catch (err) {
        console.warn('Could not load quiz titles catalog:', err)
      }
    }
    fetchQuizzes()
  }, [supabase])

  // 2. Fetch Leaderboard Ranks
  useEffect(() => {
    if (!activeUserId) return
    const fetchRank = async () => {
      try {
        const res = await fetch('/api/leaderboard?period=all')
        if (res.ok) {
          const data = await res.json()
          const devotee = data.devotees?.find((d: any) => d.userId === activeUserId)
          if (devotee) {
            setUserRank(devotee.rank)
          }
        }
      } catch (e) {
        console.warn('Could not load rank:', e)
      }
    }
    fetchRank()
  }, [activeUserId])

  // 3. Fetch Active Profile & Attempts
  useEffect(() => {
    if (authLoading) return
    if (!activeUserId) {
      setLoadingAttempts(false)
      return
    }

    const loadProfileAndAttempts = async () => {
      setLoadingAttempts(true)
      try {
        // Fetch target devotee profile if viewing other
        if (isViewingOther) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', activeUserId)
            .single()

          if (prof) {
            setProfileUser({
              id: prof.id,
              full_name: prof.full_name || 'Anonymous Seeker',
              avatar_url: prof.avatar_url || null,
              role: prof.role || 'student',
            })
          } else {
            setProfileUser(null)
          }
        } else if (user) {
          setProfileUser({
            id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            role: user.role,
            email: user.email,
          })
        }

        // Fetch active user's attempts
        const { data: attData } = await supabase
          .from('quiz_attempts')
          .select('id, quiz_id, score, max_score, time_taken, completed_at, answers')
          .eq('user_id', activeUserId)
          .order('completed_at', { ascending: false })

        if (attData) {
          const valid = (attData as Attempt[]).filter(
            a => !a.quiz_id?.startsWith('archived:') && !a.quiz_id?.startsWith('reset:')
          )
          setAttempts(valid)
        }

        // If viewing someone else AND viewer is logged in, fetch viewer's attempts for comparison
        if (isViewingOther && user?.id) {
          const { data: myData } = await supabase
            .from('quiz_attempts')
            .select('quiz_id, score, max_score')
            .eq('user_id', user.id)

          if (myData) {
            const map = new Map<string, { score: number; max_score: number }>()
            myData.forEach((att: any) => {
              if (!att.quiz_id?.startsWith('archived:') && !att.quiz_id?.startsWith('reset:')) {
                const existing = map.get(att.quiz_id)
                if (!existing || att.score > existing.score) {
                  map.set(att.quiz_id, { score: Number(att.score || 0), max_score: Number(att.max_score || 0) })
                }
              }
            })
            setMyAttemptMap(map)
          }
        }
      } catch (e) {
        console.warn('Error loading devotee profile & attempts:', e)
      } finally {
        setLoadingAttempts(false)
      }
    }

    loadProfileAndAttempts()
  }, [activeUserId, isViewingOther, user, authLoading, supabase])

  // Deduplicate attempts by quiz_id (take best performance per unique quiz)
  const uniqueAttempts = useMemo(() => {
    const map = new Map<string, Attempt>()
    for (const att of attempts) {
      const existing = map.get(att.quiz_id)
      if (!existing) {
        map.set(att.quiz_id, att)
      } else {
        const existingPct = existing.max_score > 0 ? existing.score / existing.max_score : 0
        const currentPct = att.max_score > 0 ? att.score / att.max_score : 0
        if (
          currentPct > existingPct ||
          (currentPct === existingPct && new Date(att.completed_at) > new Date(existing.completed_at))
        ) {
          map.set(att.quiz_id, att)
        }
      }
    }
    return Array.from(map.values())
  }, [attempts])

  // Quizzes completed by this devotee that the current logged-in viewer has NOT attempted
  const unattemptedByMe = useMemo(() => {
    if (!isViewingOther || !user?.id) return []
    return uniqueAttempts.filter(att => !myAttemptMap.has(att.quiz_id))
  }, [uniqueAttempts, myAttemptMap, isViewingOther, user])

  // Filtered list to display based on selected tab
  const displayedAttempts = useMemo(() => {
    if (selectedFilter === 'unattempted' && isViewingOther && user?.id) {
      return unattemptedByMe
    }
    return uniqueAttempts
  }, [selectedFilter, isViewingOther, user, unattemptedByMe, uniqueAttempts])

  // Devotee Rating and Bhakti Level
  const stats = useMemo(() => {
    return calculateUserRating(
      attempts.map(a => ({
        quiz_id: a.quiz_id,
        score: a.score,
        max_score: a.max_score,
        time_taken: a.time_taken || 0,
      }))
    )
  }, [attempts])

  // WhatsApp share payload
  const devoteeShareText = useMemo(() => {
    const name = profileUser?.full_name || 'Devotee'
    const rankText = userRank ? `🏆 *Rank #${userRank}* • ` : ''
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://brahmajijnasa.com'
    const profileUrl = `${origin}/profile?userId=${activeUserId}`

    return encodeURIComponent(
      `🌸 *Brahma Jijñāsā — Devotee Standing* 🌸\n\n` +
      `🙏 *${name}*\n` +
      `${rankText}*${stats.level.stage}*\n` +
      `⭐ *Level ${stats.level.level}: ${stats.level.title}* (${stats.level.titleDevanagari})\n` +
      `🎯 *Rating:* ${stats.rating.toLocaleString()} pts (${stats.accuracyPct}% accuracy)\n` +
      `📖 *Sacred Quizzes Completed:* ${stats.totalQuizzes}\n\n` +
      `“${stats.level.verseSnippet}”\n\n` +
      `View devotee profile & completed quizzes on Brahma Jijñāsā:\n` +
      `${profileUrl}`
    )
  }, [profileUser, userRank, stats, activeUserId])

  const copyShareText = () => {
    const raw = decodeURIComponent(devoteeShareText)
    navigator.clipboard.writeText(raw)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2500)
  }

  // Loading state
  if (authLoading || (loadingAttempts && !profileUser)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-gold" />
      </div>
    )
  }

  // Not logged in AND no targetUserId requested
  if (!user && !isViewingOther) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card text-center" style={{ maxWidth: 400, padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🙏</div>
          <h2 style={{ marginBottom: '0.75rem', fontWeight: 800 }}>{t.profile?.welcomeTitle || 'Welcome to Brahma Jijñāsā'}</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {t.profile?.welcomeSubtitle || 'Sign in with Google to view your profile and saved quiz history.'}
          </p>
          <button className="btn btn-primary w-full" onClick={() => login('/profile')}>
            {t.profile?.signInGoogle || 'Sign In with Google'}
          </button>
        </div>
      </div>
    )
  }

  // Target devotee not found
  if (isViewingOther && !profileUser && !loadingAttempts) {
    return (
      <div className="container-sm" style={{ padding: '4rem 1rem', maxWidth: 500, textAlign: 'center' }}>
        <div className="card" style={{ padding: '2.5rem 1.75rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Devotee Not Found</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            We could not find a registered devotee profile matching this link.
          </p>
          <Link href="/leaderboard" className="btn btn-primary btn-sm">
            ← Back to Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  const localizedCurrentLevel = getLocalizedLevelText(stats.level, language)
  const localizedNextLevel = stats.nextLevel ? getLocalizedLevelText(stats.nextLevel, language) : null
  const localizedVerseMeaning =
    language === 'hi'
      ? stats.level.verseMeaningHi || stats.level.verseMeaning
      : language === 'pt'
      ? stats.level.verseMeaningPt || stats.level.verseMeaning
      : stats.level.verseMeaningEn || stats.level.verseMeaning

  return (
    <div className="container-sm" style={{ padding: '2.5rem 1rem 5rem', maxWidth: 680 }}>
      {/* Devotee Breadcrumb Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <Link
          href="/leaderboard"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', paddingLeft: 0 }}
        >
          {t.profile?.backToLeaderboard || '← Back to Leaderboard'}
        </Link>

        {isViewingOther ? (
          <span className="badge badge-gold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
            {t.profile?.publicDevoteeProfile || 'Devotee Profile'}
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            Your Personal Devotional Profile
          </span>
        )}
      </div>

      {/* Profile Header Card */}
      <div
        className="card-gold"
        style={{
          padding: '2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <UserAvatar
          name={profileUser?.full_name || 'Devotee'}
          url={profileUser?.avatar_url}
          size={80}
          border="3px solid var(--color-gold)"
          style={{ boxShadow: '0 0 15px rgba(212,143,24,0.3)' }}
        />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profileUser?.full_name}</h1>
            {userRank && (
              <span className="badge badge-gold" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                Rank #{userRank}
              </span>
            )}
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              {profileUser?.role === 'admin'
                ? t.profile?.adminRole || '👑 Admin'
                : profileUser?.role === 'teacher'
                ? t.profile?.teacherRole || '⚡ Teacher'
                : profileUser?.role === 'creator'
                ? '🎨 Quiz Creator'
                : t.profile?.studentRole || '🎓 Student'}
            </span>
          </div>

          {/* Email (only displayed for logged in user's own profile) */}
          {!isViewingOther && profileUser?.email && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {profileUser.email}
            </p>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
            <button
              onClick={() => setShowShareModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>📲</span> Share Standing
            </button>

            {isViewingOther ? (
              user ? (
                <Link href="/profile" className="btn btn-ghost btn-sm">
                  👤 My Profile →
                </Link>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => login(`/profile?userId=${activeUserId}`)}>
                  {t.profile?.signInGoogle || 'Sign In'}
                </button>
              )
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={logout}>
                  {t.profile?.signOut || 'Sign Out'}
                </button>
                {(user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'creator') && (
                  <Link href="/admin" className="btn btn-ghost btn-sm">
                    {user?.role === 'creator' ? '🎨 Quiz Studio →' : t.profile?.teacherDashboard || '⚡ Teacher Dashboard →'}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bhakti Level & Rating Card */}
      <div
        className="card animate-fadeIn"
        style={{
          padding: '1.75rem',
          marginBottom: '2rem',
          border: `1.5px solid ${stats.level.badgeBorder}`,
          background: `linear-gradient(180deg, ${stats.level.badgeBg} 0%, var(--color-surface) 100%)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.2rem',
              }}
            >
              {t.profile?.devoteeStanding || 'Devotee Standing • Bhakti-rasāmṛta-sindhu'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: stats.level.color }}>
                {t.profile?.level || 'Level'} {stats.level.level}: {localizedCurrentLevel.titleDisplay}
              </span>
              <span style={{ fontSize: '1rem', color: stats.level.color, opacity: 0.85 }}>
                ({stats.level.titleDevanagari})
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
              Stage: <strong>{stats.level.stage}</strong> ({stats.level.stageDevanagari})
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block' }}>
              {t.profile?.ratingIndex || 'Rating Index'}
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-gold)' }}>
              {stats.rating.toLocaleString()}{' '}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 400 }}>
                {t.profile?.pts || 'pts'}
              </span>
            </span>
          </div>
        </div>

        {/* Verse snippet */}
        <p
          style={{
            fontSize: '0.85rem',
            fontStyle: 'italic',
            color: 'var(--color-text-secondary)',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}
        >
          “{stats.level.verseSnippet}” — {localizedVerseMeaning}.
        </p>

        {/* Progress to Next Level */}
        {stats.nextLevel && localizedNextLevel ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                marginBottom: '0.4rem',
                color: 'var(--color-muted)',
                flexWrap: 'wrap',
                gap: '0.25rem',
              }}
            >
              <span>
                {t.profile?.progressToLevel || 'Progress to Level'} {stats.nextLevel.level}:{' '}
                <strong>{localizedNextLevel.titleDisplay}</strong>
              </span>
              <span>
                {stats.pointsToNext > 0 && (
                  <span>
                    <strong>
                      {stats.pointsToNext} {t.profile?.pts || 'pts'}
                    </strong>
                  </span>
                )}
                {stats.pointsToNext > 0 && stats.quizzesToNext > 0 && <span> • </span>}
                {stats.quizzesToNext > 0 && (
                  <span>
                    <strong>
                      {stats.quizzesToNext}{' '}
                      {language === 'hi'
                        ? 'क्विज़'
                        : language === 'pt'
                        ? 'quiz(zes)'
                        : `quiz${stats.quizzesToNext > 1 ? 'zes' : ''}`}
                    </strong>{' '}
                    {t.profile?.needed || 'needed'}
                  </span>
                )}
                {stats.pointsToNext === 0 && stats.quizzesToNext === 0 && stats.accuracyToNext > 0 && (
                  <span>
                    <strong>
                      +{stats.accuracyToNext}% {t.profile?.accuracyNeeded || 'accuracy needed'}
                    </strong>
                  </span>
                )}
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${stats.progressPct}%`,
                  height: '100%',
                  background: stats.level.color,
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            {stats.quizzesToNext > 0 && stats.pointsToNext === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-gold)', marginTop: '0.4rem', marginBottom: 0 }}>
                {(
                  t.profile?.ratingReqMet ||
                  'Rating requirement met! Complete {count} more unique quiz(zes) to unlock Level {lvl}: {title}.'
                )
                  .replace('{count}', String(stats.quizzesToNext))
                  .replace('{s}', stats.quizzesToNext > 1 ? 'zes' : '')
                  .replace('{lvl}', String(stats.nextLevel.level))
                  .replace('{title}', localizedNextLevel.titleDisplay)}
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gold)', fontWeight: 700, margin: 0 }}>
            {t.profile?.highestTier || '🌟 You have achieved the highest transcendental rating tier (Premī)!'}
          </p>
        )}
      </div>

      {/* Stats 3-Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
            {t.profile?.uniqueQuizzes || 'Unique Quizzes'}
          </p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold)' }}>{stats.totalQuizzes}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
            {t.profile?.bestPoints || 'Best Points'}
          </p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.totalEarned}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
            {t.profile?.masteryAccuracy || 'Mastery Accuracy'}
          </p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-2)' }}>
            {attempts.length > 0 ? `${stats.accuracyPct}%` : '—'}
          </p>
        </div>
      </div>

      {/* Attempt History Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              {isViewingOther
                ? `📜 Completed Quizzes (${uniqueAttempts.length})`
                : t.profile?.attemptHistory || '📜 Attempt History'}
            </h2>
            {isViewingOther && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', margin: '0.2rem 0 0' }}>
                Quizzes completed by {profileUser?.full_name}
              </p>
            )}
          </div>

          {!isViewingOther && (
            <Link href="/" className="btn btn-secondary btn-sm">
              {t.profile?.takeAnotherQuiz || 'Take Another Quiz →'}
            </Link>
          )}
        </div>

        {/* INTERACTIVE COMPARISON FILTER TABS (When viewing another devotee) */}
        {isViewingOther && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--color-surface-2)',
                padding: '0.25rem',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                gap: '0.25rem',
              }}
            >
              <button
                onClick={() => setSelectedFilter('all')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedFilter === 'all' ? 'var(--color-surface)' : 'transparent',
                  color: selectedFilter === 'all' ? 'var(--color-gold)' : 'var(--color-muted)',
                  fontWeight: selectedFilter === 'all' ? 800 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: selectedFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.profile?.allQuizzes || 'All Quizzes'} ({uniqueAttempts.length})
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    login(`/profile?userId=${activeUserId}`)
                  } else {
                    setSelectedFilter('unattempted')
                  }
                }}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedFilter === 'unattempted' ? 'var(--color-surface)' : 'transparent',
                  color: selectedFilter === 'unattempted' ? '#10b981' : 'var(--color-muted)',
                  fontWeight: selectedFilter === 'unattempted' ? 800 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: selectedFilter === 'unattempted' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🎯 {t.profile?.notTakenByMe || 'Not Taken by Me'}</span>
                {user && (
                  <span
                    style={{
                      background: unattemptedByMe.length > 0 ? '#10b981' : 'var(--color-surface-3)',
                      color: unattemptedByMe.length > 0 ? '#fff' : 'var(--color-muted)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 99,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {unattemptedByMe.length}
                  </span>
                )}
              </button>
            </div>

            {/* Prompt for non-logged in viewer */}
            {!user && (
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid var(--color-border-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text)' }}>
                  💡 <strong>{t.profile?.signInToCompare || 'Sign in to compare quizzes you haven’t taken yet!'}</strong>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => login(`/profile?userId=${activeUserId}`)}
                  style={{ fontSize: '0.78rem' }}
                >
                  {t.profile?.signInGoogle || 'Sign In with Google'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quiz Attempts Roster */}
        {loadingAttempts ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            {t.profile?.loadingAttempts || 'Loading quiz history...'}
          </p>
        ) : displayedAttempts.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            {selectedFilter === 'unattempted' ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                  Splendid! You have taken every quiz that {profileUser?.full_name} has taken!
                </h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  There are no quizzes left in this list for you to explore.
                </p>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFilter('all')}>
                  View All Quizzes Completed by {profileUser?.full_name}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {isViewingOther
                    ? `${profileUser?.full_name} has not completed any quizzes yet.`
                    : t.profile?.noAttemptsYet || 'You have not completed any quizzes yet.'}
                </p>
                <Link href="/q/mahabharata-authentic-01" className="btn btn-primary btn-sm">
                  {t.profile?.startMahabharata || '🏹 Start Mahābhārata Quiz'}
                </Link>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {displayedAttempts.map(att => {
              const quizTitle =
                quizTitles[att.quiz_id] ||
                att.quiz_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

              // Is this quiz already completed by the viewer?
              const viewerAttempt = isViewingOther && user ? myAttemptMap.get(att.quiz_id) : null
              const isTakenByMe = Boolean(viewerAttempt)

              return (
                <div
                  key={att.id || att.quiz_id}
                  className="card"
                  style={{
                    padding: '1.25rem 1.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    borderRadius: 14,
                    border:
                      isViewingOther && !isTakenByMe
                        ? '1.5px solid var(--color-border-gold)'
                        : '1px solid var(--color-border)',
                    background:
                      isViewingOther && !isTakenByMe
                        ? 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, var(--color-surface) 100%)'
                        : 'var(--color-surface)',
                  }}
                >
                  {/* Top: Quiz Title, Timestamp & Score */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: 800, fontSize: '1.02rem', margin: 0, color: 'var(--color-text)' }}>
                          {quizTitle}
                        </h3>

                        {/* Status tag for comparison */}
                        {isViewingOther && user && (
                          isTakenByMe ? (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 99,
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                fontWeight: 700,
                              }}
                            >
                              ✓ You took this ({viewerAttempt?.score}/{viewerAttempt?.max_score} pts)
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 99,
                                background: 'rgba(212, 175, 55, 0.15)',
                                color: 'var(--color-gold)',
                                fontWeight: 800,
                              }}
                            >
                              ⭐ New for you!
                            </span>
                          )
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          fontSize: '0.78rem',
                          color: 'var(--color-muted)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          📅{' '}
                          {(() => {
                            try {
                              const d = new Date(att.completed_at)
                              return isNaN(d.getTime())
                                ? att.completed_at
                                : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                            } catch {
                              return att.completed_at
                            }
                          })()}
                        </span>
                        {att.time_taken && (
                          <span>
                            ⏱️ {Math.floor(att.time_taken / 60)}m {att.time_taken % 60}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target Devotee Score Badge */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        className="badge badge-gold"
                        style={{ fontSize: '0.82rem', fontWeight: 800, padding: '0.35rem 0.75rem' }}
                      >
                        {att.score} / {att.max_score} {t.profile?.pts || 'pts'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '0.6rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {isViewingOther ? (
                      <>
                        {!isTakenByMe ? (
                          <Link
                            href={`/q/${att.quiz_id}`}
                            className="btn btn-gold btn-sm"
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span>🏹</span> {t.profile?.takeThisQuiz || 'Take This Quiz ➔'}
                          </Link>
                        ) : (
                          <Link
                            href={`/q/${att.quiz_id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.82rem' }}
                          >
                            {t.profile?.retake || '🏹 Retake'}
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-gold btn-sm"
                          onClick={() => setSelectedReviewAttempt(att)}
                          style={{ fontSize: '0.82rem', fontWeight: 700 }}
                        >
                          {t.profile?.reviewFlashcards || '🎴 Review Flashcards'}
                        </button>

                        <Link
                          href={`/q/${att.quiz_id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.82rem' }}
                        >
                          {t.profile?.retake || '🏹 Retake'}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Flashcard Review Modal (Own attempts only) */}
      {selectedReviewAttempt && (
        <FlashcardReviewModal
          quizId={selectedReviewAttempt.quiz_id}
          userAnswers={selectedReviewAttempt.answers || {}}
          isOpen={true}
          onClose={() => setSelectedReviewAttempt(null)}
        />
      )}

      {/* WhatsApp Share Devotee Standing Modal */}
      {showShareModal && (
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
          onClick={() => setShowShareModal(false)}
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
              Inspire your temple sangha & friends with devotional progress on Brahma Jijñāsā!
            </p>

            {/* Visual Card Preview */}
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
                <UserAvatar name={profileUser?.full_name || 'Devotee'} url={profileUser?.avatar_url} size={48} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: stats.level.color }}>
                    {profileUser?.full_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                    {userRank ? `Rank #${userRank} • ` : ''}{stats.level.stage}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
                ⭐️ <strong>{stats.level.title}</strong> (Level {stats.level.level})<br />
                🎯 <strong>{stats.rating.toLocaleString()} pts</strong> • {stats.accuracyPct}% accuracy<br />
                📖 <strong>{stats.totalQuizzes} sacred quizzes</strong> completed
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={`https://api.whatsapp.com/send?text=${devoteeShareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                }}
              >
                <span>💬</span> Open WhatsApp to Share
              </a>

              <button
                onClick={copyShareText}
                className="btn btn-secondary w-full"
                style={{
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {copiedShare ? '✅ Copied to Clipboard!' : '📋 Copy Text to Clipboard'}
              </button>

              <button
                onClick={() => setShowShareModal(false)}
                className="btn btn-ghost w-full"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner-gold" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  )
}
