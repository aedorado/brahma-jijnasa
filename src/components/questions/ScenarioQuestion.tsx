'use client'

import type { CaseStudyQuestion, WhatWouldYouDoQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: CaseStudyQuestion | WhatWouldYouDoQuestion
  answer: number | null
  onAnswer: (i: number) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function ScenarioQuestion({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()

  const defaultBadgeText = question.type === 'case-study'
    ? (t.questions?.scripturalEpisodeBadge || 'Scriptural Episode & Context')
    : (t.questions?.ethicalDilemmaBadge || 'Dharmic Ethical Dilemma')

  const defaultPromptText = question.type === 'case-study'
    ? (t.questions?.caseStudyDefaultPrompt || 'Which principle best applies here?')
    : (t.questions?.whatWouldYouDoDefaultPrompt || 'What would you do?')

  return (
    <div>
      {/* Scenario block */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.4rem',
          marginBottom: '1.4rem',
          background: 'rgba(242, 128, 20, 0.05)',
          border: '1px solid rgba(242, 128, 20, 0.2)',
          borderLeft: '4px solid var(--color-primary)',
          borderRadius: '12px',
        }}
      >
        <p
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>{question.type === 'case-study' ? '📖' : '🤔'}</span>
          <span>{defaultBadgeText}</span>
        </p>
        <p style={{ color: 'var(--color-lotus)', fontSize: '0.98rem', lineHeight: 1.7, margin: 0 }}>
          {question.scenario}
        </p>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', lineHeight: 1.5, color: 'var(--color-text)' }}>
        {question.question || defaultPromptText}
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
