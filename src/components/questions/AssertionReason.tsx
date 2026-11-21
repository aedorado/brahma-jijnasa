'use client'

import type { AssertionReasonQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'
import { FormattedText } from '@/components/FormattedText'

type Props = {
  question: AssertionReasonQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function AssertionReason({ question, answer, onAnswer, disabled }: Props) {
  const { t, language } = useLanguage()

  const defaultPrompt = t.questions?.assertionReasonDefaultPrompt || (language === 'hi'
    ? 'निम्नलिखित कथन (A) एवं कारण (R) को पढ़ें:'
    : language === 'pt'
    ? 'Leia a seguinte Afirmação (A) e Razão (R):'
    : 'Read the following Assertion (A) and Reason (R):')

  const choosePrompt = t.questions?.chooseRelationship || (language === 'hi'
    ? 'सही संबंध का चयन करें:'
    : language === 'pt'
    ? 'Escolha a relação correta:'
    : 'Choose the correct relationship:')

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.25rem', lineHeight: 1.55 }}>
        <FormattedText text={question.question || defaultPrompt} inline />
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            {t.questions?.assertionLabel || (language === 'hi' ? 'कथन (A)' : language === 'pt' ? 'Afirmação (A)' : 'Assertion (A)')}
          </p>
          <FormattedText text={question.assertion} style={{ lineHeight: 1.6 }} />
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            {t.questions?.reasonLabel || (language === 'hi' ? 'कारण (R)' : language === 'pt' ? 'Razão (R)' : 'Reason (R)')}
          </p>
          <FormattedText text={question.reason} style={{ lineHeight: 1.6 }} />
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
        {choosePrompt}
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
