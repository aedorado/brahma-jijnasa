'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { scoreQuiz } from '@/lib/scoring'
import { loadProgress, saveProgress, clearProgress } from '@/lib/session-storage'
import { QuizEngine } from '@/components/QuizEngine'
import { ScoreCard } from '@/components/ScoreCard'
import type { Quiz, AnswerMap, ScoreResult } from '@/types/quiz'

interface Props {
  params: Promise<{ quizId: string }>
}

type Phase = 'loading' | 'error' | 'intro' | 'quiz' | 'submitted'

export default function DirectQuizPage({ params }: Props) {
  const [quizId, setQuizId] = useState('')
  const [phase, setPhase] = useState<Phase>('loading')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [timeTaken, setTimeTaken] = useState(0)
  const [initialAnswers, setInitialAnswers] = useState<AnswerMap>({})
  const [initialElapsed, setInitialElapsed] = useState(0)
  const [initialQuestionIndex, setInitialQuestionIndex] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    params.then(p => setQuizId(p.quizId))
  }, [params])

  useEffect(() => {
    if (!quizId || authLoading) return
    const init = async () => {
      // Check if user is logged in (optional for direct links)
      let effectiveUid = ''
      if (user) {
        setUserId(user.id)
        effectiveUid = user.id
      } else {
        // Generate or load a guest student ID
        let guestId = localStorage.getItem('bj_guest_id')
        if (!guestId) {
          guestId = 'guest_' + Math.random().toString(36).slice(2, 9)
          localStorage.setItem('bj_guest_id', guestId)
        }
        setUserId(guestId)
        effectiveUid = guestId
      }

      const res = await fetch(`/api/quiz/${quizId}`)
      if (!res.ok) { setErrorMsg('Quiz not found.'); setPhase('error'); return }
      const quizData: Quiz = await res.json()
      setQuiz(quizData)

      const saved = loadProgress(quizId, effectiveUid)
      if (saved) {
        setInitialAnswers(saved.answers || {})
        setInitialElapsed(saved.timeElapsed || 0)
        if (typeof saved.currentIndex === 'number') {
          setInitialQuestionIndex(saved.currentIndex)
        }
        // If user already started or answered questions, resume immediately
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
  }, [quizId, authLoading, user])

  const [finalAnswers, setFinalAnswers] = useState<AnswerMap>({})

  const handleSubmit = useCallback(async (answers: AnswerMap, elapsed: number) => {
    if (!quiz || !userId) return
    setTimeTaken(elapsed)
    setFinalAnswers(answers)
    const result = scoreQuiz(quiz.questions, answers)
    setScoreResult(result)

    if (!userId.startsWith('guest_')) {
      try {
        await supabase.from('quiz_attempts').insert({
          user_id: userId,
          quiz_id: quiz.id,
          session_id: null,  // direct link — no session
          score: result.totalEarned,
          max_score: result.totalMax,
          time_taken: elapsed,
          answers,
        })
      } catch (e) {
        console.warn('Could not save attempt to database:', e)
      }
    }

    clearProgress(quizId, userId)
    setPhase('submitted')
  }, [quiz, userId, quizId])

  const handleProgress = useCallback(
    (answers: AnswerMap, elapsed: number, currentIndex: number) => {
      if (!quiz || !userId) return
      saveProgress({
        pin: quizId,
        quizId: quiz.id,
        userId,
        answers,
        startedAt: Date.now() - elapsed * 1000,
        timeElapsed: elapsed,
        savedAt: Date.now(),
        currentIndex,
      })
    },
    [quiz, userId, quizId]
  )

  if (phase === 'loading') return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center">
        <div className="spinner-gold" />
        <p className="text-muted">Loading...</p>
      </div>
    </div>
  )

  if (phase === 'error') return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card-gold text-center" style={{ padding: '2.5rem', maxWidth: 420 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🙏</div>
        <h2 style={{ marginBottom: '0.75rem' }}>Quiz Not Found</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => router.push('/')} id="back-home-err-btn">Return Home</button>
      </div>
    </div>
  )

  if (phase === 'intro' && quiz) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card-gold animate-scaleIn" style={{ padding: '2.5rem', maxWidth: 480, width: '100%' }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <span className="badge badge-gold" style={{ marginBottom: '1rem' }}>Practice Mode</span>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{quiz.title}</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>{quiz.description}</p>
        </div>
        <div className="divider-gold" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Questions', value: quiz.questions.length },
            { label: 'Time Limit', value: quiz.timeLimit > 0 ? `${Math.floor(quiz.timeLimit / 60)} min` : 'No limit' },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '0.85rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{label}</p>
              <p style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{value}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg w-full" onClick={() => setPhase('quiz')} id="start-direct-quiz-btn">
          ✨ Begin the Jijñāsā
        </button>
      </div>
    </div>
  )

  if (phase === 'quiz' && quiz) return (
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

  if (phase === 'submitted' && quiz && scoreResult) return (
    <ScoreCard
      quiz={quiz}
      result={scoreResult}
      timeTaken={timeTaken}
      sessionId={null}
      pin=""
      userAnswers={finalAnswers}
    />
  )

  return null
}
