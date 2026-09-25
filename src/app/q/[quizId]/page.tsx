'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { scoreQuiz } from '@/lib/scoring'
import { loadProgress, saveProgress, clearProgress } from '@/lib/session-storage'
import { getSeriesRoundUnlockTime } from '@/lib/series-data'
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
  const [finalAnswers, setFinalAnswers] = useState<AnswerMap>({})
  const [initialAnswers, setInitialAnswers] = useState<AnswerMap>({})
  const [initialElapsed, setInitialElapsed] = useState(0)
  const [initialQuestionIndex, setInitialQuestionIndex] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { language, t } = useLanguage()
  const supabase = createClient()
  const submittingRef = useRef(false)

  const initDoneRef = useRef(false)
  const phaseRef = useRef<Phase>('loading')
  phaseRef.current = phase
  const answersRef = useRef<AnswerMap>({})

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

      const res = await fetch(`/api/quiz/${quizId}?lang=${language}`)
      if (!res.ok) { setErrorMsg('Quiz not found.'); setPhase('error'); return }
      const quizData: Quiz = await res.json()
      setQuiz(quizData)
      initDoneRef.current = true

      // If user is logged in, check if they already submitted this quiz
      if (user) {
        try {
          const { data: existingAttempts } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('user_id', user.id)
            .eq('quiz_id', quizId)
            .order('completed_at', { ascending: false })
            .limit(1)

          if (existingAttempts && existingAttempts.length > 0) {
            const attempt = existingAttempts[0]
            setTimeTaken(attempt.time_taken || 0)
            setFinalAnswers(attempt.answers || {})
            answersRef.current = attempt.answers || {}
            const result = scoreQuiz(quizData.questions, attempt.answers || {})
            setScoreResult(result)
            setIsAlreadyCompleted(true)
            setPhase('submitted')
            return
          }
        } catch (err) {
          console.warn('Could not check existing quiz attempts:', err)
        }
      }

      // If this is a series round, check if it is locked
      if (quizId.startsWith('64-day-')) {
        const dayNum = parseInt(quizId.replace('64-day-', ''), 10)
        if (!isNaN(dayNum)) {
          const unlockIso = getSeriesRoundUnlockTime(dayNum)
          if (new Date() < new Date(unlockIso)) {
            // Check if there is an active live PIN session created by teacher/admin
            try {
              const { data: activeSession } = await supabase
                .from('quiz_sessions')
                .select('pin')
                .eq('quiz_id', quizId)
                .eq('is_active', true)
                .limit(1)

              if (activeSession && activeSession.length > 0) {
                router.push(`/session/${activeSession[0].pin}`)
                return
              }
            } catch (err) {
              console.warn('Could not check active live session:', err)
            }

            const formattedTime = new Intl.DateTimeFormat('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'Asia/Kolkata',
            }).format(new Date(unlockIso)) + ' IST'

            setErrorMsg(`Day ${dayNum} is scheduled to release on ${formattedTime}. Please check back at the scheduled time or join the live class when active.`)
            setPhase('error')
            return
          }
        }
      }

      const saved = loadProgress(quizId, effectiveUid)
      if (saved) {
        const currentQuestionIds = new Set(quizData.questions.map(q => String(q.id)))
        const savedAnswerKeys = Object.keys(saved.answers || {})
        const isValidForCurrentQuiz = savedAnswerKeys.length === 0 || savedAnswerKeys.every(id => currentQuestionIds.has(id))

        if (isValidForCurrentQuiz) {
          setInitialAnswers(saved.answers || {})
          answersRef.current = saved.answers || {}
          setInitialElapsed(saved.timeElapsed || 0)
          if (typeof saved.currentIndex === 'number' && saved.currentIndex < quizData.questions.length) {
            setInitialQuestionIndex(saved.currentIndex)
          }
          if (saved.answers && Object.keys(saved.answers).length > 0) {
            setPhase('quiz')
          } else {
            setPhase('intro')
          }
        } else {
          clearProgress(quizId, effectiveUid)
          setPhase('intro')
        }
      } else {
        setPhase('intro')
      }
    }
    init()
  }, [quizId, authLoading, user])

  // Mid-quiz dynamic language reloader
  useEffect(() => {
    if (!quizId || !initDoneRef.current || phase === 'loading' || phase === 'error') return
    const reloadLanguage = async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}?lang=${language}`)
        if (res.ok) {
          const quizData: Quiz = await res.json()
          setQuiz(quizData)
          if (phaseRef.current === 'submitted') {
            setScoreResult(scoreQuiz(quizData.questions, answersRef.current))
          }
        }
      } catch (err) {
        console.warn('Could not reload quiz language:', err)
      }
    }
    reloadLanguage()
  }, [language, quizId])

  const handleSubmit = useCallback(async (answers: AnswerMap, elapsed: number) => {
    if (!quiz || !userId || submittingRef.current) return
    submittingRef.current = true
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
        <p className="text-muted">{t.quizIntro?.loadingQuiz || 'Loading...'}</p>
      </div>
    </div>
  )

  if (phase === 'error') return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card-gold text-center" style={{ padding: '2.5rem', maxWidth: 460 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {errorMsg.includes('scheduled') ? '🔒' : '🙏'}
        </div>
        <h2 style={{ marginBottom: '0.75rem' }}>
          {errorMsg.includes('scheduled') ? (t.quizIntro?.dailyRoundScheduled || 'Daily Round Scheduled') : (t.quizIntro?.quizNotFound || 'Quiz Not Found')}
        </h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{errorMsg}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {errorMsg.includes('scheduled') && (
            <Link href="/series/sacred-teachings-64-principles" className="btn btn-primary" id="series-roadmap-btn">
              {t.quizIntro?.seriesRoadmap || 'Series Roadmap'}
            </Link>
          )}
          <button className={`btn ${errorMsg.includes('scheduled') ? 'btn-ghost' : 'btn-primary'}`} onClick={() => router.push('/')} id="back-home-err-btn">
            {t.quizIntro?.returnHome || 'Return Home'}
          </button>
        </div>
      </div>
    </div>
  )

  if (phase === 'intro' && quiz) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card-gold animate-scaleIn" style={{ padding: '2.5rem', maxWidth: 480, width: '100%' }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <span className="badge badge-gold" style={{ marginBottom: '1rem' }}>{t.quizIntro?.practiceMode || 'Practice Mode'}</span>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{quiz.title}</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>{quiz.description}</p>
        </div>
        <div className="divider-gold" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: t.quizIntro?.questions || 'Questions', value: quiz.questions.length },
            { label: t.quizIntro?.timeLimit || 'Time Limit', value: quiz.timeLimit > 0 ? `${Math.floor(quiz.timeLimit / 60)} ${t.quizIntro?.min || 'min'}` : (t.quizIntro?.noLimit || 'No limit') },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '0.85rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{label}</p>
              <p style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{value}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg w-full" onClick={() => setPhase('quiz')} id="start-direct-quiz-btn">
          {t.quizIntro?.beginInquiry || '✨ Begin the Jijñāsā'}
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
    <div>
      {isAlreadyCompleted && (
        <div className="container" style={{ paddingTop: '1.5rem', maxWidth: 700 }}>
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <span>{t.quizIntro?.alreadyCompletedNotice || '✅ You have already completed this round. Showing your recorded scorecard and answer review.'}</span>
            <Link href="/series/sacred-teachings-64-principles" style={{ color: 'var(--color-gold)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              {t.quizIntro?.seriesRoadmap || 'Series Roadmap'} →
            </Link>
          </div>
        </div>
      )}
      <ScoreCard
        quiz={quiz}
        result={scoreResult}
        timeTaken={timeTaken}
        sessionId={null}
        pin=""
        userAnswers={finalAnswers}
      />
    </div>
  )

  return null
}
