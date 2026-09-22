'use client'

import type { AssertionReasonQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: AssertionReasonQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function AssertionReason({ question, answer, onAnswer, disabled }: Props) {
  const { language } = useLanguage()

  const defaultPrompt = language === 'hi'
    ? 'निम्नलिखित कथन (A) एवं कारण (R) को पढ़ें:'
    : language === 'pt'
    ? 'Leia a seguinte Afirmação (A) e Razão (R):'
    : 'Read the following Assertion (A) and Reason (R):'

  const choosePrompt = language === 'hi'
    ? 'सही संबंध का चयन करें:'
    : language === 'pt'
    ? 'Escolha a relação correta:'
    : 'Choose the correct relationship:'

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
        {question.question || defaultPrompt}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            {language === 'hi' ? 'कथन (A)' : language === 'pt' ? 'Afirmação (A)' : 'Assertion (A)'}
          </p>
          <p style={{ lineHeight: 1.6 }}>{question.assertion}</p>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            {language === 'hi' ? 'कारण (R)' : language === 'pt' ? 'Razão (R)' : 'Reason (R)'}
          </p>
          <p style={{ lineHeight: 1.6 }}>{question.reason}</p>
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
