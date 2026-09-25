'use client'

import type { MissingLinkQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: MissingLinkQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function MissingLink({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
        {question.question || t.questions?.missingLinkDefaultPrompt || 'What event completes the chain?'}
      </h2>

      {/* Chain visualization */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          marginBottom: '1.75rem',
        }}
      >
        {question.chain.map((item, i) => {
          const isMissing = item.trim() === '?'
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div
                style={{
                  width: '100%',
                  padding: isMissing ? '0.85rem 1.1rem' : '0.7rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isMissing
                    ? '2px dashed var(--color-primary)'
                    : '1px solid var(--color-border-gold)',
                  background: isMissing ? 'rgba(232,118,10,0.12)' : 'var(--glass-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  boxShadow: isMissing ? '0 0 15px rgba(232,118,10,0.18)' : undefined,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isMissing ? 'var(--color-primary)' : 'rgba(212,175,55,0.15)',
                    color: isMissing ? '#ffffff' : 'var(--color-gold)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isMissing ? '?' : i + 1}
                </span>
                <span
                  style={{
                    fontSize: isMissing ? '0.95rem' : '0.88rem',
                    fontWeight: isMissing ? 700 : 500,
                    color: isMissing ? 'var(--color-primary)' : 'var(--color-lotus)',
                    lineHeight: 1.4,
                  }}
                >
                  {isMissing ? (t.questions?.missingEventPlaceholder || '❓ [ Missing Event — Select below ]') : item}
                </span>
              </div>
              {i < question.chain.length - 1 && (
                <div style={{ color: 'var(--color-gold)', fontSize: '1rem', margin: '0.1rem 0', opacity: 0.8 }}>
                  ↓
                </div>
              )}
            </div>
          )
        })}
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
