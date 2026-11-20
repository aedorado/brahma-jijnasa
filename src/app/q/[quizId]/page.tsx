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
  const [attemptSessionId, setAttemptSessionId] = useState<string | null>(null)
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [isPracticeRun, setIsPracticeRun] = useState(false)
  const [officialScore, setOfficialScore] = useState<{ score: number; maxScore: number } | null>(null)
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

      // Check if user came specifically for practice mode via ?mode=practice
      const isPracticeQuery = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'practice'

      // If user is logged in, check if they already submitted this quiz
      let prevAttempt: any = null
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
            prevAttempt = existingAttempts[0]
            setOfficialScore({ score: Number(prevAttempt.score), maxScore: Number(prevAttempt.max_score) })
          }
        } catch (err) {
          console.warn('Could not check existing quiz attempts:', err)
        }
      }

      // If explicit practice mode is requested:
      if (isPracticeQuery) {
        setIsPracticeMode(true)
        setPhase('intro')
        return
      }

      // If user already completed the quiz and did NOT request practice, show recorded scorecard:
      if (prevAttempt) {
        setAttemptSessionId(prevAttempt.session_id || null)
        setTimeTaken(prevAttempt.time_taken || 0)
        setFinalAnswers(prevAttempt.answers || {})
        answersRef.current = prevAttempt.answers || {}
        const result = scoreQuiz(quizData.questions, prevAttempt.answers || {})
        setScoreResult(result)
        setIsAlreadyCompleted(true)
        setPhase('submitted')
        return
      }

      // Series quizzes logic
      if (quizId.startsWith('64-day-')) {
        let dayNum: number | null = null
        if (quizId === '64-day-d3') dayNum = -2
        else if (quizId === '64-day-d2') dayNum = -1
        else if (quizId === '64-day-d1') dayNum = 0
        else {
          const parsed = parseInt(quizId.replace('64-day-', ''), 10)
          if (!isNaN(parsed)) dayNum = parsed
        }

        let isManualUnlocked = false
        let effectiveUnlockIso = dayNum !== null ? getSeriesRoundUnlockTime(dayNum) : new Date().toISOString()

        try {
          const { data: dbRound } = await supabase
            .from('quiz_series_rounds')
            .select('unlock_at, is_unlocked')
            .eq('quiz_id', quizId)
            .maybeSingle()

          if (dbRound) {
            if (dbRound.is_unlocked) isManualUnlocked = true
            if (dbRound.unlock_at) effectiveUnlockIso = dbRound.unlock_at
          }
        } catch (err) {
          console.warn('Could not check db round unlock status:', err)
        }

        const isTimeArrived = isManualUnlocked || new Date() >= new Date(effectiveUnlockIso)

        // Check if there is an active PIN session
        let activePin: string | null = null
        try {
          const { data: activeSession } = await supabase
            .from('quiz_sessions')
            .select('pin')
            .eq('quiz_id', quizId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)

          if (activeSession && activeSession.length > 0) {
            activePin = activeSession[0].pin
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
        }).format(new Date(effectiveUnlockIso)) + ' IST'

        const label = dayNum === -2 ? 'Preparatory Quiz 1' : dayNum === -1 ? 'Preparatory Quiz 2' : dayNum === 0 ? 'Preparatory Quiz 3' : `Day ${dayNum}`

        // If an active PIN exists AND the scheduled release time has arrived, redirect to live session
        if (activePin && isTimeArrived) {
          router.push(`/session/${activePin}`)
          return
        }

        // If scheduled time has arrived but no live classroom PIN exists: allow taking in self-study / practice mode!
        if (isTimeArrived) {
          setIsPracticeMode(true)
          setPhase('intro')
          return
        }

        // If release time has not arrived yet:
        setErrorMsg(`${label} is scheduled to go live on ${formattedTime}. Please return at the scheduled time.`)
        setPhase('error')
        return
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

  const handleStartPractice = () => {
    setIsPracticeMode(true)
    setIsPracticeRun(false)
    setInitialAnswers({})
    setInitialElapsed(0)
    setInitialQuestionIndex(0)
    setFinalAnswers({})
    setScoreResult(null)
    setTimeTaken(0)
    submittingRef.current = false
    setPhase('quiz')
  }

  const handleSubmit = useCallback(async (answers: AnswerMap, elapsed: number) => {
    if (!quiz || !userId || submittingRef.current) return
    submittingRef.current = true
    setTimeTaken(elapsed)
    setFinalAnswers(answers)
    const result = scoreQuiz(quiz.questions, answers)
    setScoreResult(result)

    if (isPracticeMode) {
      // In practice mode, do NOT write to database — keep leaderboards 100% untouched!
      setIsPracticeRun(true)
    } else if (!userId.startsWith('guest_')) {
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
    submittingRef.current = false
    setPhase('submitted')
  }, [quiz, userId, quizId, isPracticeMode])

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
          <span className="badge badge-gold" style={{ marginBottom: '1rem' }}>
            {isPracticeMode ? (t.scoreCard?.practiceScoreLabel || 'Self-Study & Revision Mode') : (t.quizIntro?.practiceMode || 'Practice Mode')}
          </span>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{quiz.title}</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>{quiz.description}</p>
        </div>
        {isPracticeMode && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(240, 199, 78, 0.1)',
              border: '1px solid rgba(240, 199, 78, 0.3)',
              marginBottom: '1.5rem',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: 'var(--color-gold)',
              fontWeight: 600,
            }}
          >
            {t.quizIntro?.practiceModeBanner || '🌟 Self-Study & Revision Mode: Your official leaderboard score is safely locked and preserved.'}
          </div>
        )}
        <div className="divider-gold" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: t.quizIntro?.questions || 'Questions', value: quiz.questions.length },
            { label: t.quizIntro?.timeLimit || 'Time Limit', value: quiz.timeLimit > 0 ? `${Math.floor(quiz.timeLimit / 60)} ${t.quizIntro?.min || 'min'}` : (t.quizIntro?.noLimit || 'No limit') },
            { label: t.quizIntro?.difficulty || 'Difficulty', value: (t.quizEngine as any)?.[quiz.difficulty] || quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1) },
            { label: t.quizIntro?.category || 'Category', value: (t.categories as any)?.[quiz.category] || quiz.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
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
    <div>
      {isPracticeMode && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(240, 199, 78, 0.15), rgba(240, 199, 78, 0.05))',
          borderBottom: '1px solid rgba(240, 199, 78, 0.35)',
          padding: '0.65rem 1rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--color-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <span>🔄</span>
          <span>
            {t.quizIntro?.practiceModeBanner || '🌟 Self-Study & Revision Mode: Your official leaderboard score is safely locked and preserved.'}
          </span>
        </div>
      )}
      <QuizEngine
        questions={quiz.questions}
        timeLimit={quiz.timeLimit}
        onTimeExpiry={quiz.onTimeExpiry}
        onSubmit={handleSubmit}
        initialAnswers={initialAnswers}
        initialElapsed={initialElapsed}
        initialQuestionIndex={initialQuestionIndex}
        onProgress={handleProgress}
        quizTitle={quiz.title}
      />
    </div>
  )

  if (phase === 'submitted' && quiz && scoreResult) return (
    <div>
      {isAlreadyCompleted && !isPracticeRun && (
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
        sessionId={attemptSessionId}
        pin=""
        userAnswers={finalAnswers}
        onPracticeAgain={handleStartPractice}
        isPracticeRun={isPracticeRun}
        officialScore={officialScore}
      />
    </div>
  )

  return null
}
