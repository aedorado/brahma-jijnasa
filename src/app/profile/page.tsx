'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ProfilePage() {
  const { user, loading, logout, login, refresh } = useAuth()
  const { language, t } = useLanguage()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [selectedReviewAttempt, setSelectedReviewAttempt] = useState<Attempt | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (loading) return
    if (!user) {
      return
    }

    const loadAttempts = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id, quiz_id, score, max_score, time_taken, completed_at, answers')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })

        if (data) setAttempts(data as Attempt[])
      } catch (e) {
        console.warn('Could not load attempts:', e)
      } finally {
        setLoadingAttempts(false)
      }
    }

    loadAttempts()
  }, [user, loading, supabase])

  const stats = useMemo(() => {
    return calculateUserRating(attempts.map(a => ({
      quiz_id: a.quiz_id,
      score: a.score,
      max_score: a.max_score,
      time_taken: a.time_taken || 0,
    })))
  }, [attempts])

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-gold" />
      </div>
    )
  }

  if (!user) {
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

  const totalPoints = attempts.reduce((acc, a) => acc + Number(a.score || 0), 0)
  const totalMax = attempts.reduce((acc, a) => acc + Number(a.max_score || 0), 0)
  const avgPercentage = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0

  const localizedCurrentLevel = getLocalizedLevelText(stats.level, language)
  const localizedNextLevel = stats.nextLevel ? getLocalizedLevelText(stats.nextLevel, language) : null
  const localizedVerseMeaning = language === 'hi'
    ? (stats.level.verseMeaningHi || stats.level.verseMeaning)
    : language === 'pt'
    ? (stats.level.verseMeaningPt || stats.level.verseMeaning)
    : (stats.level.verseMeaningEn || stats.level.verseMeaning)

  return (
    <div className="container-sm" style={{ padding: '3rem 1rem 5rem', maxWidth: 680 }}>
      {/* Profile Header */}
      <div className="card-gold" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <UserAvatar
          name={user.full_name}
          url={user.avatar_url}
          size={80}
          border="3px solid var(--color-gold)"
          style={{ boxShadow: '0 0 15px rgba(212,143,24,0.3)' }}
        />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user.full_name}</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              {user.role === 'admin' ? (t.profile?.adminRole || '👑 Admin') : user.role === 'teacher' ? (t.profile?.teacherRole || '⚡ Teacher') : (t.profile?.studentRole || '🎓 Student')}
            </span>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{user.email}</p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/leaderboard" className="btn btn-primary btn-sm">
              {t.profile?.viewLeaderboard || '🏆 View Leaderboard'}
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              {t.profile?.signOut || 'Sign Out'}
            </button>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <Link href="/admin" className="btn btn-ghost btn-sm">
                {t.profile?.teacherDashboard || '⚡ Teacher Dashboard →'}
              </Link>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
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
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block' }}>{t.profile?.ratingIndex || 'Rating Index'}</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-gold)' }}>
              {stats.rating.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 400 }}>{t.profile?.pts || 'pts'}</span>
            </span>
          </div>
        </div>

        {/* Verse snippet */}
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          “{stats.level.verseSnippet}” — {localizedVerseMeaning}.
        </p>

        {/* Progress to Next Level */}
        {stats.nextLevel && localizedNextLevel ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem', color: 'var(--color-muted)', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span>{t.profile?.progressToLevel || 'Progress to Level'} {stats.nextLevel.level}: <strong>{localizedNextLevel.titleDisplay}</strong></span>
              <span>
                {stats.pointsToNext > 0 && <span><strong>{stats.pointsToNext} {t.profile?.pts || 'pts'}</strong></span>}
                {stats.pointsToNext > 0 && stats.quizzesToNext > 0 && <span> • </span>}
                {stats.quizzesToNext > 0 && <span><strong>{stats.quizzesToNext} {language === 'hi' ? 'क्विज़' : language === 'pt' ? 'quiz(zes)' : `quiz${stats.quizzesToNext > 1 ? 'zes' : ''}`}</strong> {t.profile?.needed || 'needed'}</span>}
                {stats.pointsToNext === 0 && stats.quizzesToNext === 0 && stats.accuracyToNext > 0 && <span><strong>+{stats.accuracyToNext}% {t.profile?.accuracyNeeded || 'accuracy needed'}</strong></span>}
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
                {(t.profile?.ratingReqMet || 'Rating requirement met! Complete {count} more unique quiz(zes) to unlock Level {lvl}: {title}.')
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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>{t.profile?.uniqueQuizzes || 'Unique Quizzes'}</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold)' }}>{stats.totalQuizzes}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>{t.profile?.bestPoints || 'Best Points'}</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.totalEarned}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>{t.profile?.masteryAccuracy || 'Mastery Accuracy'}</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-2)' }}>
            {attempts.length > 0 ? `${stats.accuracyPct}%` : '—'}
          </p>
        </div>
      </div>

      {/* Attempt History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{t.profile?.attemptHistory || '📜 Attempt History'}</h2>
          <Link href="/" className="btn btn-secondary btn-sm">
            {t.profile?.takeAnotherQuiz || 'Take Another Quiz →'}
          </Link>
        </div>

        {loadingAttempts ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{t.profile?.loadingAttempts || 'Loading past attempts...'}</p>
        ) : attempts.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {t.profile?.noAttemptsYet || 'You have not completed any quizzes yet.'}
            </p>
            <Link href="/q/mahabharata-authentic-01" className="btn btn-primary btn-sm">
              {t.profile?.startMahabharata || '🏹 Start Mahābhārata Quiz'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {attempts.map(att => (
              <div
                key={att.id}
                className="card"
                style={{
                  padding: '1.25rem 1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  borderRadius: 14,
                }}
              >
                {/* Top: Quiz Title, Timestamp & Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.02rem', marginBottom: '0.3rem', color: 'var(--color-text)' }}>
                      {att.quiz_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--color-muted)', flexWrap: 'wrap' }}>
                      <span>
                        📅 {(() => {
                          try {
                            const d = new Date(att.completed_at)
                            return isNaN(d.getTime()) ? att.completed_at : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                          } catch {
                            return att.completed_at
                          }
                        })()}
                      </span>
                      {att.time_taken && (
                        <span>⏱️ {Math.floor(att.time_taken / 60)}m {att.time_taken % 60}s</span>
                      )}
                    </div>
                  </div>

                  <span className="badge badge-gold" style={{ fontSize: '0.82rem', fontWeight: 800, padding: '0.35rem 0.75rem', flexShrink: 0 }}>
                    {att.score} / {att.max_score} {t.profile?.pts || 'pts'}
                  </span>
                </div>

                {/* Bottom: Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.6rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flashcard Review Modal */}
      {selectedReviewAttempt && (
        <FlashcardReviewModal
          quizId={selectedReviewAttempt.quiz_id}
          userAnswers={selectedReviewAttempt.answers || {}}
          isOpen={true}
          onClose={() => setSelectedReviewAttempt(null)}
        />
      )}
    </div>
  )
}
