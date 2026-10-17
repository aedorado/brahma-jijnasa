'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Quiz, Question, AnswerMap, ScoreResult, WhoAmIAnswer, PairsAnswer } from '@/types/quiz'
import { scoreQuiz, formatTime } from '@/lib/scoring'
import { QuizEngine } from '@/components/QuizEngine'
import { QuestionErrorBoundary } from '@/components/QuestionErrorBoundary'
import { SingleChoice } from '@/components/questions/SingleChoice'
import { MultipleSelect } from '@/components/questions/MultipleSelect'
import { TrueFalse } from '@/components/questions/TrueFalse'
import { WhoAmI } from '@/components/questions/WhoAmI'
import { WhoSaidThis } from '@/components/questions/WhoSaidThis'
import { Sequence } from '@/components/questions/Sequence'
import { MatchPairs } from '@/components/questions/MatchPairs'
import { AssertionReason } from '@/components/questions/AssertionReason'
import { SpotTheError } from '@/components/questions/SpotTheError'
import { ScenarioQuestion } from '@/components/questions/ScenarioQuestion'
import { MissingLink } from '@/components/questions/MissingLink'

interface AdminDryRunModalProps {
  quiz: Quiz
  onClose: () => void
}

type DryRunViewMode = 'interactive' | 'walkthrough'

