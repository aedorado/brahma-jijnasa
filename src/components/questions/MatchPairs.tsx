'use client'

import { useState } from 'react'
import type { MatchPairsQuestion } from '@/types/quiz'
import type { PairsAnswer } from '@/types/quiz'

type Props = {
  question: MatchPairsQuestion
  answer: PairsAnswer
  onAnswer: (pairs: PairsAnswer) => void
  disabled?: boolean
}

const COLORS = [
  'rgba(232,118,10,0.15)',
  'rgba(123,79,166,0.15)',
  'rgba(76,175,125,0.15)',
  'rgba(212,175,55,0.15)',
  'rgba(224,92,92,0.15)',
]

export function MatchPairs({ question, answer, onAnswer, disabled }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)

  const getMatchedRight = (leftIdx: number) => answer.find(([l]) => l === leftIdx)?.[1] ?? null
  const getMatchedLeft  = (rightIdx: number) => answer.find(([, r]) => r === rightIdx)?.[0] ?? null

  const getPairColor = (leftIdx: number) => {
    const pairIndex = answer.findIndex(([l]) => l === leftIdx)
    return pairIndex >= 0 ? COLORS[pairIndex % COLORS.length] : undefined
  }

  const handleLeftClick = (i: number) => {
    if (disabled) return
    if (selectedLeft === i) { setSelectedLeft(null); return }
    setSelectedLeft(i)
  }

  const handleRightClick = (j: number) => {
    if (disabled) return
    if (selectedLeft === null) return

    const newPairs: PairsAnswer = answer.filter(([l, r]) => l !== selectedLeft && r !== j)
    newPairs.push([selectedLeft, j])
    onAnswer(newPairs)
    setSelectedLeft(null)
  }

  const removePair = (leftIdx: number) => {
    if (disabled) return
    onAnswer(answer.filter(([l]) => l !== leftIdx))
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.5 }}>
        {question.question}
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
        Tap an item on the left, then tap its match on the right.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Column A
          </p>
          {question.left.map((item, i) => {
            const matchedRight = getMatchedRight(i)
            const pairColor = getPairColor(i)
            const isSelected = selectedLeft === i
            return (
              <button
                key={i}
                id={`left-${i}`}
                className={`match-item ${isSelected ? 'selected' : matchedRight !== null ? 'matched' : ''}`}
                onClick={() => matchedRight !== null ? removePair(i) : handleLeftClick(i)}
                style={pairColor ? { background: pairColor, borderColor: 'transparent' } : undefined}
                title={matchedRight !== null ? 'Click to unpair' : ''}
              >
                {item}
                {matchedRight !== null && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-success)' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Column B
          </p>
          {question.right.map((item, j) => {
            const matchedLeft = getMatchedLeft(j)
            const pairColor = matchedLeft !== null ? getPairColor(matchedLeft) : undefined
            const isWaiting = selectedLeft !== null && matchedLeft === null
            return (
              <button
                key={j}
                id={`right-${j}`}
                className={`match-item ${matchedLeft !== null ? 'matched' : isWaiting ? '' : ''}`}
                onClick={() => handleRightClick(j)}
                style={{
                  ...(pairColor ? { background: pairColor, borderColor: 'transparent' } : {}),
                  ...(isWaiting ? { borderColor: 'var(--color-primary)', background: 'rgba(232,118,10,0.05)' } : {}),
                }}
              >
                {item}
                {matchedLeft !== null && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-success)' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {answer.length > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '1rem', textAlign: 'center' }}>
          {answer.length} of {question.left.length} pairs matched
        </p>
      )}
    </div>
  )
}
