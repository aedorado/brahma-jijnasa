'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import type { Question, AnswerMap, Answer, WhoAmIAnswer, PairsAnswer } from '@/types/quiz'
import { formatTime } from '@/lib/scoring'
import { SingleChoice } from './questions/SingleChoice'
import { MultipleSelect } from './questions/MultipleSelect'
import { TrueFalse } from './questions/TrueFalse'
import { WhoAmI } from './questions/WhoAmI'
import { WhoSaidThis } from './questions/WhoSaidThis'
import { Sequence } from './questions/Sequence'
import { MatchPairs } from './questions/MatchPairs'
import { AssertionReason } from './questions/AssertionReason'
import { SpotTheError } from './questions/SpotTheError'
import { ScenarioQuestion } from './questions/ScenarioQuestion'
import { MissingLink } from './questions/MissingLink'

interface QuizEngineProps {
  questions: Question[]
  timeLimit: number           // seconds; 0 = no limit
  onTimeExpiry: 'submit-partial' | 'block-submit'
  onSubmit: (answers: AnswerMap, timeElapsed: number) => void
  initialAnswers?: AnswerMap
  initialElapsed?: number
  initialQuestionIndex?: number
  onProgress?: (answers: AnswerMap, timeElapsed: number, currentQuestionIndex: number) => void
}

const TYPE_LABELS: Record<string, string> = {
  'single-choice': 'Single Choice',
  'multiple-select': 'Multiple Select',
  'true-false': 'True or False',
  'who-am-i': 'Who Am I?',
  'who-said-this': 'Who Said This?',
  'sequence': 'Arrange in Order',
  'cause-effect': 'Cause → Effect',
  'match-pairs': 'Match the Pairs',
  'odd-one-out': 'Odd One Out',
  'assertion-reason': 'Assertion–Reason',
  'case-study': 'Case Study',
  'what-would-you-do': 'What Would You Do?',
  'missing-link': 'Missing Link',
  'spot-the-error': 'Spot the Error',
  'two-truths-one-false': 'Two Truths, One False',
  'evidence-based': 'Evidence-Based',
}

const TYPE_ICONS: Record<string, string> = {
  'single-choice': '🎯',
  'multiple-select': '☑️',
  'true-false': '⚖️',
  'who-am-i': '🎭',
  'who-said-this': '💬',
  'sequence': '📋',
  'cause-effect': '⚡',
  'match-pairs': '🔗',
  'odd-one-out': '🔍',
  'assertion-reason': '🧠',
  'case-study': '📖',
  'what-would-you-do': '🤔',
  'missing-link': '🔗',
  'spot-the-error': '🔎',
  'two-truths-one-false': '🕵️',
  'evidence-based': '📜',
}

