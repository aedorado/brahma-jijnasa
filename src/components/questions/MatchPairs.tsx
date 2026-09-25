'use client'

import { useState } from 'react'
import type { MatchPairsQuestion } from '@/types/quiz'
import type { PairsAnswer } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

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
  const { t } = useLanguage()
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

  const unpairTooltipText = t.questions?.unpairTooltip || 'Click to unpair and change match'
  const selectTooltipText = t.questions?.selectTooltip || 'Click to select'
  const pairTooltipText = t.questions?.pairTooltip || 'Click to pair'
  const removePairTitleText = t.questions?.removePairTitle || 'Unpair'

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.5 }}>
        {question.question}
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        {t.questions?.matchPairsInstructionDetailed || 'Tap an item in Column A, then tap its match in Column B. Tap any matched item or ✕ to unpair or change.'}
      </p>

      <div className="match-pairs-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.85rem', alignItems: 'start', width: '100%' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.questions?.columnA || 'Column A'}
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
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'stretch',
                  gap: '0.45rem',
                  textAlign: 'left',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
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
                title={matchedRight !== null ? unpairTooltipText : selectTooltipText}
              >
                <span style={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.35 }}>
                  {item}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: 'auto', minHeight: 22 }}>
                  {matchedRight !== null && theme ? (
                    <>
                      <span
                        style={{
                          padding: '0.12rem 0.45rem',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: `${theme.border}33`,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.questions?.pairBadge || 'Pair'} {theme.num}
                      </span>
                      <span
                        onClick={(e) => handleExplicitUnpair(e, i)}
                        title={removePairTitleText}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'var(--color-text)',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </span>
                    </>
                  ) : isSelected ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {t.questions?.selectedPrompt || 'Selected ➜'}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.questions?.columnB || 'Column B'}
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
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'stretch',
                  gap: '0.45rem',
                  textAlign: 'left',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
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
                title={matchedLeft !== null ? unpairTooltipText : isWaiting ? pairTooltipText : ''}
              >
                <span style={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.35 }}>
                  {item}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: 'auto', minHeight: 22 }}>
                  {matchedLeft !== null && theme ? (
                    <>
                      <span
                        style={{
                          padding: '0.12rem 0.45rem',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: `${theme.border}33`,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.questions?.pairBadge || 'Pair'} {theme.num}
                      </span>
                      <span
                        onClick={(e) => handleExplicitUnpair(e, matchedLeft)}
                        title={removePairTitleText}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'var(--color-text)',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </span>
                    </>
                  ) : isWaiting ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', opacity: 0.85, whiteSpace: 'nowrap' }}>
                      {t.questions?.tapToPair || 'Tap to pair'}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer bar with status & reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', padding: '0.5rem 0.25rem' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
          {(t.questions?.pairsMatchedCount || '{matched} of {total} pairs matched')
            .replace('{matched}', String(answer.length))
            .replace('{total}', String(question.left.length))}
        </p>

        {answer.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', color: 'var(--color-muted)', padding: '0.25rem 0.65rem' }}
          >
            {t.questions?.resetAllPairs || '🔄 Reset All Pairs'}
          </button>
        )}
      </div>
    </div>
  )
}
