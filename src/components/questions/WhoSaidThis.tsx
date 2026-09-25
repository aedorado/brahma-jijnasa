'use client'

import type { WhoSaidThisQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: WhoSaidThisQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function WhoSaidThis({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
        {question.question}
      </h2>

      {/* Quote block */}
      <div className="shloka-block" style={{ marginBottom: '0.75rem' }}>
        {question.quote && (
          <p className="shloka-text" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            &ldquo;{question.quote}&rdquo;
          </p>
        )}
        {question.context && (
          <p className="shloka-ref">{question.context}</p>
        )}
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        {t.questions?.whoSpokeTheseWords || 'Who spoke these words?'}
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
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
