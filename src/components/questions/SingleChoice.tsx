'use client'

import type { SingleChoiceQuestion, CauseEffectQuestion, OddOneOutQuestion, TwoTruthsOneFalseQuestion, EvidenceBasedQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: SingleChoiceQuestion | CauseEffectQuestion | OddOneOutQuestion | TwoTruthsOneFalseQuestion | EvidenceBasedQuestion
  answer: number | null
  onAnswer: (index: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function SingleChoice({ question, answer, onAnswer, disabled }: Props) {
  const { t, language } = useLanguage()

  return (
    <div>
      {'principle' in question && (
        <div className="shloka-block" style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            {t.questions?.principleLabel || (language === 'hi' ? 'सिद्धांत:' : language === 'pt' ? 'Princípio:' : 'Principle:')}
          </p>
          <p style={{ color: 'var(--color-lotus)', fontStyle: 'italic' }}>{question.principle}</p>
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', lineHeight: 1.5 }}>
        {question.question || (question.type === 'two-truths-one-false'
          ? (language === 'hi' ? 'असत्य कथन की पहचान करें:' : language === 'pt' ? 'Identifique a declaração FALSA:' : 'Identify the FALSE statement:')
          : question.type === 'odd-one-out'
          ? (language === 'hi' ? 'बेमेल विकल्प की पहचान करें:' : language === 'pt' ? 'Identifique a opção incompatível:' : 'Identify the odd one out:')
          : '')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {question.options.map((option, i) => (
          <button
            key={i}
            id={`option-${i}`}
            className={`option-btn ${answer === i ? 'selected' : ''}`}
            onClick={() => !disabled && onAnswer(i)}
            disabled={disabled}
          >
            <span className="option-letter">{LETTERS[i]}</span>
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
