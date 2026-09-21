'use client'

import type { CaseStudyQuestion, WhatWouldYouDoQuestion } from '@/types/quiz'

type Props = {
  question: CaseStudyQuestion | WhatWouldYouDoQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function ScenarioQuestion({ question, answer, onAnswer, disabled }: Props) {
  return (
    <div>
      {/* Scenario block */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          background: 'rgba(123,79,166,0.07)',
          borderColor: 'rgba(123,79,166,0.2)',
          lineHeight: 1.8,
        }}
      >
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          {question.type === 'case-study' ? '📖 Real-Life Scenario' : '🤔 Ethical Situation'}
        </p>
        <p style={{ color: 'var(--color-lotus)', fontSize: '0.95rem', lineHeight: 1.7 }}>
          {question.scenario}
        </p>
      </div>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', lineHeight: 1.5 }}>
        {question.question || (question.type === 'case-study' ? 'Which principle best applies here?' : 'What would you do?')}
      </h2>

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
