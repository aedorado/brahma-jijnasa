'use client'

import type { SpotTheErrorQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'
import { FormattedText } from '@/components/FormattedText'

type Props = {
  question: SpotTheErrorQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function SpotTheError({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.25rem', lineHeight: 1.55 }}>
        <FormattedText text={question.question || t.questions?.spotErrorDefaultPrompt || 'Spot the error in the passage below:'} inline />
      </h2>

      {/* Passage */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          borderLeft: '3px solid var(--color-primary)',
          lineHeight: 1.8,
          fontSize: '0.95rem',
          color: 'var(--color-lotus)',
        }}
      >
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          {t.questions?.passageBadge || '📜 Passage'}
        </p>
        <FormattedText text={question.passage} />
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
        {t.questions?.whichPartError || 'Which part of the passage contains an error?'}
      </p>

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
            <span style={{ fontSize: '0.9rem' }}>{opt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