export function QuizEngine({
  questions,
  timeLimit,
  onTimeExpiry,
  onSubmit,
  initialAnswers = {},
  initialElapsed = 0,
  initialQuestionIndex = 0,
  onProgress,
}: QuizEngineProps) {
  const { t, language } = useLanguage()
  const [current, setCurrent] = useState(
    initialQuestionIndex >= 0 && initialQuestionIndex < questions.length
      ? initialQuestionIndex
      : 0
  )
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  const [elapsed, setElapsed] = useState(initialElapsed)
  const [showConfirm, setShowConfirm] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittedRef = useRef(false)

  // Auto-save progress whenever answers or active question changes
  useEffect(() => {
    onProgress?.(answers, elapsed, current)
  }, [answers, current, onProgress])

  // Periodic progress sync every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      onProgress?.(answers, elapsed, current)
    }, 5000)
    return () => clearInterval(timer)
  }, [answers, elapsed, current, onProgress])

  const hasTimeLimit = timeLimit > 0
  const remaining = hasTimeLimit ? Math.max(0, timeLimit - elapsed) : null
  const isWarning = remaining !== null && remaining <= 60 && remaining > 0
  const isUrgent = remaining !== null && remaining <= 30 && remaining > 0

  const timeFraction = hasTimeLimit && timeLimit > 0 && remaining !== null
    ? Math.max(0, Math.min(1, remaining / timeLimit))
    : 1
  const avgSecPerQ = hasTimeLimit && questions.length > 0 ? Math.round(timeLimit / questions.length) : null

  // Milestone triggers (50%, 25%, 60s, 30s)
  const [milestoneActive, setMilestoneActive] = useState<string | null>(null)
  const passedMilestonesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!hasTimeLimit || remaining === null || timeLimit <= 0) return
    const fraction = remaining / timeLimit

    let hit: string | null = null
    if (fraction <= 0.5 && fraction > 0.45 && !passedMilestonesRef.current.has('50')) {
      hit = '50'
    } else if (fraction <= 0.25 && fraction > 0.20 && !passedMilestonesRef.current.has('25')) {
      hit = '25'
    } else if (remaining <= 60 && remaining > 56 && !passedMilestonesRef.current.has('60s')) {
      hit = '60s'
    } else if (remaining <= 30 && remaining > 26 && !passedMilestonesRef.current.has('30s')) {
      hit = '30s'
    }

    if (hit) {
      passedMilestonesRef.current.add(hit)
      setMilestoneActive(hit)
      const timer = setTimeout(() => setMilestoneActive(null), 2500)
      return () => clearTimeout(timer)
    }
  }, [remaining, hasTimeLimit, timeLimit])

  const allAnswered = questions.every(q => {
    const a = answers[q.id]
    if (a === null || a === undefined) return false
    if (Array.isArray(a) && (a as unknown[]).length === 0) return false
    return true
  })

  const answeredCount = questions.filter(q => {
    const a = answers[q.id]
    if (a === null || a === undefined) return false
    if (Array.isArray(a) && (a as unknown[]).length === 0) return false
    return true
  }).length

  // Timer (tracks elapsed time and enforces timeLimit if set)
  useEffect(() => {
    if (isSubmitting) return
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        if (hasTimeLimit && next >= timeLimit && onTimeExpiry === 'submit-partial') {
          clearInterval(interval)
          if (!submittedRef.current) {
            submittedRef.current = true
            setIsSubmitting(true)
            setShowConfirm(false)
            onSubmit(answers, next)
          }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [hasTimeLimit, timeLimit, onTimeExpiry, answers, onSubmit, isSubmitting])

  const setAnswer = useCallback((questionId: number, answer: Answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [])

  const setAnswerAndAutoAdvance = useCallback((questionId: number, answer: Answer) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: answer }
      return next
    })
    setTimeout(() => {
      setCurrent(c => {
        if (c < questions.length - 1) {
          setDirection('forward')
          return c + 1
        }
        return c
      })
    }, 380)
  }, [questions.length])

  const navigate = (index: number) => {
    setDirection(index > current ? 'forward' : 'back')
    setCurrent(index)
  }

  const handleSubmit = () => {
    if (allAnswered) {
      if (!submittedRef.current) {
        submittedRef.current = true
        setIsSubmitting(true)
        onSubmit(answers, elapsed)
      }
    } else {
      setShowConfirm(true)
    }
  }

  const confirmSubmit = () => {
    setShowConfirm(false)
    if (!submittedRef.current) {
      submittedRef.current = true
      setIsSubmitting(true)
      onSubmit(answers, elapsed)
    }
  }

  const q = questions[current]
  if (!q) return null

  const isCurrentAnswered =
    answers[q.id] !== null &&
    answers[q.id] !== undefined &&
    !(Array.isArray(answers[q.id]) && (answers[q.id] as unknown[]).length === 0)

  const renderQuestion = () => {
    const type = q.type
    if (type === 'single-choice' || type === 'cause-effect' || type === 'odd-one-out' ||
      type === 'two-truths-one-false' || type === 'evidence-based') {
      return <SingleChoice question={q as any} answer={answers[q.id] as number | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'multiple-select') {
      return <MultipleSelect question={q as any} answer={(answers[q.id] as number[]) || []} onAnswer={a => setAnswer(q.id, a)} />
    }
    if (type === 'true-false') {
      return <TrueFalse question={q as any} answer={answers[q.id] as boolean | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'who-am-i') {
      return <WhoAmI question={q as any} answer={(answers[q.id] as WhoAmIAnswer) || null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'who-said-this') {
      return <WhoSaidThis question={q as any} answer={answers[q.id] as number | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'sequence') {
      return <Sequence question={q as any} answer={(answers[q.id] as number[]) || []} onAnswer={a => setAnswer(q.id, a)} />
    }
    if (type === 'match-pairs') {
      return <MatchPairs question={q as any} answer={(answers[q.id] as PairsAnswer) || []} onAnswer={a => setAnswer(q.id, a)} />
    }
    if (type === 'assertion-reason') {
      return <AssertionReason question={q as any} answer={answers[q.id] as number | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'spot-the-error') {
      return <SpotTheError question={q as any} answer={answers[q.id] as number | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'case-study' || type === 'what-would-you-do') {
      return <ScenarioQuestion question={q as any} answer={answers[q.id] as number | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    if (type === 'missing-link') {
      return <MissingLink question={q as any} answer={answers[q.id] as number | null} onAnswer={a => setAnswerAndAutoAdvance(q.id, a)} />
    }
    return null
  }

  const difficultyLabels: Record<string, string> = {
    easy: t.quizEngine.easy || (language === 'hi' ? 'सरल' : language === 'pt' ? 'FÁCIL' : 'EASY'),
    medium: t.quizEngine.medium || (language === 'hi' ? 'मध्यम' : language === 'pt' ? 'MÉDIO' : 'MEDIUM'),
    hard: t.quizEngine.hard || (language === 'hi' ? 'कठिन' : language === 'pt' ? 'DIFÍCIL' : 'HARD'),
  }

  return (
    <div className="quiz-engine-wrapper">
      {/* Ambient Pervasive Top Time Beam (Always present, 0px intrusive height) */}
      {hasTimeLimit && (
        <div
          className={`quiz-ambient-time-beam-container ${
            isUrgent ? 'critical' : isWarning ? 'warning' : 'normal'
          } ${milestoneActive ? 'milestone-flash' : ''}`}
          aria-hidden="true"
        >
          <div
            className="quiz-ambient-time-beam-fill"
            style={{ width: `${timeFraction * 100}%` }}
          />
        </div>
      )}

      {/* Header bar */}
      <div className="quiz-top-bar">
        <div className="quiz-progress-stat">
          <span className="quiz-answered-count">{answeredCount}</span>
          <span className="quiz-total-count">/ {questions.length}</span>
          <span className="quiz-answered-label">{t.quizEngine.answered || 'answered'}</span>
        </div>

        {/* Prominent, Unobtrusive Clock Badge with Circular Progress & Pacing */}
        <div
          className={`quiz-timer-badge ${
            hasTimeLimit
              ? isUrgent
                ? 'critical'
                : isWarning
                  ? 'warning'
                  : 'normal'
              : 'untimed'
          } ${milestoneActive ? 'milestone-pulse' : ''}`}
          title={
            hasTimeLimit
              ? `${t.quizEngine.timeRemaining || 'Time Left'}${avgSecPerQ ? ` • ~${avgSecPerQ}s / ${language === 'hi' ? 'प्रश्न' : language === 'pt' ? 'questão' : 'question'}` : ''}`
              : 'Time Elapsed'
          }
          role="timer"
          aria-live="polite"
        >
          {hasTimeLimit ? (
            <div className="quiz-timer-ring-wrap" aria-hidden="true">
              <svg className="quiz-timer-svg" viewBox="0 0 28 28">
                <circle
                  className="quiz-timer-ring-bg"
                  cx="14"
                  cy="14"
                  r="11"
                />
                <circle
                  className="quiz-timer-ring-bar"
                  cx="14"
                  cy="14"
                  r="11"
                  style={{
                    strokeDasharray: 69.12,
                    strokeDashoffset: 69.12 * (1 - timeFraction),
                  }}
                />
              </svg>
              <span className="quiz-timer-ring-icon">
                {isUrgent ? '⏳' : '⏱️'}
              </span>
            </div>
          ) : (
            <span className="quiz-timer-icon">⏱️</span>
          )}

          <div className="quiz-timer-content">
            <div className="quiz-timer-header-line">
              <span className="quiz-timer-label">
                {hasTimeLimit ? (t.quizEngine.timeRemaining || 'Time Left') : (t.quizEngine.time || 'Time')}
              </span>
              {avgSecPerQ && (
                <span className="quiz-timer-pace-badge" title="Target pacing per question">
                  ~{avgSecPerQ}s/{language === 'hi' ? 'प्र.' : language === 'pt' ? 'q.' : 'q'}
                </span>
              )}
            </div>
            <span className="quiz-timer-digits">
              {hasTimeLimit && remaining !== null ? formatTime(remaining) : formatTime(elapsed)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track mb-3">
        <div className="progress-bar-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
      </div>

      {/* Question dots */}
      <div className="q-dots mb-4">
        {questions.map((qq, i) => {
          const answered = answers[qq.id] !== null && answers[qq.id] !== undefined &&
            !(Array.isArray(answers[qq.id]) && (answers[qq.id] as unknown[]).length === 0)
          return (
            <button
              key={qq.id}
              className={`q-dot ${i === current ? 'current' : answered ? 'answered' : ''}`}
              onClick={() => navigate(i)}
              title={`${t.quizEngine.questionDotTitle || (language === 'hi' ? 'प्रश्न' : language === 'pt' ? 'Questão' : 'Question')} ${i + 1}`}
              id={`q-dot-${i + 1}`}
              aria-label={`Go to question ${i + 1}`}
            />
          )
        })}
      </div>

      {/* Question card */}
      <div
        key={q.id}
        className="card quiz-card animate-slideIn"
      >
        {/* Question header */}
        <div className="flex items-center justify-between mb-3">
          <span className="badge badge-accent">
            {TYPE_ICONS[q.type]} {(t.quizTypes as any)[q.type] || TYPE_LABELS[q.type]}
          </span>
          <div className="flex items-center gap-1">
            <span className={`badge badge-${q.difficulty}`}>
              {difficultyLabels[q.difficulty] || q.difficulty.toUpperCase()}
            </span>
            <span className="badge badge-gold">+{q.points} {t.series?.pts || 'pts'}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          {current + 1} / {questions.length}
        </p>

        {/* Render question type */}
        {renderQuestion()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          className="btn btn-ghost"
          onClick={() => navigate(current - 1)}
          disabled={current === 0}
          id="prev-question-btn"
        >
          {t.quizEngine.previous}
        </button>

        {current < questions.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => navigate(current + 1)}
            id="next-question-btn"
          >
            {t.quizEngine.next}
          </button>
        ) : (
          <button
            className="btn btn-gold"
            onClick={handleSubmit}
            disabled={onTimeExpiry === 'block-submit' && !allAnswered}
            id="submit-quiz-btn"
            title={onTimeExpiry === 'block-submit' && !allAnswered ? (t.quizEngine.answerAllToSubmitTitle || 'Answer all questions to submit') : ''}
          >
            {t.quizEngine.submitQuiz}
          </button>
        )}
      </div>

      {onTimeExpiry === 'block-submit' && !allAnswered && current === questions.length - 1 && (
        <p className="text-center text-muted mt-2" style={{ fontSize: '0.8rem' }}>
          {(t.quizEngine.remainingBlockSubmit || 'Answer all {count} remaining question(s) to submit')
            .replace('{count}', String(questions.length - answeredCount))}
        </p>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10,8,20,0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: '1rem',
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="card animate-scaleIn"
            style={{ padding: '2rem', maxWidth: 420, width: '100%', border: '1px solid var(--color-border-gold)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '0.5rem', textAlign: 'center', fontWeight: 700 }}>
              {t.quizEngine.confirmTitle}
            </h3>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {answeredCount < questions.length
                ? (t.quizEngine.unansweredWarning || 'You have {count} unanswered question(s). They will score 0.')
                    .replace('{count}', String(questions.length - answeredCount))
                : t.quizEngine.confirmSubtitle
              }
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost w-full" onClick={() => setShowConfirm(false)} id="cancel-submit-btn" disabled={isSubmitting}>
                {t.quizEngine.confirmCancel}
              </button>
              <button className="btn btn-primary w-full" onClick={confirmSubmit} id="confirm-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (t.quizEngine.submittingBtn || 'Submitting...') : t.quizEngine.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen submitting loader */}
      {isSubmitting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,8,20,0.92)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div className="text-center animate-fadeIn" style={{ padding: '2rem' }}>
            <div className="spinner-gold" style={{ width: 44, height: 44, margin: '0 auto 1.25rem' }} />
            <h3 style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              {t.quizEngine.submittingTitle || 'Submitting Your Answers...'}
            </h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              {t.quizEngine.submittingSubtitle || 'Calculating your score and recording progress...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
