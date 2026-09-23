'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { Quiz, Question, AnswerMap, Answer } from '@/types/quiz'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/types/quiz'

interface Props {
  quizId: string
  quizTitle?: string
  userAnswers?: AnswerMap
  isOpen: boolean
  onClose: () => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export function FlashcardReviewModal({ quizId, quizTitle, userAnswers = {}, isOpen, onClose }: Props) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [needsPracticeIds, setNeedsPracticeIds] = useState<Set<number>>(new Set())
  const [userPracticeAnswers, setUserPracticeAnswers] = useState<Record<number, any>>({})
  const [revealedClues, setRevealedClues] = useState<Record<number, number>>({})
  const [filterWeakOnly, setFilterWeakOnly] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // Fetch Quiz Data
  useEffect(() => {
    if (!isOpen || !quizId) return
    let active = true
    setLoading(true)
    setError(null)
    setIsFlipped(false)
    setCurrentIndex(0)
    setShowSummary(false)
    setFilterWeakOnly(false)
    setMasteredIds(new Set())
    setNeedsPracticeIds(new Set())
    setUserPracticeAnswers({})

    fetch(`/api/quiz/${quizId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load quiz details')
        return res.json()
      })
      .then((data: Quiz) => {
        if (active) {
          setQuiz(data)
          setLoading(false)
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'Could not load quiz')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [isOpen, quizId])

  // Active question list (either all questions or weak-only)
  const activeQuestions = useMemo(() => {
    if (!quiz) return []
    if (filterWeakOnly) {
      const weakList = quiz.questions.filter(q => needsPracticeIds.has(q.id))
      return weakList.length > 0 ? weakList : quiz.questions
    }
    return quiz.questions
  }, [quiz, filterWeakOnly, needsPracticeIds])

  const currentQuestion: Question | undefined = activeQuestions[currentIndex]

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Toggle flip unless clicking a button
        if ((e.target as HTMLElement).tagName !== 'BUTTON') {
          e.preventDefault()
          setIsFlipped(prev => !prev)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, activeQuestions.length, isFlipped])

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setIsFlipped(false)
      setCurrentIndex(prev => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setCurrentIndex(prev => prev - 1)
    }
  }

  const markMastered = (qId: number) => {
    setMasteredIds(prev => {
      const next = new Set(prev)
      next.add(qId)
      return next
    })
    setNeedsPracticeIds(prev => {
      const next = new Set(prev)
      next.delete(qId)
      return next
    })
    handleNext()
  }

  const markNeedPractice = (qId: number) => {
    setNeedsPracticeIds(prev => {
      const next = new Set(prev)
      next.add(qId)
      return next
    })
    setMasteredIds(prev => {
      const next = new Set(prev)
      next.delete(qId)
      return next
    })
    handleNext()
  }

  const handleSelectPracticeOption = (qId: number, val: any) => {
    setUserPracticeAnswers(prev => ({
      ...prev,
      [qId]: val,
    }))
  }

  if (!isOpen) return null

  const renderQuestionFront = (q: Question) => {
    const practiceAns = userPracticeAnswers[q.id]
    const pastAns = userAnswers[q.id]

    return (
      <div className="flashcard-front-content">
        {/* Category & Cognitive Tier Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {quiz?.category ? `${CATEGORY_ICONS[quiz.category] || '🪷'} ${CATEGORY_LABELS[quiz.category] || quiz.category}` : 'Vedic Wisdom'}
            </span>
            <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(157, 108, 208, 0.2)', color: 'var(--color-accent-2)', border: '1px solid rgba(157, 108, 208, 0.4)' }}>
              {q.type.replace(/-/g, ' ')}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)' }}>
            {q.difficulty === 'easy' ? '🌱 Śravaṇa (Tier 1)' : q.difficulty === 'medium' ? '🌿 Manana (Tier 2)' : '🌳 Nididhyāsana (Tier 3)'}
          </span>
        </div>

        {/* Shloka/Devanagari if present */}
        {q.shloka && (
          <div style={{
            background: 'rgba(240, 199, 78, 0.08)',
            borderLeft: '3px solid var(--color-gold)',
            padding: '0.75rem 1rem',
            borderRadius: '0 8px 8px 0',
            fontFamily: 'var(--font-sanskrit)',
            fontSize: '1.05rem',
            color: 'var(--color-gold)',
            lineHeight: 1.6,
            marginBottom: '1rem',
          }}>
            {q.shloka}
            {q.transliteration && (
              <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', margin: 0 }}>
                {q.transliteration}
              </p>
            )}
          </div>
        )}

        {/* Question Prompt */}
        <h3 style={{ fontSize: '1.12rem', fontWeight: 700, lineHeight: 1.5, marginBottom: '1.15rem', color: 'var(--color-text)' }}>
          {q.question}
        </h3>

        {/* Who Said This Quote Box */}
        {q.type === 'who-said-this' && 'quote' in q && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px dashed var(--color-border-gold)',
            padding: '0.85rem 1.15rem',
            borderRadius: 10,
            fontStyle: 'italic',
            fontSize: '0.98rem',
            color: 'var(--color-gold)',
            marginBottom: '1.25rem',
          }}>
            “{q.quote}”
            {q.context && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.4rem', fontStyle: 'normal' }}>
                Context: {q.context}
              </p>
            )}
          </div>
        )}

        {/* Assertion & Reason Box */}
        {q.type === 'assertion-reason' && 'assertion' in q && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem 1rem', borderRadius: 8, borderLeft: '3px solid var(--color-primary)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Assertion (A): </span>
              <span style={{ fontSize: '0.92rem' }}>{q.assertion}</span>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem 1rem', borderRadius: 8, borderLeft: '3px solid var(--color-accent)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent-2)', textTransform: 'uppercase' }}>Reason (R): </span>
              <span style={{ fontSize: '0.92rem' }}>{q.reason}</span>
            </div>
          </div>
        )}

        {/* Spot the Error Passage */}
        {q.type === 'spot-the-error' && 'passage' in q && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: '1.25rem', fontStyle: 'italic', fontSize: '0.92rem' }}>
            {q.passage}
          </div>
        )}

        {/* Who Am I Progressive Clues */}
        {q.type === 'who-am-i' && 'clues' in q && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {q.clues.map((clue, idx) => {
                const isRevealed = (revealedClues[q.id] ?? 1) > idx
                return (
                  <div key={idx} style={{
                    background: isRevealed ? 'rgba(240, 199, 78, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isRevealed ? 'var(--color-border-gold)' : 'var(--color-border)'}`,
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span>
                      <strong>Clue #{idx + 1}:</strong> {isRevealed ? clue : '🔒 [Hidden]'}
                    </span>
                    {!isRevealed && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setRevealedClues(prev => ({ ...prev, [q.id]: idx + 1 }))
                        }}
                      >
                        Reveal
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Options / Self-Testing View */}
        {('options' in q && Array.isArray(q.options)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
              💡 Tap an option to test yourself:
            </p>
            {q.options.map((opt, idx) => {
              const isSelected = practiceAns === idx || (Array.isArray(practiceAns) && practiceAns.includes(idx))
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (q.type === 'multiple-select') {
                      const current = Array.isArray(practiceAns) ? [...practiceAns] : []
                      const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx]
                      handleSelectPracticeOption(q.id, next)
                    } else {
                      handleSelectPracticeOption(q.id, idx)
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(240, 199, 78, 0.15)' : 'var(--color-surface-2)',
                    border: `1.5px solid ${isSelected ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    color: isSelected ? 'var(--color-gold)' : 'var(--color-text)',
                    textAlign: 'left',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#1C1635' : 'var(--color-text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {LETTERS[idx]}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* True / False Options */}
        {q.type === 'true-false' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            {[true, false].map((val) => {
              const isSelected = practiceAns === val
              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectPracticeOption(q.id, val)
                  }}
                  style={{
                    padding: '1rem',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(240, 199, 78, 0.15)' : 'var(--color-surface-2)',
                    border: `1.5px solid ${isSelected ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    color: isSelected ? 'var(--color-gold)' : 'var(--color-text)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  {val ? '✓ True (सत्य)' : '✗ False (असत्य)'}
                </button>
              )
            })}
          </div>
        )}

        {/* Sequence Scrambled Items */}
        {q.type === 'sequence' && 'items' in q && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              📜 Items to sequence chronologically:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {q.items.map((item, idx) => (
                <div key={idx} style={{ padding: '0.65rem 0.85rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.9rem' }}>
                  • {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Pairs Front View */}
        {q.type === 'match-pairs' && 'left' in q && (
          <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Left Column</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {q.left.map((item, idx) => (
                  <div key={idx} style={{ padding: '0.55rem 0.75rem', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: '0.85rem' }}>
                    {idx + 1}. {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Right Column</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {q.right.map((item, idx) => (
                  <div key={idx} style={{ padding: '0.55rem 0.75rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.85rem' }}>
                    {LETTERS[idx]}. {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Previous Quiz Answer Note */}
        {pastAns !== undefined && (
          <div style={{ marginTop: '1.25rem', padding: '0.6rem 0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.8rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>📝</span>
            <span>Recorded in your past attempt. Tap <strong>Flip Card 🔄</strong> to inspect authentic śāstric solution.</span>
          </div>
        )}
      </div>
    )
  }

  const renderQuestionBack = (q: Question) => {
    return (
      <div className="flashcard-back-content">
        {/* Solution Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Authentic Answer & Purport
            </span>
          </div>
          <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
            +{q.points} pt{q.points > 1 ? 's' : ''}
          </span>
        </div>

        {/* Correct Answer Display */}
        <div style={{
          background: 'rgba(82, 196, 133, 0.14)',
          border: '1.5px solid var(--color-success)',
          padding: '1rem 1.25rem',
          borderRadius: 12,
          marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Correct Answer:
          </p>

          {/* Single Choice / Spot the Error / Missing Link / Who Said This */}
          {('correctIndex' in q && typeof q.correctIndex === 'number' && 'options' in q) && (
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-success)', fontSize: '1.1rem' }}>✓</span>
              <span><strong>{LETTERS[q.correctIndex]}.</strong> {q.options[q.correctIndex]}</span>
            </div>
          )}

          {/* Multiple Select */}
          {q.type === 'multiple-select' && 'correctIndices' in q && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {q.correctIndices.map(idx => (
                <div key={idx} style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success)' }}>✓</span>
                  <span><strong>{LETTERS[idx]}.</strong> {q.options[idx]}</span>
                </div>
              ))}
            </div>
          )}

          {/* True / False */}
          {q.type === 'true-false' && 'correct' in q && (
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              ✓ {q.correct ? 'True (सत्य)' : 'False (असत्य)'}
            </div>
          )}

          {/* Sequence Correct Order */}
          {q.type === 'sequence' && 'correctOrder' in q && 'items' in q && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
              {q.correctOrder.map((itemIdx, seqIdx) => (
                <div key={seqIdx} style={{ fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-success)', color: '#1C1635', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {seqIdx + 1}
                  </span>
                  <span>{q.items[itemIdx]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Match Pairs Correct Pairs */}
          {q.type === 'match-pairs' && 'correctPairs' in q && 'left' in q && 'right' in q && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {q.correctPairs.map(([l, r], idx) => (
                <div key={idx} style={{ fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>✓</span>
                  <strong>{q.left[l]}</strong>
                  <span style={{ color: 'var(--color-muted)' }}>➔</span>
                  <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{q.right[r]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scriptural Citation (Śāstra Pramāṇa) */}
        {q.reference && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(240, 199, 78, 0.08)',
            border: '1px solid var(--color-border-gold)',
            padding: '0.65rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '1.1rem' }}>📜</span>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', display: 'block' }}>
                Scriptural Reference / Śāstra Pramāṇa
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {q.reference}
              </span>
            </div>
          </div>
        )}

        {/* Detailed Explanation / Tātparya */}
        {q.explanation && (
          <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            padding: '1rem 1.15rem',
            borderRadius: 10,
            marginBottom: '1.25rem',
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
              Tātparya (Philosophical Purport & Insight):
            </p>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Self-Rating / Recall Buttons */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed var(--color-border)',
          borderRadius: 10,
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.65rem', textAlign: 'center', textTransform: 'uppercase' }}>
            How well did you recall this?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                e.stopPropagation()
                markNeedPractice(q.id)
              }}
              style={{
                background: needsPracticeIds.has(q.id) ? 'rgba(240, 101, 101, 0.3)' : 'rgba(240, 101, 101, 0.12)',
                border: '1.5px solid var(--color-error)',
                color: '#FF8585',
                fontWeight: 700,
                fontSize: '0.88rem',
                padding: '0.65rem',
              }}
            >
              🔴 Need Practice
            </button>
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                e.stopPropagation()
                markMastered(q.id)
              }}
              style={{
                background: masteredIds.has(q.id) ? 'rgba(82, 196, 133, 0.3)' : 'rgba(82, 196, 133, 0.12)',
                border: '1.5px solid var(--color-success)',
                color: '#65E4A2',
                fontWeight: 700,
                fontSize: '0.88rem',
                padding: '0.65rem',
              }}
            >
              🟢 Mastered (Got It!)
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSummaryView = () => {
    const total = activeQuestions.length
    const masteredCount = masteredIds.size
    const practiceCount = needsPracticeIds.size

    return (
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🪷</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Flashcard Review Complete!
        </h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Great effort on revising <strong>{quiz?.title || quizTitle || quizId}</strong>.
        </p>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1rem', background: 'rgba(82, 196, 133, 0.1)', border: '1px solid var(--color-success)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 700 }}>MASTERED</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>{masteredCount}</p>
          </div>
          <div className="card" style={{ padding: '1rem', background: 'rgba(240, 101, 101, 0.1)', border: '1px solid var(--color-error)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 700 }}>PRACTICE</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-error)' }}>{practiceCount}</p>
          </div>
          <div className="card" style={{ padding: '1rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 700 }}>TOTAL</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold)' }}>{total}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360, margin: '0 auto' }}>
          {practiceCount > 0 && (
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                setFilterWeakOnly(true)
                setCurrentIndex(0)
                setIsFlipped(false)
                setShowSummary(false)
              }}
            >
              🔄 Re-Study {practiceCount} Weak Card{practiceCount > 1 ? 's' : ''}
            </button>
          )}

          <button
            className="btn btn-secondary w-full"
            onClick={() => {
              setFilterWeakOnly(false)
              setCurrentIndex(0)
              setIsFlipped(false)
              setShowSummary(false)
            }}
          >
            🔁 Review All Cards Again
          </button>

          <button className="btn btn-ghost w-full" onClick={onClose}>
            Done & Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flashcard-modal-overlay" onClick={onClose}>
      <div
        className="flashcard-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flashcard-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🎴</span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {quiz?.title || quizTitle || 'Flashcard Review'}
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', margin: 0 }}>
                Active Recall & Śāstric Study
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeQuestions.length > 0 && !showSummary && (
              <span className="badge badge-gold" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                {currentIndex + 1} / {activeQuestions.length}
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: '0.35rem 0.65rem', fontSize: '1.1rem', lineHeight: 1 }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {activeQuestions.length > 0 && !showSummary && (
          <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.08)', position: 'relative' }}>
            <div
              style={{
                width: `${((currentIndex + 1) / activeQuestions.length) * 100}%`,
                height: '100%',
                background: 'var(--color-gold)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="flashcard-modal-body">
          {loading ? (
            <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="spinner-gold" />
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Loading Flashcards...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
            </div>
          ) : showSummary ? (
            renderSummaryView()
          ) : currentQuestion ? (
            <div className="flashcard-card-scene">
              <div
                className={`flashcard-card ${isFlipped ? 'is-flipped' : ''}`}
                onClick={() => setIsFlipped(prev => !prev)}
              >
                {/* Front Face */}
                <div className="flashcard-face flashcard-face-front">
                  {renderQuestionFront(currentQuestion)}
                  <div className="flashcard-flip-prompt">
                    <span>Tap card or press Space to <strong>Flip & See Answer 🔄</strong></span>
                  </div>
                </div>

                {/* Back Face */}
                <div className="flashcard-face flashcard-face-back">
                  {renderQuestionBack(currentQuestion)}
                  <div className="flashcard-flip-prompt">
                    <span>Tap card to <strong>Flip back to Question 🔄</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky Thumb Navigation Footer */}
        {!loading && !error && !showSummary && activeQuestions.length > 0 && (
          <div className="flashcard-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{ flex: 1, padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}
            >
              ← Prev
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsFlipped(prev => !prev)}
              style={{ flex: 1.5, padding: '0.65rem 0.5rem', fontSize: '0.9rem', fontWeight: 700 }}
            >
              {isFlipped ? 'Show Question 🔄' : 'Reveal Answer 💡'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleNext}
              style={{ flex: 1, padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}
            >
              {currentIndex === activeQuestions.length - 1 ? 'Finish 🏁' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
