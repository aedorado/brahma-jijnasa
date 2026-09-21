'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getPerformanceLabel, formatTime } from '@/lib/scoring'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'
import type { Quiz, ScoreResult, LeaderboardEntry, AnswerMap, Question, Answer } from '@/types/quiz'

interface Props {
  quiz: Quiz
  result: ScoreResult
  timeTaken: number
  sessionId: string | null
  pin: string
  userAnswers?: AnswerMap
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function ScoreCard({ quiz, result, timeTaken, sessionId, pin, userAnswers = {} }: Props) {
  const [displayScore, setDisplayScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const { t } = useLanguage()
  const { label, emoji } = getPerformanceLabel(result.percentage)

  // Animate score counter
  useEffect(() => {
    let current = 0
    const target = result.totalEarned
    const step = Math.max(1, target / 60)
    const tick = () => {
      current = Math.min(current + step, target)
      setDisplayScore(Math.round(current))
      if (current < target) {
        animRef.current = setTimeout(tick, 16)
      }
    }
    tick()
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [result.totalEarned])

  // Load leaderboard
  useEffect(() => {
    if (!sessionId) return
    const load = async () => {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, max_score, time_taken, profiles(full_name, avatar_url)')
        .eq('session_id', sessionId)
        .order('score', { ascending: false })

      if (data) {
        const uniqueData: any[] = []
        const seenUsers = new Set<string>()
        for (const d of (data as any[])) {
          if (seenUsers.has(d.user_id)) continue
          seenUsers.add(d.user_id)
          uniqueData.push(d)
        }

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
          const myEntry = entries.find(e => e.user_id === user.id)
          if (myEntry) setUserRank(myEntry.rank)
        }
      }
    }
    load()
  }, [sessionId])

  const scrollToReview = () => {
    const el = document.getElementById('review-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      setShowReviewModal(true)
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
              {q.correctPairs.map(([l, r], idx) => (
                <div key={idx} style={{ fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>✓</span>
                  <strong style={{ color: 'var(--color-text)' }}>{q.left[l]}</strong>
                  <span style={{ color: 'var(--color-muted)' }}>➔</span>
                  <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{q.right[r]}</span>
                </div>
              ))}
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

    // 5. Single Choice & all single-choice variants (MCQ, case-study, who-am-i, assertion-reason, etc.)
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
              <div><strong style={{ color: 'var(--color-gold)' }}>Assertion:</strong> {(q as any).assertion}</div>
              <div style={{ marginTop: '0.35rem' }}><strong style={{ color: 'var(--color-gold)' }}>Reason:</strong> {(q as any).reason}</div>
            </div>
          )}

          {(q as any).passage && (
            <div style={{ background: 'var(--color-surface-2)', borderLeft: '3.5px solid var(--color-primary)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.92rem', color: '#FAF4E4' }}>
              {(q as any).passage}
            </div>
          )}

          {(q as any).scenario && (
            <div style={{ background: 'var(--color-surface-2)', borderLeft: '3.5px solid var(--color-accent-2)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.92rem' }}>
              <strong style={{ color: 'var(--color-accent-2)' }}>Scenario: </strong> {(q as any).scenario}
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

  const renderQuestionReviewCard = (q: Question, i: number) => {
    const r = result.questionResults.find(x => x.questionId === q.id)!
    const userAns = userAnswers[q.id]

    return (
      <div key={q.id} className="card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        {/* Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: '0.85rem' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>
            Question {i + 1} · {q.type.toUpperCase().replace(/-/g, ' ')}
          </span>
          <span style={{
            fontSize: '0.95rem', fontWeight: 800,
            color: r.correct ? 'var(--color-success)' : r.earned > 0 ? 'var(--color-gold)' : 'var(--color-error)',
          }}>
            {r.earned > 0 ? '+' : ''}{r.earned} / {r.max} pts
          </span>
        </div>

        {/* Question text */}
        <p style={{ fontSize: '1.08rem', fontWeight: 600, marginBottom: '0.85rem', lineHeight: 1.55, color: 'var(--color-text)' }}>
          {r.correct ? '✅' : r.earned > 0 ? '⚡' : '❌'} {q.question}
        </p>

        {/* Actual Answer & User Answer Comparison */}
        {renderAnswerDetails(q, userAns)}

        {/* Scriptural Explanation */}
        {q.explanation && (
          <div className="shloka-block" style={{ marginTop: '0.85rem', marginBottom: q.shloka ? '0.75rem' : 0 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              {t.scoreCard.explanationTitle}
            </p>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--color-lotus)' }}>
              {q.explanation}
            </p>
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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      {/* Score hero card */}
      <div className="card-gold text-center animate-scaleIn" style={{ padding: '3rem 2rem', marginBottom: '2rem' }}>
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

      {/* Per-category breakdown */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.15rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t.scoreCard.scoreBreakdown}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {result.questionResults.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-muted)', minWidth: 28, fontWeight: 700 }}>Q{i + 1}</span>
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
              }}>
                {r.earned > 0 ? '+' : ''}{r.earned}/{r.max}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard snippet */}
      {leaderboard.length > 0 && (
        <div className="card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.15rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.scoreCard.leaderboard}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {leaderboard.slice(0, 5).map(entry => (
              <div key={entry.user_id} className="leaderboard-row">
                <span className={`rank-badge rank-${entry.rank <= 3 ? entry.rank : 'n'}`}>{entry.rank}</span>
                {entry.avatar_url && (
                  <img src={entry.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
                )}
                <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600 }}>{entry.full_name || 'Anonymous'}</span>
                <span style={{ fontWeight: 800, color: 'var(--color-gold)' }}>
                  {entry.score}/{entry.max_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
        <button
          className="btn btn-gold btn-lg w-full"
          onClick={scrollToReview}
          id="review-answers-btn"
          style={{ fontSize: '1.05rem', padding: '1.1rem' }}
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
            ⛶ Fullscreen
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
            ↑ Back to Top
          </button>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {showReviewModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 11, 28, 0.94)',
            backdropFilter: 'blur(10px)',
            zIndex: 200,
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
              {quiz.questions.map((q, i) => renderQuestionReviewCard(q, i))}
            </div>

            <button className="btn btn-primary btn-lg w-full mt-4" onClick={() => setShowReviewModal(false)} id="close-review-bottom-btn">
              {t.scoreCard.closeReview}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
