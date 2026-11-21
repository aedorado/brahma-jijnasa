'use client'

import type { Question, Category } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'
import { FormattedText } from '@/components/FormattedText'

interface QuizPreviewListProps {
  questions: Question[]
  title: string
  description: string
  category: string
  timeLimitMins: number
  slug: string
  authorName: string
  cleanLog: string[]
}

export function QuizPreviewList({
  questions,
  title,
  description,
  category,
  timeLimitMins,
  slug,
  authorName,
  cleanLog,
}: QuizPreviewListProps) {
  if (questions.length === 0) return null

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span className="badge badge-gold">
              {CATEGORY_ICONS[category as Category] || '📜'} {CATEGORY_LABELS[category as Category] || category}
            </span>
            <span className="badge badge-success">✅ Validated ({questions.length} Questions)</span>
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{title || 'Untitled Quiz'}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{description || 'No description provided'}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
            ⏱️ {timeLimitMins} mins
          </span>
          <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
            🔑 ID: {slug || 'unassigned'}
          </span>
          <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
            👤 {authorName || 'Brahmā-Jijñāsā'}
          </span>
        </div>
      </div>

      {/* Auto-clean logs if any */}
      {cleanLog.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(74, 222, 128, 0.08)', borderRadius: 8, border: '1px solid rgba(74, 222, 128, 0.2)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--color-success)' }}>
          <strong>Auto-adjustments applied:</strong>
          <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
            {cleanLog.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Question List */}
      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
        Question Preview ({questions.length})
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {questions.map((q: Question, idx: number) => (
          <div
            key={idx}
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 10,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-gold)', fontSize: '0.85rem' }}>#{idx + 1}</span>
                <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.type}</span>
                <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.difficulty}</span>
                <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.points || 1} pts</span>
              </div>
              {q.reference && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                  📖 {q.reference}
                </span>
              )}
            </div>

            <FormattedText
              text={q.question}
              style={{ fontWeight: 500, fontSize: '0.92rem', marginBottom: '0.5rem', lineHeight: 1.45, color: 'var(--color-text)' }}
            />

            {'options' in q && Array.isArray((q as { options?: string[] }).options) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {((q as { options: string[] }).options).map((opt: string, optIdx: number) => {
                  const singleMatch = 'correctIndex' in q && (q as { correctIndex?: number }).correctIndex === optIdx
                  const multiMatch = 'correctIndices' in q && Array.isArray((q as { correctIndices?: number[] }).correctIndices) && (q as { correctIndices: number[] }).correctIndices.includes(optIdx)
                  const isCorrect = singleMatch || multiMatch
                  return (
                    <div
                      key={optIdx}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        background: isCorrect ? 'rgba(74, 222, 128, 0.15)' : 'var(--glass-bg)',
                        border: isCorrect ? '1.5px solid rgba(74, 222, 128, 0.5)' : '1px solid var(--color-border)',
                        color: isCorrect ? 'var(--color-success)' : 'var(--color-text)',
                        fontWeight: isCorrect ? 700 : 400,
                      }}
                    >
                      {isCorrect ? '✓ ' : '• '} {opt}
                    </div>
                  )
                })}
              </div>
            )}

            {/* True / False Question Options */}
            {q.type === 'true-false' && 'correct' in q && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {[true, false].map((val) => {
                  const isCorrect = (q as { correct: boolean }).correct === val
                  const label = val ? 'True / Verdadeiro' : 'False / Falso'
                  return (
                    <div
                      key={String(val)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        background: isCorrect ? 'rgba(74, 222, 128, 0.15)' : 'var(--glass-bg)',
                        border: isCorrect ? '1.5px solid rgba(74, 222, 128, 0.5)' : '1px solid var(--color-border)',
                        color: isCorrect ? 'var(--color-success)' : 'var(--color-text)',
                        fontWeight: isCorrect ? 700 : 400,
                      }}
                    >
                      {isCorrect ? '✓ ' : '• '} {label}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sequence Scrambled Items & Correct Order */}
            {q.type === 'sequence' && 'items' in q && Array.isArray((q as any).items) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600 }}>Correct Order:</span>
                {(((q as any).correctOrder || (q as any).items.map((_: any, i: number) => i)) as number[]).map((itemIdx: number, step: number) => (
                  <div
                    key={step}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      background: 'rgba(74, 222, 128, 0.15)',
                      border: '1.5px solid rgba(74, 222, 128, 0.5)',
                      color: 'var(--color-success)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{step + 1}.</span>
                    <span>{(q as any).items[itemIdx]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Match Pairs Correct Pairings */}
            {q.type === 'match-pairs' && 'left' in q && 'right' in q && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {(((q as any).correctPairs || []) as [number, number][]).map(([l, r]: [number, number], pIdx: number) => (
                  <div
                    key={pIdx}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      background: 'rgba(74, 222, 128, 0.15)',
                      border: '1.5px solid rgba(74, 222, 128, 0.5)',
                      color: 'var(--color-success)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span>✓</span>
                    <span>{(q as any).left[l]} ↔ {(q as any).right[r]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Crossword Words Preview */}
            {q.type === 'crossword' && Array.isArray((q as any).words) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {((q as any).words as any[]).map((w: any, wIdx: number) => (
                  <span
                    key={wIdx}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      background: 'rgba(212, 160, 23, 0.15)',
                      border: '1px solid rgba(212, 160, 23, 0.4)',
                      color: 'var(--color-gold)',
                      fontWeight: 600,
                    }}
                  >
                    🧩 {w.word}: {w.clue}
                  </span>
                ))}
              </div>
            )}

            {q.explanation && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic', marginTop: '0.3rem', display: 'flex', gap: '0.35rem' }}>
                <span>💡</span>
                <FormattedText text={q.explanation} style={{ flex: 1 }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
