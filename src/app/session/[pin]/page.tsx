'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { OmSymbol } from '@/components/OmSymbol'
import { scoreQuiz, getPerformanceLabel } from '@/lib/scoring'
import { loadProgress, saveProgress, clearProgress } from '@/lib/session-storage'
import { QuizEngine } from '@/components/QuizEngine'
import { ScoreCard } from '@/components/ScoreCard'
import type { Quiz, AnswerMap, ScoreResult } from '@/types/quiz'

interface Props {
  params: Promise<{ pin: string }>
}

type Phase = 'loading' | 'error' | 'intro' | 'quiz' | 'submitted'

export default function SessionPage({ params }: Props) {
  const [pin, setPin] = useState('')
  const [phase, setPhase] = useState<Phase>('loading')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [timeTaken, setTimeTaken] = useState(0)
  const [initialAnswers, setInitialAnswers] = useState<AnswerMap>({})
  const [initialElapsed, setInitialElapsed] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    params.then(p => setPin(p.pin))
  }, [params])

  useEffect(() => {
    if (!pin || authLoading) return

    const init = async () => {
      // Check user authentication
      if (!user) {
        login(`/session/${pin}`)
        return
      }
      setUserId(user.id)

      // Get active session for this PIN
      const { data: session } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('pin', pin)
        .eq('is_active', true)
        .single()

      if (!session) {
        setErrorMsg('No active quiz found with this PIN. The session may have ended.')
        setPhase('error')
        return
      }

      // Check for existing attempt
      const { data: existing } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_id', session.id)
        .single()

      if (existing) {
        setErrorMsg("You've already completed this quiz session.")
        setPhase('error')
        return
      }

      setSessionId(session.id)

      // Load quiz JSON via API
      const res = await fetch(`/api/quiz/${session.quiz_id}`)
      if (!res.ok) {
        setErrorMsg('Quiz data not found.')
        setPhase('error')
        return
      }
      const quizData: Quiz = await res.json()
      setQuiz(quizData)

      // Restore saved progress if any
      const saved = loadProgress(pin, user.id)
      if (saved) {
        setInitialAnswers(saved.answers || {})
        setInitialElapsed(saved.timeElapsed || 0)
        if (typeof saved.currentIndex === 'number') {
          setInitialQuestionIndex(saved.currentIndex)
        }
        if (saved.answers && Object.keys(saved.answers).length > 0) {
          setPhase('quiz')
        } else {
          setPhase('intro')
        }
      } else {
        setPhase('intro')
      }
    }

    init()
  }, [pin])

  const [initialQuestionIndex, setInitialQuestionIndex] = useState(0)

  const handleStart = () => setPhase('quiz')

  const handleProgress = useCallback(
    (answers: AnswerMap, elapsed: number, currentIndex: number) => {
      if (!userId || !quiz) return
      saveProgress({
        pin,
        quizId: quiz.id,
        userId,
        answers,
        startedAt: Date.now() - elapsed * 1000,
        timeElapsed: elapsed,
        savedAt: Date.now(),
        currentIndex,
      })
    },
    [pin, quiz, userId]
  )

  const [finalAnswers, setFinalAnswers] = useState<AnswerMap>({})

  const handleSubmit = useCallback(async (answers: AnswerMap, elapsed: number) => {
    if (!quiz || !userId || !sessionId) return
    setTimeTaken(elapsed)
    setFinalAnswers(answers)

    const result = scoreQuiz(quiz.questions, answers)
    setScoreResult(result)

    // Save to Supabase
    await supabase.from('quiz_attempts').insert({
      user_id: userId,
      quiz_id: quiz.id,
      session_id: sessionId,
      score: result.totalEarned,
      max_score: result.totalMax,
      time_taken: elapsed,
      answers,
    })

    clearProgress(pin, userId)
    setPhase('submitted')
  }, [quiz, userId, sessionId, pin])

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div style={{ marginBottom: '1rem', animation: 'pulse 1.5s ease infinite' }}>
            <OmSymbol size={52} />
          </div>
          <p className="text-muted">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card-gold text-center" style={{ padding: '2.5rem', maxWidth: 420 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🙏</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Unable to Join</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{errorMsg}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')} id="back-home-btn">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'intro' && quiz) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card-gold animate-scaleIn" style={{ padding: '2.5rem', maxWidth: 480, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>PIN: {pin}</span>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{quiz.title}</h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>{quiz.description}</p>
          </div>

          <div className="divider-gold" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Questions', value: quiz.questions.length },
              { label: 'Time Limit', value: quiz.timeLimit > 0 ? `${Math.floor(quiz.timeLimit / 60)} min` : 'No limit' },
              { label: 'Difficulty', value: quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1) },
              { label: 'Category', value: quiz.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{label}</p>
                <p style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{value}</p>
              </div>
            ))}
          </div>

          {initialElapsed > 0 && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>
              ↩ Your previous progress has been restored
            </p>
          )}

          <button className="btn btn-primary btn-lg w-full" onClick={handleStart} id="start-quiz-btn">
            ✨ Begin the Jijñāsā
          </button>

          <p className="text-muted text-center mt-2" style={{ fontSize: '0.75rem' }}>
            {quiz.onTimeExpiry === 'submit-partial'
              ? 'Quiz will auto-submit when time runs out'
              : 'Answer all questions before submitting'}
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'quiz' && quiz) {
    return (
      <QuizEngine
        questions={quiz.questions}
        timeLimit={quiz.timeLimit}
        onTimeExpiry={quiz.onTimeExpiry}
        onSubmit={handleSubmit}
        initialAnswers={initialAnswers}
        initialElapsed={initialElapsed}
        initialQuestionIndex={initialQuestionIndex}
        onProgress={handleProgress}
      />
    )
  }

  if (phase === 'submitted' && quiz && scoreResult) {
    return (
      <ScoreCard
        quiz={quiz}
        result={scoreResult}
        timeTaken={timeTaken}
        sessionId={sessionId}
        pin={pin}
        userAnswers={finalAnswers}
      />
    )
  }

  return null
}
