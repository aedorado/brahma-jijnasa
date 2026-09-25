'use client'

import type { MultipleSelectQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: MultipleSelectQuestion
  answer: number[]
  onAnswer: (indices: number[]) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function MultipleSelect({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()
  const toggle = (i: number) => {
    if (disabled) return
    if (answer.includes(i)) {
      onAnswer(answer.filter(x => x !== i))
    } else {
      onAnswer([...answer, i])
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.5 }}>
        {question.question}
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        {t.questions?.multipleSelectScoring || 'Select all that apply. Scoring: +1 per correct, −0.5 per wrong selection.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {question.options.map((option, i) => {
          const selected = answer.includes(i)
          return (
            <button
              key={i}
              id={`option-${i}`}
              className={`option-btn ${selected ? 'selected' : ''}`}
              onClick={() => toggle(i)}
              disabled={disabled}
              style={{ gap: '0.85rem' }}
            >
              <span
                className="option-letter"
                style={{
                  borderRadius: '4px',
                  ...(selected ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' } : {}),
                }}
              >
                {selected ? '✓' : LETTERS[i]}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
