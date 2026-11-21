'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { formatTime } from '@/lib/scoring'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'
import { UserAvatar } from '@/components/UserAvatar'
import type { Quiz, ScoreResult, LeaderboardEntry, AnswerMap, Question, Answer } from '@/types/quiz'
import { BookPurchaseBanner } from '@/components/BookPurchaseBanner'
import { FormattedText } from '@/components/FormattedText'

interface Props {
  quiz: Quiz
  result: ScoreResult
  timeTaken: number
  sessionId: string | null
  pin: string
  userAnswers?: AnswerMap
  onRetry?: () => void
  onPracticeAgain?: () => void
  isPracticeRun?: boolean
  officialScore?: { score: number; maxScore: number } | null
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function ScoreCard({
  quiz,
  result,
  timeTaken,
  sessionId,
  pin,
  userAnswers = {},
  onRetry,
  onPracticeAgain,
  isPracticeRun,
  officialScore,
}: Props) {
  const [displayScore, setDisplayScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [leaderboardScope, setLeaderboardScope] = useState<'session' | 'all'>(sessionId ? 'session' : 'all')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const { t, language } = useLanguage()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!showReviewModal) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showReviewModal])
  const getPerformance = (percentage: number) => {
    if (percentage >= 90) return { label: t.scoreCard.perfBrahmajnani || 'Exceptional — Brahmajñānī!', emoji: '🌟' }
    if (percentage >= 75) return { label: t.scoreCard.perfVidvan || 'Excellent — Vidvān!', emoji: '🏆' }
    if (percentage >= 60) return { label: t.scoreCard.perfJijnasu || 'Good — Jijñāsu!', emoji: '🎯' }
    if (percentage >= 40) return { label: t.scoreCard.perfSisya || 'Keep Learning — Śiṣya!', emoji: '📖' }
    return { label: t.scoreCard.perfAbhyasa || 'Seek Guidance — Abhyāsa!', emoji: '🙏' }
  }
  const { label, emoji } = getPerformance(result.percentage)

  // Animate score counter
  useEffect(() => {
    let current = 0
    const target = result.totalEarned
    const hasDecimal = target % 1 !== 0 || (result.totalMax % 1 !== 0)
    const step = Math.max(0.05, target / 60)
    const tick = () => {
      current = Math.min(current + step, target)
      const formatted = hasDecimal
        ? Math.round(current * 10) / 10
        : Math.round(current)
      setDisplayScore(formatted)
      if (current < target) {
        animRef.current = setTimeout(tick, 16)
      } else {
        setDisplayScore(target)
      }
    }
    tick()
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [result.totalEarned, result.totalMax])

  // Load leaderboard (top scores with tie-breaking)
  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('quiz_attempts')
        .select('user_id, score, max_score, time_taken, profiles(full_name, avatar_url)')

      if (sessionId && leaderboardScope === 'session') {
        query = query.eq('session_id', sessionId)
      } else if (quiz?.id) {
        query = query.eq('quiz_id', quiz.id)
      } else {
        return
      }

      const { data } = await query
        .order('score', { ascending: false })
        .order('time_taken', { ascending: true, nullsFirst: false })

      if (data) {
        const uniqueData: any[] = []
        const seenUsers = new Set<string>()
        for (const d of (data as any[])) {
          if (seenUsers.has(d.user_id)) continue
          seenUsers.add(d.user_id)
          uniqueData.push(d)
        }

        // Tie-breaker: Highest score first; if equal, lowest time_taken first
        uniqueData.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          const timeA = (a.time_taken != null && a.time_taken > 0) ? a.time_taken : Number.MAX_SAFE_INTEGER
          const timeB = (b.time_taken != null && b.time_taken > 0) ? b.time_taken : Number.MAX_SAFE_INTEGER
          return timeA - timeB
        })

        const entries: LeaderboardEntry[] = uniqueData.map((d, i) => ({
          rank: i + 1,
          user_id: d.user_id,
          full_name: d.profiles?.full_name || 'Anonymous',
          avatar_url: d.profiles?.avatar_url,
          score: d.score,
          max_score: d.max_score,
          time_taken: d.time_taken,
        }))
        setLeaderboard(entries)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          const myEntry = entries.find(e => e.user_id === user.id)
          if (myEntry) setUserRank(myEntry.rank)
        }
      }
    }
    load()
  }, [sessionId, quiz?.id, leaderboardScope])

  const scrollToReview = () => {
    const el = document.getElementById('review-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      setShowReviewModal(true)
    }
  }

  const scrollToQuestion = (index: number) => {
    const targetId = showReviewModal ? `modal-review-question-${index}` : `review-question-${index}`
    const el = document.getElementById(targetId) || document.getElementById(`review-question-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.borderColor = 'var(--color-gold)'
      el.style.boxShadow = '0 0 24px rgba(245, 158, 11, 0.45)'
      el.style.transform = 'scale(1.015)'
      setTimeout(() => {
        el.style.borderColor = ''
        el.style.boxShadow = ''
        el.style.transform = ''
      }, 1800)
    }
  }

  const renderAnswerDetails = (q: Question, userAns: Answer | undefined) => {
    // 1. True / False
    if (q.type === 'true-false') {
      const isAnsBool = typeof userAns === 'boolean'
      const isCorrect = isAnsBool && userAns === q.correct
      const correctText = q.correct ? t.quizEngine.true : t.quizEngine.false
      const userText = !isAnsBool ? t.scoreCard.notAnswered : userAns ? t.quizEngine.true : t.quizEngine.false

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.9rem 0' }}>
          {/* Actual Correct Answer */}
          <div style={{
            background: 'rgba(82, 196, 133, 0.16)',
            border: '1.5px solid var(--color-success)',
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.scoreCard.correctAnswer}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              ✓ {correctText}
            </span>
          </div>

          {/* User's Answer */}
          <div style={{
            background: !isAnsBool ? 'var(--color-surface-2)' : isCorrect ? 'rgba(82, 196, 133, 0.12)' : 'rgba(240, 101, 101, 0.16)',
            border: `1.5px solid ${!isAnsBool ? 'var(--color-border)' : isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
            padding: '0.8rem 1.15rem',
            borderRadius: 10,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ color: 'var(--color-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {t.scoreCard.yourAnswer}
              </span>
              <div style={{ color: !isAnsBool ? 'var(--color-muted)' : isCorrect ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700, marginTop: '0.15rem' }}>
                {userText}
              </div>
            </div>
            <span style={{ fontSize: '1.25rem' }}>
              {!isAnsBool ? '⚪' : isCorrect ? '✅' : '❌'}
            </span>
          </div>
        </div>
      )
    }

    // 2. Multiple Select
    if (q.type === 'multiple-select') {
      const userSelected = Array.isArray(userAns) ? (userAns as number[]) : []
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.9rem 0' }}>
          {/* Actual Correct Options */}
          <div style={{
            background: 'rgba(82, 196, 133, 0.16)',
            border: '1.5px solid var(--color-success)',
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.scoreCard.correctOptions}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {q.correctIndices.map(idx => (
                <div key={idx} style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>✓</span>
                  <span><strong>{LETTERS[idx]}.</strong> {q.options[idx]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User's Selections */}
          <div style={{
            background: userSelected.length === 0 ? 'var(--color-surface-2)' : 'rgba(255, 255, 255, 0.06)',
            border: `1.5px solid ${userSelected.length === 0 ? 'var(--color-border)' : 'var(--color-border-gold)'}`,
            padding: '0.8rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              {t.scoreCard.yourSelections}
            </p>
            {userSelected.length === 0 ? (
              <span style={{ fontSize: '0.92rem', fontStyle: 'italic', color: 'var(--color-muted)' }}>{t.scoreCard.notAnswered}</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {userSelected.map(idx => {
                  const isCorrect = q.correctIndices.includes(idx)
                  return (
                    <div key={idx} style={{ fontSize: '0.92rem', fontWeight: 600, color: isCorrect ? 'var(--color-success)' : 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{isCorrect ? '✓' : '✗'}</span>
                      <span><strong>{LETTERS[idx]}.</strong> {q.options[idx]}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    }

    // 3. Match Pairs
    if (q.type === 'match-pairs') {
      const userPairs = Array.isArray(userAns) ? (userAns as [number, number][]) : []
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.9rem 0' }}>
          {/* Actual Correct Pairings */}
          <div style={{
            background: 'rgba(82, 196, 133, 0.16)',
            border: '1.5px solid var(--color-success)',
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.scoreCard.correctPairings}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem' }}>
              {(q.correctPairs || []).map((pair: any, idx) => {
                const [l, r] = Array.isArray(pair) ? pair : [pair.left, pair.right]
                return (
                  <div key={idx} style={{ fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>✓</span>
                    <strong style={{ color: 'var(--color-text)' }}>{q.left[l]}</strong>
                    <span style={{ color: 'var(--color-muted)' }}>➔</span>
                    <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{q.right[r]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* User's Pairings */}
          <div style={{
            background: userPairs.length === 0 ? 'var(--color-surface-2)' : 'rgba(255, 255, 255, 0.06)',
            border: `1.5px solid ${userPairs.length === 0 ? 'var(--color-border)' : 'var(--color-border-gold)'}`,
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
              {t.scoreCard.yourSelections}
            </p>
            {userPairs.length === 0 ? (
              <span style={{ fontSize: '0.92rem', fontStyle: 'italic', color: 'var(--color-muted)' }}>{t.scoreCard.notAnswered}</span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem' }}>
                {q.left.map((leftItem, lIdx) => {
                  const paired = userPairs.find(([l]) => l === lIdx)
                  if (!paired) {
                    return (
                      <div key={lIdx} style={{ fontSize: '0.9rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚪</span>
                        <strong>{leftItem}</strong>
                        <span style={{ color: 'var(--color-muted)' }}>➔</span>
                        <em>({t.scoreCard.notAnswered})</em>
                      </div>
                    )
                  }
                  const rightIdx = paired[1]
                  const isMatchRight = q.correctPairs.some(([cl, cr]) => cl === lIdx && cr === rightIdx)
                  return (
                    <div key={lIdx} style={{ fontSize: '0.95rem', color: isMatchRight ? 'var(--color-success)' : 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800 }}>{isMatchRight ? '✓' : '✗'}</span>
                      <strong style={{ color: 'var(--color-text)' }}>{leftItem}</strong>
                      <span style={{ color: 'var(--color-muted)' }}>➔</span>
                      <span style={{ fontWeight: 600, color: isMatchRight ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {q.right[rightIdx]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    }

    // 4. Sequence
    if (q.type === 'sequence') {
      const userOrder = Array.isArray(userAns) ? (userAns as number[]) : []
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.9rem 0' }}>
          {/* Actual Correct Order */}
          <div style={{
            background: 'rgba(82, 196, 133, 0.16)',
            border: '1.5px solid var(--color-success)',
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.scoreCard.correctSequence}
            </p>
            <ol style={{ margin: 0, paddingLeft: '1.35rem', fontSize: '0.95rem', color: 'var(--color-text)' }}>
              {q.correctOrder.map((idx, pos) => (
                <li key={idx} style={{ margin: '0.25rem 0' }}>
                  <span style={{ fontWeight: 600 }}>{q.items[idx]}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* User's Order */}
          <div style={{
            background: userOrder.length === 0 ? 'var(--color-surface-2)' : 'rgba(255, 255, 255, 0.06)',
            border: `1.5px solid ${userOrder.length === 0 ? 'var(--color-border)' : 'var(--color-border-gold)'}`,
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              {t.scoreCard.yourSelections}
            </p>
            {userOrder.length === 0 ? (
              <span style={{ fontSize: '0.92rem', fontStyle: 'italic', color: 'var(--color-muted)' }}>{t.scoreCard.notAnswered}</span>
            ) : (
              <ol style={{ margin: 0, paddingLeft: '1.35rem', fontSize: '0.95rem', color: 'var(--color-text)' }}>
                {userOrder.map((idx, pos) => {
                  const isMatch = q.correctOrder[pos] === idx
                  return (
                    <li key={pos} style={{ margin: '0.25rem 0', color: isMatch ? 'var(--color-success)' : 'var(--color-error)' }}>
                      <span style={{ fontWeight: 500 }}>{q.items[idx]}</span> {isMatch ? '✓' : '✗'}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      )
    }

    // 5. Crossword
    if (q.type === 'crossword') {
      const userCells: Record<string, string> =
        userAns && typeof userAns === 'object'
          ? ((userAns as any).cells ? (userAns as any).cells : (userAns as Record<string, string>))
          : {}
      const words = (q as any).words || []
      const grid = (q as any).precompiledLayout?.grid || {}
      const totalCells = Object.keys(grid).length
      let correctCount = 0
      for (const [coord, cObj] of Object.entries(grid)) {
        if ((userCells[coord] || '').toUpperCase() === (cObj as any).letter.toUpperCase()) {
          correctCount++
        }
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.9rem 0' }}>
          <div style={{
            background: 'rgba(82, 196, 133, 0.16)',
            border: '1.5px solid var(--color-success)',
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {(t.crossword?.solutionsTitle || 'Crossword Solutions ({count} Clues)').replace('{count}', String(words.length))}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem' }}>
              {words.map((w: any, idx: number) => {
                const clueText = w.translations?.[language]?.clue || w.clue
                return (
                  <div key={idx} style={{ fontSize: '0.88rem', color: 'var(--color-text)' }}>
                    <strong style={{ color: 'var(--color-gold)' }}>{w.word}:</strong> {clueText}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            padding: '0.75rem 1.15rem',
            borderRadius: 10,
            fontSize: '0.9rem',
            color: 'var(--color-muted)'
          }}>
            {(t.crossword?.lettersMatched || 'Letters matched: {matched} / {total}')
              .replace('{matched}', String(correctCount))
              .replace('{total}', String(totalCells || 'total'))}
          </div>
        </div>
      )
    }

    // 6. Single Choice & all single-choice variants (MCQ, case-study, who-am-i, assertion-reason, etc.)
    if ('options' in q && typeof (q as any).correctIndex === 'number') {
      const correctIdx = (q as any).correctIndex as number
      const userIdx = typeof userAns === 'number' ? userAns : (userAns as any)?.selectedIndex ?? null
      const isRight = userIdx === correctIdx

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.9rem 0' }}>
          {/* Question-specific context display if available */}
          {(q as any).quote && (
            <div style={{ background: 'var(--color-surface-2)', borderLeft: '3.5px solid var(--color-gold)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.95rem', fontStyle: 'italic', color: '#FAF4E4' }}>
              "{(q as any).quote}"
            </div>
          )}

          {(q as any).assertion && (
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-gold)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.92rem' }}>
              <div><strong style={{ color: 'var(--color-gold)' }}>{t.scoreCard.assertionLabel || 'Assertion:'}</strong> {(q as any).assertion}</div>
              <div style={{ marginTop: '0.35rem' }}><strong style={{ color: 'var(--color-gold)' }}>{t.scoreCard.reasonLabel || 'Reason:'}</strong> {(q as any).reason}</div>
            </div>
          )}

          {(q as any).passage && (
            <div style={{ background: 'var(--color-surface-2)', borderLeft: '3.5px solid var(--color-primary)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.92rem', color: '#FAF4E4' }}>
              {(q as any).passage}
            </div>
          )}

          {(q as any).scenario && (
            <div style={{ background: 'var(--color-surface-2)', borderLeft: '3.5px solid var(--color-accent-2)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.92rem' }}>
              <strong style={{ color: 'var(--color-accent-2)' }}>{t.scoreCard.scenarioLabel || 'Scenario:'} </strong> {(q as any).scenario}
            </div>
          )}

          {(q as any).chain && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
              {(q as any).chain.map((c: string, ci: number) => (
                <span key={ci} className={`badge ${c === '?' ? 'badge-primary' : 'badge-gold'}`} style={{ fontSize: '0.85rem' }}>
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Actual Correct Answer (Prominent Emerald Container) */}
          <div style={{
            background: 'rgba(82, 196, 133, 0.16)',
            border: '1.5px solid var(--color-success)',
            padding: '0.9rem 1.15rem',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.scoreCard.correctAnswer}
            </span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {LETTERS[correctIdx]}. {(q as any).options[correctIdx]}
            </span>
          </div>

          {/* User's Answer */}
          <div style={{
            background: userIdx === null ? 'var(--color-surface-2)' : isRight ? 'rgba(82, 196, 133, 0.12)' : 'rgba(240, 101, 101, 0.16)',
            border: `1.5px solid ${userIdx === null ? 'var(--color-border)' : isRight ? 'var(--color-success)' : 'var(--color-error)'}`,
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ color: 'var(--color-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {t.scoreCard.yourAnswer}
              </span>
              <div style={{
                color: userIdx === null ? 'var(--color-muted)' : isRight ? 'var(--color-success)' : 'var(--color-error)',
                fontWeight: 700,
                marginTop: '0.15rem'
              }}>
                {userIdx !== null ? `${LETTERS[userIdx]}. ${(q as any).options[userIdx]}` : t.scoreCard.notAnswered}
              </div>
            </div>
            <span style={{ fontSize: '1.25rem' }}>{userIdx === null ? '⚪' : isRight ? '✅' : '❌'}</span>
          </div>
        </div>
      )
    }

    return null
  }

  const renderQuestionReviewCard = (q: Question, i: number, isModal = false) => {
    const r = result.questionResults.find(x => x.questionId === q.id)!
    const userAns = userAnswers[q.id]

    return (
      <div
        key={q.id}
        id={isModal ? `modal-review-question-${i}` : `review-question-${i}`}
        className="card review-question-card"
        style={{ scrollMarginTop: '5rem', transition: 'box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: '0.85rem' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>
            {t.scoreCard.questionReviewHeader || 'Question'} {i + 1} · {q.type.toUpperCase().replace(/-/g, ' ')}
          </span>
          <span style={{
            fontSize: '0.95rem', fontWeight: 800,
            color: r.correct ? 'var(--color-success)' : r.earned > 0 ? 'var(--color-gold)' : 'var(--color-error)',
          }}>
            {r.earned > 0 ? '+' : ''}{r.earned} / {r.max} pts
          </span>
        </div>

        {/* Question text */}
        <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '0.85rem', lineHeight: 1.55, color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
          <span>{r.correct ? '✅' : r.earned > 0 ? '⚡' : '❌'}</span>
          <FormattedText text={q.question} style={{ flex: 1 }} />
        </div>

        {/* Actual Answer & User Answer Comparison */}
        {renderAnswerDetails(q, userAns)}

        {/* Scriptural Explanation */}
        {q.explanation && (
          <div className="shloka-block" style={{ marginTop: '0.85rem', marginBottom: q.shloka ? '0.75rem' : 0 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              {t.scoreCard.explanationTitle}
            </p>
            <FormattedText
              text={q.explanation}
              style={{ fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--color-lotus)' }}
            />
          </div>
        )}

        {/* Shloka Citation */}
        {q.shloka && (
          <div className="shloka-block" style={{ marginTop: '0.65rem' }}>
            <p className="shloka-text">{q.shloka}</p>
            {q.transliteration && (
              <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', fontStyle: 'italic', marginBottom: '0.3rem' }}>
                {q.transliteration}
              </p>
            )}
            {q.reference && <p className="shloka-ref">{q.reference}</p>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="score-card-page">
      {/* Prominent Practice Again Card right at the Very Top */}
      {onPracticeAgain && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(240, 199, 78, 0.16), rgba(240, 199, 78, 0.05))',
            border: '1.5px solid rgba(240, 199, 78, 0.45)',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 260 }}>
            <span style={{ fontSize: '2.2rem' }}>🔄</span>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-gold)', margin: 0, lineHeight: 1.3 }}>
                {t.scoreCard?.practiceAgainHeading || 'Want to Practice This Quiz Again?'}
              </h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', lineHeight: 1.45 }}>
                {t.scoreCard?.practiceAgainDesc || 'Deepen your scriptural understanding with a self-study revision run. Your official score remains safely locked on the leaderboard!'}
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={onPracticeAgain}
            id="practice-again-top-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              padding: '0.75rem 1.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🚀</span> {t.scoreCard?.practiceAgainBtn || 'Start Practice Run'}
          </button>
        </div>
      )}

      {/* Practice Mode Banner */}
      {isPracticeRun && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1.25rem',
            borderRadius: 12,
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
            🔄 {t.scoreCard?.practiceRunNotice || 'Revision & Practice Run: This self-study attempt does not alter your official leaderboard standing.'}
          </div>
          {officialScore && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
              {t.scoreCard?.officialScoreLabel || 'Official Leaderboard Score'}: <strong style={{ color: 'var(--color-gold)' }}>{officialScore.score} / {officialScore.maxScore} pts</strong> (Preserved)
            </div>
          )}
        </div>
      )}

      {/* Score hero card */}
      <div className="card-gold text-center animate-scaleIn score-card-hero">
        {(pin === '000' || pin === '0000') && (
          <div style={{ marginBottom: '0.85rem' }}>
            <span className="badge badge-accent" style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}>
              {t.scoreCard.demoSessionBadge || '⚡ Demo Quiz Session (PIN: 0000)'}
            </span>
          </div>
        )}
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gold-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontWeight: 600 }}>
          {t.scoreCard.completedTitle} · {quiz.title}
        </p>

        <div className="score-ring" style={{ marginBottom: '1.5rem' }}>
          <span className="score-number">{displayScore}</span>
          <span className="score-total">/ {result.totalMax}</span>
        </div>

        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{emoji}</div>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--color-gold)', marginBottom: '0.4rem', fontWeight: 700 }}>{label}</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
          {result.percentage}% {t.scoreCard.accuracy} · {formatTime(timeTaken)}
        </p>

        {userRank && (
          <div className="badge badge-gold" style={{ marginTop: '0.85rem', fontSize: '0.9rem', padding: '0.45rem 1.1rem' }}>
            🏆 {t.scoreCard.classRank} #{userRank}
          </div>
        )}
      </div>

      {/* Book Purchase Companion for 64-Principles Series — Prominently placed at the top right after submission */}
      {(quiz?.category === '64-principles' || quiz?.id?.startsWith('64-day') || (quiz?.title && /principle|bhaktisiddhanta|community/i.test(quiz.title))) && (
        <div style={{ margin: '1.5rem 0' }}>
          <BookPurchaseBanner variant="post-quiz" />
        </div>
      )}

      {/* Per-category breakdown */}
      <div className="card score-card-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.scoreCard.scoreBreakdown}
          </h3>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>👇</span> {t.scoreCard.tapToReview || 'Tap to review question'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {result.questionResults.map((r, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => scrollToQuestion(i)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  scrollToQuestion(i)
                }
              }}
              className="score-breakdown-row"
              title={`Jump to Question ${i + 1} review`}
            >
              <span style={{ fontSize: '0.88rem', color: 'var(--color-muted)', minWidth: 32, fontWeight: 700 }}>
                Q{i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div className="progress-bar-track" style={{ height: 9, background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${r.max > 0 ? (r.earned / r.max) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: r.correct ? 'var(--color-success)' : r.earned > 0 ? 'var(--color-gold)' : 'var(--color-error)',
                minWidth: 56,
                textAlign: 'right',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.35rem',
              }}>
                <span>{r.earned > 0 ? '+' : ''}{r.earned}/{r.max}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>➔</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard snippet (Top 10) */}
      {leaderboard.length > 0 && (
        <div className="card score-card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.scoreCard.leaderboard} {leaderboard.length > 10 ? '(Top 10)' : ''}
            </h3>
            {sessionId && (
              <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setLeaderboardScope('session')}
                  className={`btn btn-xs ${leaderboardScope === 'session' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 6 }}
                >
                  ⚡ Live Session
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardScope('all')}
                  className={`btn btn-xs ${leaderboardScope === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 6 }}
                >
                  🌐 Quiz Leaderboard
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {leaderboard.slice(0, 10).map(entry => {
              const isCurrentUser = currentUserId && entry.user_id === currentUserId
              return (
                <div
                  key={entry.user_id}
                  className="leaderboard-row"
                  style={isCurrentUser ? { border: '1.5px solid var(--color-gold)', background: 'rgba(245, 158, 11, 0.08)' } : undefined}
                >
                  <span className={`rank-badge rank-${entry.rank <= 3 ? entry.rank : 'n'}`}>{entry.rank}</span>
                  <UserAvatar name={entry.full_name} url={entry.avatar_url} size={28} />
                  <span className="leaderboard-name" style={isCurrentUser ? { fontWeight: 800, color: 'var(--color-gold)' } : undefined}>
                    {entry.full_name || 'Anonymous'}
                    {isCurrentUser && <span style={{ fontSize: '0.75rem', marginLeft: '0.35rem', opacity: 0.85 }}>(You)</span>}
                  </span>
                  <span className="leaderboard-score">
                    {entry.score}/{entry.max_score}
                  </span>
                </div>
              )
            })}

            {/* If current user rank is outside top 10, show their position below */}
            {userRank && userRank > 10 && (() => {
              const myEntry = leaderboard.find(e => e.user_id === currentUserId)
              if (!myEntry) return null
              return (
                <>
                  <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.75rem', padding: '0.2rem 0', letterSpacing: '0.2em' }}>
                    ••••••
                  </div>
                  <div
                    key={myEntry.user_id}
                    className="leaderboard-row"
                    style={{ border: '1.5px solid var(--color-gold)', background: 'rgba(245, 158, 11, 0.12)' }}
                  >
                    <span className="rank-badge rank-n">#{myEntry.rank}</span>
                    <UserAvatar name={myEntry.full_name} url={myEntry.avatar_url} size={28} />
                    <span className="leaderboard-name" style={{ fontWeight: 800, color: 'var(--color-gold)' }}>
                      {myEntry.full_name || 'You'} <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>(You)</span>
                    </span>
                    <span className="leaderboard-score">
                      {myEntry.score}/{myEntry.max_score}
                    </span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Quick Action Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
        {onPracticeAgain && (
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={onPracticeAgain}
            id="practice-again-bottom-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
            }}
          >
            <span>🔄</span> {t.scoreCard?.practiceAgainBtn || 'Practice Quiz Again'}
          </button>
        )}

        {onRetry && !onPracticeAgain && (
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={onRetry}
            id="retry-quiz-btn"
          >
            {t.scoreCard.retryDemoQuiz || '🔄 Take Demo Quiz Again'}
          </button>
        )}
        <button
          className="btn btn-gold btn-lg w-full"
          onClick={scrollToReview}
          id="review-answers-btn"
        >
          {t.scoreCard.reviewBtn}
        </button>
        <Link href="/" className="btn btn-ghost w-full" id="back-home-score-btn">
          {t.scoreCard.backHome}
        </Link>
      </div>

      {/* Embedded Full Review Section (Always accessible right below score) */}
      <div id="review-section" style={{ paddingTop: '1rem' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>{t.scoreCard.reviewTitle}</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{quiz.title}</h2>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowReviewModal(true)}
            id="fullscreen-review-btn"
            title="Open in modal view"
          >
            {t.scoreCard.fullscreenBtn || '⛶ Fullscreen'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {quiz.questions.map((q, i) => renderQuestionReviewCard(q, i))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {t.scoreCard.backToTopBtn || '↑ Back to Top'}
          </button>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {showReviewModal && mounted && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 11, 28, 0.94)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            overflowY: 'auto',
          }}
        >
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.75rem', position: 'sticky', top: 0, background: 'rgba(15, 11, 28, 0.95)', padding: '1rem 0', zIndex: 10, borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '0.35rem' }}>{t.scoreCard.reviewTitle}</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{quiz.title}</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReviewModal(false)} id="close-review-btn">
                {t.scoreCard.close}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {quiz.questions.map((q, i) => renderQuestionReviewCard(q, i, true))}
            </div>

            <button className="btn btn-primary btn-lg w-full mt-4" onClick={() => setShowReviewModal(false)} id="close-review-bottom-btn">
              {t.scoreCard.closeReview}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
