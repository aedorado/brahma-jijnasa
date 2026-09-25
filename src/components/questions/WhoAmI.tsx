'use client'

import { useState } from 'react'
import type { WhoAmIQuestion } from '@/types/quiz'
import type { WhoAmIAnswer } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: WhoAmIQuestion
  answer: WhoAmIAnswer | null
  onAnswer: (val: WhoAmIAnswer) => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']
const MAX_POINTS = 3

export function WhoAmI({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()
  const [cluesRevealed, setCluesRevealed] = useState(
    answer?.cluesRevealed ?? 1
  )

  const pointsForClues = MAX_POINTS - (cluesRevealed - 1)

  const revealNextClue = () => {
    if (cluesRevealed < question.clues.length) {
      const next = cluesRevealed + 1
      setCluesRevealed(next)
      if (answer) {
        onAnswer({ ...answer, cluesRevealed: next })
      }
    }
  }

  const selectCharacter = (i: number) => {
    if (disabled) return
    onAnswer({ selectedIndex: i, cluesRevealed })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', lineHeight: 1.5 }}>
        {question.question}
      </h2>

      {/* Points indicator */}
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          {t.questions?.fewerCluesMorePoints || 'Answer with fewer clues = more points'}
        </p>
        <span className="badge badge-gold">
          {t.questions?.currentPoints || 'Current'}: +{pointsForClues} {pointsForClues !== 1 ? (t.questions?.pts || 'pts') : (t.questions?.ptSingular || 'pt')}
        </span>
      </div>

      {/* Clues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {question.clues.slice(0, cluesRevealed).map((clue, i) => (
          <div key={i} className="clue-card">
            <span className="clue-number">
              {t.questions?.cluePrefix || 'Clue'} {i + 1} {i === 0 ? `(+${MAX_POINTS} ${t.questions?.pts || 'pts'})` : i === 1 ? `(+${MAX_POINTS - 1} ${t.questions?.pts || 'pts'})` : `(+${MAX_POINTS - 2} ${t.questions?.pts || 'pts'})`}
            </span>
            <p style={{ color: 'var(--color-lotus)', lineHeight: 1.6 }}>{clue}</p>
          </div>
        ))}
      </div>

      {/* Reveal next clue button */}
      {cluesRevealed < question.clues.length && !disabled && (
        <button
          className="btn btn-ghost w-full mb-4"
          onClick={revealNextClue}
          id="reveal-clue-btn"
          style={{ borderStyle: 'dashed' }}
        >
          {t.questions?.showNextClue || 'Show Next Clue (−1 point)'}
        </button>
      )}

      {/* Character options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {question.options.map((option, i) => (
          <button
            key={i}
            id={`option-${i}`}
            className={`option-btn ${answer?.selectedIndex === i ? 'selected' : ''}`}
            onClick={() => selectCharacter(i)}
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
