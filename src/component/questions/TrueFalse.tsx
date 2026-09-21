'use client'

import type { TrueFalseQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: TrueFalseQuestion
  answer: boolean | null
  onAnswer: (val: boolean) => void
  disabled?: boolean
}

export function TrueFalse({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem', lineHeight: 1.5, color: 'var(--color-text)' }}>
        {question.question}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[true, false].map(val => (
          <button
            key={String(val)}
            id={`option-${val}`}
            className={`option-btn ${answer === val ? 'selected' : ''}`}
            onClick={() => !disabled && onAnswer(val)}
            disabled={disabled}
            style={{
              justifyContent: 'center',
              flexDirection: 'column',
              padding: '1.5rem 1rem',
              fontSize: '1.2rem',
              fontWeight: 700,
              gap: '0.4rem',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{val ? '✅' : '❌'}</span>
            <span>{val ? t.quizEngine.true : t.quizEngine.false}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