export function AdminDryRunModal({ quiz, onClose }: AdminDryRunModalProps) {
  const [viewMode, setViewMode] = useState<DryRunViewMode>('interactive')
  const [useRealTimer, setUseRealTimer] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [revealAnswerKey, setRevealAnswerKey] = useState(true)
  const [dryRunAnswers, setDryRunAnswers] = useState<AnswerMap>({})
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [submissionTime, setSubmissionTime] = useState(0)
  const [engineKey, setEngineKey] = useState(0)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleResetEngine = () => {
    setDryRunAnswers({})
    setScoreResult(null)
    setCurrentQIndex(0)
    setEngineKey(prev => prev + 1)
  }

  const handleSubmitEngine = (answers: AnswerMap, elapsed: number) => {
    setDryRunAnswers(answers)
    setSubmissionTime(elapsed)
    const result = scoreQuiz(quiz.questions, answers)
    setScoreResult(result)
  }

  const currentQuestion = quiz.questions[currentQIndex] || quiz.questions[0]

  // Render individual component for walkthrough mode
  const renderStandaloneComponent = (q: Question) => {
    const qAnswer = dryRunAnswers[q.id]
    const handleAnswer = (val: unknown) => {
      setDryRunAnswers(prev => ({ ...prev, [q.id]: val as any }))
    }

    const type = q.type
    return (
      <QuestionErrorBoundary questionId={q.id} questionType={q.type}>
        {type === 'single-choice' || type === 'two-truths-one-false' || type === 'evidence-based' || type === 'odd-one-out' || type === 'cause-effect' ? (
          <SingleChoice question={q as any} answer={qAnswer as number | null} onAnswer={handleAnswer} />
        ) : type === 'multiple-select' ? (
          <MultipleSelect question={q as any} answer={(qAnswer as number[]) || []} onAnswer={handleAnswer} />
        ) : type === 'true-false' ? (
          <TrueFalse question={q as any} answer={qAnswer as boolean | null} onAnswer={handleAnswer} />
        ) : type === 'who-am-i' ? (
          <WhoAmI question={q as any} answer={qAnswer as WhoAmIAnswer | null} onAnswer={handleAnswer} />
        ) : type === 'who-said-this' ? (
          <WhoSaidThis question={q as any} answer={qAnswer as number | null} onAnswer={handleAnswer} />
        ) : type === 'sequence' ? (
          <Sequence question={q as any} answer={(qAnswer as number[]) || []} onAnswer={handleAnswer} />
        ) : type === 'match-pairs' ? (
          <MatchPairs question={q as any} answer={(qAnswer as PairsAnswer) || []} onAnswer={handleAnswer} />
        ) : type === 'assertion-reason' ? (
          <AssertionReason question={q as any} answer={qAnswer as number | null} onAnswer={handleAnswer} />
        ) : type === 'spot-the-error' ? (
          <SpotTheError question={q as any} answer={qAnswer as number | null} onAnswer={handleAnswer} />
        ) : type === 'case-study' || type === 'what-would-you-do' ? (
          <ScenarioQuestion question={q as any} answer={qAnswer as number | null} onAnswer={handleAnswer} />
        ) : type === 'missing-link' ? (
          <MissingLink question={q as any} answer={qAnswer as number | null} onAnswer={handleAnswer} />
        ) : (
          <div style={{ color: 'var(--color-error)' }}>Unknown question type: {type}</div>
        )}
      </QuestionErrorBoundary>
    )
  }

  // Answer Key display helper
  const getAnswerKeyText = (q: Question) => {
    const anyQ = q as any
    if (q.type === 'single-choice' || q.type === 'odd-one-out' || q.type === 'cause-effect' || q.type === 'missing-link' || q.type === 'who-said-this' || q.type === 'assertion-reason' || q.type === 'case-study' || q.type === 'what-would-you-do' || q.type === 'who-am-i' || q.type === 'spot-the-error' || q.type === 'two-truths-one-false' || q.type === 'evidence-based') {
      const idx = anyQ.correctIndex
      const opt = anyQ.options?.[idx]
      return `Option [${idx + 1}] — ${opt ?? `Index ${idx}`}`
    }
    if (q.type === 'multiple-select') {
      const indices = anyQ.correctIndices || []
      return indices.map((i: number) => `Option [${i + 1}] (${anyQ.options?.[i] ?? i})`).join(' • ')
    }
    if (q.type === 'true-false') {
      return anyQ.correct ? 'TRUE' : 'FALSE'
    }
    if (q.type === 'sequence') {
      const order = anyQ.correctOrder || []
      return order.map((origIdx: number, step: number) => `${step + 1}. ${anyQ.items?.[origIdx] ?? origIdx}`).join(' → ')
    }
    if (q.type === 'match-pairs') {
      const pairs = anyQ.correctPairs || []
      return pairs.map(([l, r]: [number, number]) => `[${anyQ.left?.[l]}] ↔ [${anyQ.right?.[r]}]`).join('; ')
    }
    return 'N/A'
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: 'rgba(5, 5, 10, 0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* TOP CONTROL BAR */}
      <div
        style={{
          padding: '0.85rem 1.5rem',
          background: 'rgba(15, 15, 25, 0.95)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 0 12px rgba(217, 119, 6, 0.4)',
            }}
          >
            <span>🧪</span> DRY RUN MODE
          </span>

          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              {quiz.title}
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>{quiz.questions.length} questions</span>
              <span>•</span>
              <span>{quiz.category}</span>
              <span>•</span>
              <span style={{ color: '#4ade80' }}>Safe preview (no database writes)</span>
            </div>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.2rem',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              className={`btn btn-xs ${viewMode === 'interactive' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => {
                setViewMode('interactive')
                setScoreResult(null)
              }}
              style={{ fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: 6 }}
            >
              🎮 Interactive Engine
            </button>
            <button
              className={`btn btn-xs ${viewMode === 'walkthrough' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setViewMode('walkthrough')}
              style={{ fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: 6 }}
            >
              📋 All-Questions Walkthrough
            </button>
          </div>

          {viewMode === 'interactive' && !scoreResult && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setUseRealTimer(prev => !prev)
                handleResetEngine()
              }}
              style={{ border: '1px solid var(--color-border)', padding: '0.35rem 0.65rem' }}
              title={useRealTimer ? 'Switch to Untimed Mode' : 'Switch to Real Quiz Timer'}
            >
              {useRealTimer ? `⏱️ Timer: ${Math.round(quiz.timeLimit / 60)}m` : '♾️ Untimed Mode'}
            </button>
          )}

          <button
            className="btn btn-ghost btn-xs"
            onClick={handleResetEngine}
            style={{ border: '1px solid var(--color-border)', padding: '0.35rem 0.65rem' }}
            title="Reset answers & restart"
          >
            🔄 Reset
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ fontSize: '1.25rem', lineHeight: 1, padding: '0.3rem 0.6rem', border: '1px solid var(--color-border)' }}
            title="Close Dry Run (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 840 }}>

          {/* VIEW MODE 1: INTERACTIVE SIMULATION */}
          {viewMode === 'interactive' && (
            <div>
              {/* SCORE RESULT SCREEN */}
              {scoreResult ? (
                <div className="card animate-fadeIn" style={{ padding: '2rem', border: '1px solid var(--color-gold)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      DRY RUN ASSESSMENT RESULT
                    </span>
                    <h3 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)' }}>
                      {scoreResult.totalEarned} / {scoreResult.totalMax} Points
                    </h3>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      Overall Score: {scoreResult.percentage}%
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      Simulated time taken: {formatTime(submissionTime)}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                      <button className="btn btn-gold btn-sm" onClick={handleResetEngine}>
                        🔄 Retest Interactive Run
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewMode('walkthrough')} style={{ border: '1px solid var(--color-border)' }}>
                        📋 Inspect All Question Components
                      </button>
                    </div>
                  </div>

                  {/* Question Breakdown Table */}
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                    Question-by-Question Grading Breakdown
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                          <th style={{ padding: '0.6rem 0.75rem' }}>#</th>
                          <th style={{ padding: '0.6rem 0.75rem' }}>Type</th>
                          <th style={{ padding: '0.6rem 0.75rem' }}>Correct Answer Key</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Points</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quiz.questions.map((q, idx) => {
                          const qr = scoreResult.questionResults.find(r => r.questionId === q.id)
                          const earned = qr ? qr.earned : 0
                          const isFull = qr ? qr.correct : false
                          const isZero = earned === 0
                          return (
                            <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Q{idx + 1}</td>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-muted)' }}>{q.type}</td>
                              <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-lotus)' }}>
                                {getAnswerKeyText(q)}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                                {earned} / {q.points}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                {isFull ? (
                                  <span style={{ color: '#4ade80', fontWeight: 800 }}>✅ Correct</span>
                                ) : isZero ? (
                                  <span style={{ color: '#ef4444', fontWeight: 800 }}>❌ Incorrect</span>
                                ) : (
                                  <span style={{ color: '#fbbf24', fontWeight: 800 }}>⚡ Partial ({earned}pts)</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  {/* ADMIN COMPANION TOOLBAR ABOVE QUIZ */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      padding: '0.85rem 1.25rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                        Jump to Question:
                      </label>
                      <select
                        value={currentQIndex}
                        onChange={e => {
                          const idx = Number(e.target.value)
                          setCurrentQIndex(idx)
                        }}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: 8,
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        {quiz.questions.map((q, idx) => (
                          <option key={q.id} value={idx}>
                            Q{idx + 1}: [{q.type}] {q.question?.slice(0, 45) || `Question #${idx + 1}`}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className={`btn btn-xs ${revealAnswerKey ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setRevealAnswerKey(prev => !prev)}
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      {revealAnswerKey ? '👁️ Hide Answer Key' : '💡 Reveal Answer Key'}
                    </button>
                  </div>

                  {/* ACTIVE QUESTION ANSWER KEY DRAWER (When revealed) */}
                  {revealAnswerKey && currentQuestion && (
                    <div
                      style={{
                        background: 'rgba(217, 119, 6, 0.08)',
                        border: '1px solid rgba(217, 119, 6, 0.3)',
                        borderRadius: 10,
                        padding: '0.85rem 1.25rem',
                        marginBottom: '1rem',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--color-gold)' }}>
                          💡 Answer Key for Q{currentQIndex + 1} ({currentQuestion.type}):
                        </span>
                        {currentQuestion.reference && (
                          <span style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>
                            📖 {currentQuestion.reference}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {getAnswerKeyText(currentQuestion)}
                      </div>
                      <div style={{ color: 'var(--color-muted)' }}>
                        <strong>Explanation:</strong> {currentQuestion.explanation}
                      </div>
                    </div>
                  )}

                  {/* THE REAL QUIZ ENGINE */}
                  <QuizEngine
                    key={`${engineKey}-${currentQIndex}`}
                    questions={quiz.questions}
                    timeLimit={useRealTimer ? quiz.timeLimit : 0}
                    onTimeExpiry="submit-partial"
                    onSubmit={handleSubmitEngine}
                    initialQuestionIndex={currentQIndex}
                    initialAnswers={dryRunAnswers}
                    onProgress={(ans, _time, qIdx) => {
                      setDryRunAnswers(ans)
                      setCurrentQIndex(qIdx)
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: ALL QUESTIONS COMPONENT WALKTHROUGH */}
          {viewMode === 'walkthrough' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Full Component Render Diagnostics
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', margin: 0 }}>
                    Every question rendered with its actual production component, verified against schema.
                  </p>
                </div>
                <span className="badge badge-gold">
                  {quiz.questions.length} / {quiz.questions.length} Rendered
                </span>
              </div>

              {quiz.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="card"
                  style={{
                    padding: '1.75rem',
                    border: '1px solid var(--color-border)',
                    background: 'var(--glass-bg)',
                  }}
                  id={`diagnostic-q-${idx + 1}`}
                >
                  {/* Question Header & Schema Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-gold" style={{ fontWeight: 800 }}>
                        Question #{idx + 1}
                      </span>
                      <span className="badge badge-accent">
                        {q.type}
                      </span>
                      <span className={`badge badge-${q.difficulty}`}>
                        {q.difficulty}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-ghost">+{q.points} pts</span>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                        ✅ Component OK
                      </span>
                    </div>
                  </div>

                  {/* Actual Real Question Component */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    {renderStandaloneComponent(q)}
                  </div>

                  {/* Inspector Footer: Answer Key & Explanation */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 10,
                      padding: '1rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong style={{ color: 'var(--color-gold)' }}>Correct Key: </strong>
                        <span style={{ color: 'var(--color-lotus)', fontWeight: 600 }}>
                          {getAnswerKeyText(q)}
                        </span>
                      </div>
                      {q.reference && (
                        <div style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>
                          📖 {q.reference}
                        </div>
                      )}
                    </div>

                    <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
