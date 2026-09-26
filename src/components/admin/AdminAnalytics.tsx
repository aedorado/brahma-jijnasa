'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { scoreQuestion } from '@/lib/scoring'
import type { Quiz, QuizMeta, Question } from '@/types/quiz'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function getCorrectAnswerText(q: Question): string {
  if (q.type === 'true-false') return q.correct ? 'True' : 'False'
  if (q.type === 'multiple-select') {
    return q.correctIndices?.map(i => `${LETTERS[i] || i + 1}. ${q.options?.[i] || ''}`).join(', ') || 'N/A'
  }
  if ('correctIndex' in q && typeof q.correctIndex === 'number' && 'options' in q && Array.isArray(q.options)) {
    return `${LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}`
  }
  return 'N/A'
}

function renderAnswerComparison(q: Question, rawAns: any): { studentText: React.ReactNode; correctText: React.ReactNode } {
  if (rawAns === undefined || rawAns === null) {
    return {
      studentText: <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>Unanswered / Skipped</span>,
      correctText: getCorrectAnswerText(q),
    }
  }

  switch (q.type) {
    case 'true-false': {
      const boolVal = rawAns === true || rawAns === 'true'
      return {
        studentText: boolVal ? 'True' : 'False',
        correctText: q.correct ? 'True' : 'False',
      }
    }
    case 'multiple-select': {
      const selIndices = Array.isArray(rawAns) ? rawAns : []
      const selText = selIndices.length > 0
        ? selIndices.map(i => `${LETTERS[i] || i + 1}. ${q.options?.[i] || ''}`).join(', ')
        : 'None selected'
      const correctText = q.correctIndices
        ?.map(i => `${LETTERS[i] || i + 1}. ${q.options?.[i] || ''}`)
        .join(', ') || 'N/A'
      return { studentText: selText, correctText }
    }
    case 'who-am-i': {
      const selIdx = typeof rawAns === 'object' && rawAns !== null ? rawAns.selectedIndex : rawAns
      const clues = typeof rawAns === 'object' && rawAns !== null ? rawAns.cluesRevealed : null
      const studentText = selIdx != null && q.options?.[selIdx]
        ? `${LETTERS[selIdx] || selIdx + 1}. ${q.options[selIdx]} ${clues ? `(${clues} clue${clues > 1 ? 's' : ''} used)` : ''}`
        : 'Unanswered'
      const correctText = q.options?.[q.correctIndex]
        ? `${LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}`
        : 'N/A'
      return { studentText, correctText }
    }
    case 'match-pairs': {
      const pairs = Array.isArray(rawAns) ? rawAns : []
      const studentText = pairs.length > 0
        ? pairs.map(([l, r]: [number, number]) => `${q.left?.[l] || l} ➔ ${q.right?.[r] || r}`).join('; ')
        : 'No pairs matched'
      const correctText = q.correctPairs
        ?.map(([l, r]: [number, number]) => `${q.left?.[l] || l} ➔ ${q.right?.[r] || r}`)
        .join('; ') || 'N/A'
      return { studentText, correctText }
    }
    case 'sequence': {
      const order = Array.isArray(rawAns) ? rawAns : []
      const studentText = order.length > 0
        ? order.map((i: number, step: number) => `${step + 1}. ${q.items?.[i] || ''}`).join(' → ')
        : 'No order selected'
      const correctText = q.correctOrder
        ?.map((i: number, step: number) => `${step + 1}. ${q.items?.[i] || ''}`)
        .join(' → ') || 'N/A'
      return { studentText, correctText }
    }
    default: {
      if (typeof rawAns === 'number' && q.options?.[rawAns]) {
        return {
          studentText: `${LETTERS[rawAns] || rawAns + 1}. ${q.options[rawAns]}`,
          correctText: q.options?.[q.correctIndex] ? `${LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}` : 'N/A',
        }
      }
      return {
        studentText: String(rawAns),
        correctText: q.options?.[q.correctIndex] ? `${LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}` : 'N/A',
      }
    }
  }
}

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
  const [showRawJson, setShowRawJson] = useState(false)

  // Auto-fetch quiz questions if inspecting attempt and not in cache
  useEffect(() => {
    if (inspectAttempt?.quiz_id && !quizDetailsCache[inspectAttempt.quiz_id]) {
      onFetchQuizDetails(inspectAttempt.quiz_id)
    }
  }, [inspectAttempt, quizDetailsCache, onFetchQuizDetails])

  const inspectQuiz = inspectAttempt ? quizDetailsCache[inspectAttempt.quiz_id] : null

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
              maxWidth: 680,
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
                  {inspectAttempt.profiles?.full_name || 'Anonymous'} • {inspectQuiz?.title || inspectAttempt.quiz_id}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recorded Answers</h4>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowRawJson(prev => !prev)}
                style={{ border: '1px solid var(--color-border)', fontSize: '0.75rem' }}
              >
                {showRawJson ? '📋 Show Formatted Review' : '{ } View Raw JSON'}
              </button>
            </div>

            {showRawJson ? (
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
            ) : !inspectQuiz ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                <div className="spinner-gold" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading questions from quiz library...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inspectQuiz.questions.map((q, idx) => {
                  const rawAns = inspectAttempt.answers?.[q.id]
                    ?? inspectAttempt.answers?.[String(q.id)]
                    ?? inspectAttempt.answers?.[idx + 1]
                    ?? inspectAttempt.answers?.[String(idx + 1)]
                    ?? inspectAttempt.answers?.[idx]
                    ?? inspectAttempt.answers?.[String(idx)]

                  const qResult = scoreQuestion(q, rawAns)
                  const isCorrect = qResult.correct
                  const isPartial = qResult.earned > 0 && !isCorrect
                  const comparison = renderAnswerComparison(q, rawAns)

                  const statusColor = isCorrect ? '#4ade80' : isPartial ? 'var(--color-gold)' : '#f87171'
                  const statusBg = isCorrect
                    ? 'rgba(74, 222, 128, 0.08)'
                    : isPartial
                    ? 'rgba(240, 199, 78, 0.08)'
                    : 'rgba(248, 113, 113, 0.08)'
                  const statusBorder = isCorrect
                    ? 'rgba(74, 222, 128, 0.3)'
                    : isPartial
                    ? 'rgba(240, 199, 78, 0.3)'
                    : 'rgba(248, 113, 113, 0.3)'

                  return (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: '1.1rem',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${statusBorder}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      {/* Question Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>Q{idx + 1}</span>
                          <span className="badge badge-ghost" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                            {q.type.replace(/-/g, ' ')}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: 6,
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          {isCorrect ? `✓ ${qResult.earned}/${qResult.max} pts` : isPartial ? `◐ ${qResult.earned}/${qResult.max} pts (Partial)` : `✕ 0/${qResult.max} pts`}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p style={{ fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.45, color: 'var(--color-text)' }}>
                        {q.question}
                      </p>

                      {/* Answers Comparison */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <div
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: 6,
                            background: statusBg,
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: statusColor, display: 'block', marginBottom: '0.15rem' }}>
                            Student's Answer:
                          </span>
                          <span style={{ color: 'var(--color-text)' }}>{comparison.studentText}</span>
                        </div>

                        {!isCorrect && (
                          <div
                            style={{
                              padding: '0.55rem 0.75rem',
                              borderRadius: 6,
                              background: 'rgba(74, 222, 128, 0.05)',
                              border: '1px solid rgba(74, 222, 128, 0.25)',
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#4ade80', display: 'block', marginBottom: '0.15rem' }}>
                              Correct Answer:
                            </span>
                            <span style={{ color: 'var(--color-text)' }}>{comparison.correctText}</span>
                          </div>
                        )}
                      </div>

                      {/* Explanation & Reference */}
                      {q.explanation && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', lineHeight: 1.4 }}>
                          💡 <strong style={{ color: 'var(--color-text-secondary)' }}>Explanation:</strong> {q.explanation}
                          {q.reference && (
                            <span style={{ display: 'block', marginTop: '0.2rem', color: 'var(--color-gold)', fontSize: '0.75rem' }}>
                              📖 Reference: {q.reference}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
