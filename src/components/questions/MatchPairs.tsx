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

interface PairTheme {
  bg: string
  border: string
  text: string
  num: number
}

const PAIR_THEMES: PairTheme[] = [
  { bg: 'rgba(240, 199, 78, 0.18)', border: '#F0C74E', text: '#F0C74E', num: 1 },    // Gold
  { bg: 'rgba(72, 187, 120, 0.18)', border: '#48BB78', text: '#48BB78', num: 2 },    // Emerald
  { bg: 'rgba(0, 181, 216, 0.18)',  border: '#00B5D8', text: '#00B5D8', num: 3 },    // Cyan
  { bg: 'rgba(159, 122, 234, 0.18)', border: '#9F7AEA', text: '#9F7AEA', num: 4 },   // Purple
  { bg: 'rgba(245, 101, 101, 0.18)', border: '#F56565', text: '#F56565', num: 5 },   // Coral Red
  { bg: 'rgba(237, 137, 54, 0.18)',  border: '#ED8936', text: '#ED8936', num: 6 },   // Orange
]

export function MatchPairs({ question, answer, onAnswer, disabled }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)

  const getMatchedRight = (leftIdx: number) => answer.find(([l]) => l === leftIdx)?.[1] ?? null
  const getMatchedLeft  = (rightIdx: number) => answer.find(([, r]) => r === rightIdx)?.[0] ?? null

  const getPairTheme = (leftIdx: number): PairTheme | undefined => {
    const pairIndex = answer.findIndex(([l]) => l === leftIdx)
    return pairIndex >= 0 ? PAIR_THEMES[pairIndex % PAIR_THEMES.length] : undefined
  }

  const handleLeftClick = (i: number) => {
    if (disabled) return
    const matchedRight = getMatchedRight(i)

    if (matchedRight !== null) {
      // Unpair this item and select it so user can pick the new match immediately
      const newPairs = answer.filter(([l]) => l !== i)
      onAnswer(newPairs)
      if (selectedLeft === i) {
        setSelectedLeft(null)
      } else {
        setSelectedLeft(i)
      }
      return
    }

    if (selectedLeft === i) {
      setSelectedLeft(null)
    } else {
      setSelectedLeft(i)
    }
  }

  const handleRightClick = (j: number) => {
    if (disabled) return
    const matchedLeft = getMatchedLeft(j)

    if (selectedLeft !== null) {
      // Pair selected left item with this right item
      const newPairs: PairsAnswer = answer.filter(([l, r]) => l !== selectedLeft && r !== j)
      newPairs.push([selectedLeft, j])
      onAnswer(newPairs)
      setSelectedLeft(null)
      return
    }

    if (matchedLeft !== null) {
      // Unpair this right item and select its left item for fast correction
      const newPairs = answer.filter(([, r]) => r !== j)
      onAnswer(newPairs)
      setSelectedLeft(matchedLeft)
    }
  }

  const handleExplicitUnpair = (e: React.MouseEvent, leftIdx: number) => {
    e.stopPropagation()
    if (disabled) return
    onAnswer(answer.filter(([l]) => l !== leftIdx))
    if (selectedLeft === leftIdx) {
      setSelectedLeft(null)
    }
  }

  const handleReset = () => {
    if (disabled) return
    onAnswer([])
    setSelectedLeft(null)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.5 }}>
        {question.question}
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        Tap an item in <strong>Column A</strong>, then tap its match in <strong>Column B</strong>.
        Tap any matched item or <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>✕</span> to unpair or change.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Column A
            </p>
          </div>
          {question.left.map((item, i) => {
            const matchedRight = getMatchedRight(i)
            const theme = getPairTheme(i)
            const isSelected = selectedLeft === i

            return (
              <button
                key={i}
                id={`left-${i}`}
                type="button"
                className={`match-item ${isSelected ? 'selected' : matchedRight !== null ? 'matched' : ''}`}
                onClick={() => handleLeftClick(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  textAlign: 'left',
                  ...(theme
                    ? {
                        background: theme.bg,
                        borderColor: theme.border,
                        boxShadow: `0 0 10px ${theme.border}22`,
                      }
                    : {}),
                  ...(isSelected
                    ? {
                        borderColor: 'var(--color-gold)',
                        background: 'rgba(240, 199, 78, 0.22)',
                        boxShadow: '0 0 14px rgba(240, 199, 78, 0.4)',
                      }
                    : {}),
                }}
                title={matchedRight !== null ? 'Click to unpair and change match' : 'Click to select'}
              >
                <span style={{ fontWeight: 600 }}>{item}</span>
                {matchedRight !== null && theme ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', marginLeft: 'auto' }}>
                    <span
                      style={{
                        padding: '0.12rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: `${theme.border}33`,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      Pair {theme.num}
                    </span>
                    <span
                      onClick={(e) => handleExplicitUnpair(e, i)}
                      title="Unpair"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: 'var(--color-text)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </span>
                  </div>
                ) : isSelected ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                    Matching →
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Column B
            </p>
          </div>
          {question.right.map((item, j) => {
            const matchedLeft = getMatchedLeft(j)
            const theme = matchedLeft !== null ? getPairTheme(matchedLeft) : undefined
            const isWaiting = selectedLeft !== null && matchedLeft === null

            return (
              <button
                key={j}
                id={`right-${j}`}
                type="button"
                className={`match-item ${matchedLeft !== null ? 'matched' : isWaiting ? '' : ''}`}
                onClick={() => handleRightClick(j)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  textAlign: 'left',
                  ...(theme
                    ? {
                        background: theme.bg,
                        borderColor: theme.border,
                        boxShadow: `0 0 10px ${theme.border}22`,
                      }
                    : {}),
                  ...(isWaiting
                    ? {
                        borderColor: 'var(--color-gold)',
                        background: 'rgba(240, 199, 78, 0.1)',
                      }
                    : {}),
                }}
                title={matchedLeft !== null ? 'Click to unpair and change match' : isWaiting ? 'Click to pair' : ''}
              >
                <span style={{ fontWeight: 600 }}>{item}</span>
                {matchedLeft !== null && theme ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', marginLeft: 'auto' }}>
                    <span
                      style={{
                        padding: '0.12rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: `${theme.border}33`,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      Pair {theme.num}
                    </span>
                    <span
                      onClick={(e) => handleExplicitUnpair(e, matchedLeft)}
                      title="Unpair"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: 'var(--color-text)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </span>
                  </div>
                ) : isWaiting ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', opacity: 0.85 }}>
                    Tap to pair
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer bar with status & reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', padding: '0.5rem 0.25rem' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
          {answer.length} of {question.left.length} pairs matched
        </p>

        {answer.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', color: 'var(--color-muted)', padding: '0.25rem 0.65rem' }}
          >
            🔄 Reset All Pairs
          </button>
        )}
      </div>
    </div>
  )
}
