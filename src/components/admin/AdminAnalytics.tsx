'use client'

import { useState, useMemo } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { scoreQuestion } from '@/lib/scoring'
import type { Quiz, QuizMeta, Question } from '@/types/quiz'

export interface AttemptRecord {
  id: string
  user_id: string
  quiz_id: string
  session_id: string | null
  score: number
  max_score: number
  time_taken: number | null
  answers: Record<string | number, any>
  completed_at: string
  profiles?: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
}

interface AdminAnalyticsProps {
  allAttempts: AttemptRecord[]
  quizzes: QuizMeta[]
  quizDetailsCache: Record<string, Quiz>
  onFetchQuizDetails: (quizId: string) => Promise<void>
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 !== 0) return sorted[mid]
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
}

export function AdminAnalytics({
  allAttempts,
  quizzes,
  quizDetailsCache,
  onFetchQuizDetails,
}: AdminAnalyticsProps) {
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all')
  const [searchStudent, setSearchStudent] = useState<string>('')
  const [inspectAttempt, setInspectAttempt] = useState<AttemptRecord | null>(null)

  // Filtered attempts
  const filteredAttempts = useMemo(() => {
    return allAttempts.filter(att => {
      const matchQuiz = selectedQuizFilter === 'all' || att.quiz_id === selectedQuizFilter
      const studentName = (att.profiles?.full_name || '').toLowerCase()
      const studentEmail = (att.profiles?.email || '').toLowerCase()
      const q = searchStudent.toLowerCase().trim()
      const matchSearch = !q || studentName.includes(q) || studentEmail.includes(q) || att.quiz_id.toLowerCase().includes(q)
      return matchQuiz && matchSearch
    })
  }, [allAttempts, selectedQuizFilter, searchStudent])

  // Aggregate Metrics
  const analyticsMetrics = useMemo(() => {
    if (filteredAttempts.length === 0) {
      return {
        count: 0,
        meanScore: 0,
        medianScore: 0,
        meanPercentage: 0,
        medianPercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        avgDurationSecs: 0,
      }
    }

    const scores = filteredAttempts.map(a => a.score)
    const percentages = filteredAttempts.map(a => Math.round((a.score / (a.max_score || 1)) * 100))
    const durations = filteredAttempts.map(a => a.time_taken || 0).filter(t => t > 0)

    const sumScore = scores.reduce((acc, s) => acc + s, 0)
    const sumPct = percentages.reduce((acc, p) => acc + p, 0)
    const sumDur = durations.reduce((acc, d) => acc + d, 0)

    return {
      count: filteredAttempts.length,
      meanScore: Math.round((sumScore / filteredAttempts.length) * 10) / 10,
      medianScore: calculateMedian(scores),
      meanPercentage: Math.round(sumPct / filteredAttempts.length),
      medianPercentage: calculateMedian(percentages),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      avgDurationSecs: durations.length > 0 ? Math.round(sumDur / durations.length) : 0,
    }
  }, [filteredAttempts])

  // Question Diagnostics for selected quiz
  const questionDiagnostics = useMemo(() => {
    const targetQuizId = selectedQuizFilter !== 'all'
      ? selectedQuizFilter
      : (filteredAttempts[0]?.quiz_id || allAttempts[0]?.quiz_id)

    if (!targetQuizId || !quizDetailsCache[targetQuizId]) return null

    const quizObj = quizDetailsCache[targetQuizId]
    const quizAttempts = allAttempts.filter(a => a.quiz_id === targetQuizId)
    if (quizAttempts.length === 0) return { quiz: quizObj, questionsData: [], attemptsCount: 0 }

    const questionsData = quizObj.questions.map((q: Question) => {
      let correctCount = 0
      let partialCount = 0
      let wrongCount = 0

      quizAttempts.forEach(att => {
        const userAns = att.answers?.[q.id]
        if (userAns === undefined || userAns === null) {
          wrongCount++
          return
        }
        const res = scoreQuestion(q, userAns)
        if (res.correct) {
          correctCount++
        } else if (res.earned > 0) {
          partialCount++
        } else {
          wrongCount++
        }
      })

      const total = quizAttempts.length
      const accuracyPct = Math.round((correctCount / total) * 100)

      return {
        question: q,
        correctCount,
        partialCount,
        wrongCount,
        total,
        accuracyPct,
      }
    })

    const sortedByAccuracy = [...questionsData].sort((a, b) => a.accuracyPct - b.accuracyPct)
    const toughestId = sortedByAccuracy[0]?.question.id
    const easiestId = sortedByAccuracy[sortedByAccuracy.length - 1]?.question.id

    return {
      quiz: quizObj,
      questionsData,
      attemptsCount: quizAttempts.length,
      toughestId,
      easiestId,
    }
  }, [selectedQuizFilter, filteredAttempts, allAttempts, quizDetailsCache])

  // CSV Export
  const handleExportCSV = () => {
    if (filteredAttempts.length === 0) return

    const headers = ['Devotee Name', 'Email', 'Quiz ID', 'Score', 'Max Score', 'Accuracy %', 'Time Taken (s)', 'Date']
    const rows = filteredAttempts.map(a => [
      `"${a.profiles?.full_name || 'Anonymous'}"`,
      `"${a.profiles?.email || ''}"`,
      `"${a.quiz_id}"`,
      a.score,
      a.max_score,
      Math.round((a.score / (a.max_score || 1)) * 100),
      a.time_taken || 0,
      `"${new Date(a.completed_at).toLocaleDateString()}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `brahma_jijnasa_grades_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fadeIn">
      {/* Filters and Controls */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Student Analytics & Performance</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Deep question-level diagnostics and grading across all quizzes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedQuizFilter}
              onChange={e => {
                const val = e.target.value
                setSelectedQuizFilter(val)
                if (val !== 'all') onFetchQuizDetails(val)
              }}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
              }}
            >
              <option value="all">✨ All Quizzes ({allAttempts.length} submissions)</option>
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search devotee..."
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
                width: 180,
              }}
            />

            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportCSV}
              style={{ border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>📥</span> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Submissions</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gold)' }}>
            {analyticsMetrics.count}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Median Accuracy</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>
            {analyticsMetrics.medianPercentage}%
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Average Score</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {analyticsMetrics.meanScore} pts
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Highest / Lowest</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {analyticsMetrics.highestScore} / {analyticsMetrics.lowestScore}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Avg Time</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-muted)' }}>
            {analyticsMetrics.avgDurationSecs}s
          </p>
        </div>
      </div>

      {/* Item Difficulty Diagnostics */}
      {questionDiagnostics && questionDiagnostics.questionsData.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Question Difficulty Drop-Off</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Real-time accuracy breakdown for {questionDiagnostics.quiz.title} ({questionDiagnostics.attemptsCount} attempts)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questionDiagnostics.questionsData.map((item, idx) => {
              const isToughest = item.question.id === questionDiagnostics.toughestId
              const isEasiest = item.question.id === questionDiagnostics.easiestId

              return (
                <div
                  key={item.question.id || idx}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 8,
                    background: isToughest ? 'rgba(239, 68, 68, 0.08)' : isEasiest ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: isToughest ? '1px solid rgba(239, 68, 68, 0.3)' : isEasiest ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Q{idx + 1}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{item.question.question}</span>
                      {isToughest && <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>⚠️ Toughest</span>}
                      {isEasiest && <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>⭐ Easiest</span>}
                    </div>

                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: item.accuracyPct >= 70 ? '#4ade80' : item.accuracyPct >= 40 ? 'var(--color-gold)' : '#f87171' }}>
                      {item.accuracyPct}%
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${item.accuracyPct}%`,
                        height: '100%',
                        background: item.accuracyPct >= 70 ? '#4ade80' : item.accuracyPct >= 40 ? 'var(--color-gold)' : '#f87171',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Devotee Submission Log</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Devotee</th>
                <th style={{ padding: '0.75rem 1rem' }}>Quiz ID</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Time</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Accuracy</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Score</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.map(att => {
                const pct = Math.round((att.score / (att.max_score || 1)) * 100)
                return (
                  <tr key={att.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <UserAvatar name={att.profiles?.full_name} url={att.profiles?.avatar_url} size={28} />
                        <div>
                          <p style={{ fontWeight: 600 }}>{att.profiles?.full_name || 'Anonymous'}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{att.profiles?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-muted)', fontSize: '0.82rem' }}>
                      {att.quiz_id}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      {att.time_taken ? `${att.time_taken}s` : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                      {pct}%
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-gold)' }}>
                      {att.score} / {att.max_score}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setInspectAttempt(att)}
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT ATTEMPT DRAWER */}
      {inspectAttempt && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setInspectAttempt(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 600,
              height: '100%',
              background: 'var(--color-bg)',
              borderLeft: '1px solid var(--color-border)',
              padding: '2rem',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Submission Details</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  {inspectAttempt.profiles?.full_name || 'Anonymous'} • {inspectAttempt.quiz_id}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setInspectAttempt(null)}>
                ✕
              </button>
            </div>

            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Score</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold)' }}>
                    {inspectAttempt.score} / {inspectAttempt.max_score}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Accuracy</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80' }}>
                    {Math.round((inspectAttempt.score / (inspectAttempt.max_score || 1)) * 100)}%
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Duration</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)' }}>
                    {inspectAttempt.time_taken || 0}s
                  </p>
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Recorded Answers</h4>
            <pre
              style={{
                fontSize: '0.8rem',
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                overflowX: 'auto',
                color: 'var(--color-text)',
              }}
            >
              {JSON.stringify(inspectAttempt.answers, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
