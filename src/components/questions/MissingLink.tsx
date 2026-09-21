'use client'

import type { MissingLinkQuestion } from '@/types/quiz'

type Props = {
  question: MissingLinkQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function MissingLink({ question, answer, onAnswer, disabled }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
        {question.question || 'What event completes the chain?'}
      </h2>

      {/* Chain visualization */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          padding: '0.5rem 0',
        }}
      >
        {question.chain.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div
              style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: item === '?' ? '2px dashed var(--color-primary)' : '1px solid var(--color-border-gold)',
                background: item === '?' ? 'rgba(232,118,10,0.08)' : 'var(--glass-bg)',
                fontSize: item === '?' ? '1.5rem' : '0.85rem',
                fontWeight: item === '?' ? 900 : 500,
                color: item === '?' ? 'var(--color-primary)' : 'var(--color-lotus)',
                textAlign: 'center',
                minWidth: 80,
                animation: item === '?' ? 'pulse 2s ease infinite' : undefined,
              }}
            >
              {item}
            </div>
            {i < question.chain.length - 1 && (
              <span style={{ color: 'var(--color-gold)', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {question.options.map((opt, i) => (
          <button
            key={i}
            id={`option-${i}`}
            className={`option-btn ${answer === i ? 'selected' : ''}`}
            onClick={() => !disabled && onAnswer(i)}
            disabled={disabled}
          >
            <span className="option-letter">{LETTERS[i]}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
