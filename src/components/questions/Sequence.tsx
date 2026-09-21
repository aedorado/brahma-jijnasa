'use client'

import { useState, useRef, useEffect } from 'react'
import type { SequenceQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  question: SequenceQuestion
  answer: number[]        // current ordering of original item indices
  onAnswer: (order: number[]) => void
  disabled?: boolean
}

export function Sequence({ question, answer, onAnswer, disabled }: Props) {
  const { t } = useLanguage()

  // Initialize order as [0, 1, 2, 3, ...] if no answer yet
  const initOrder = answer && answer.length === question.items.length
    ? answer
    : question.items.map((_, i) => i)

  const [order, setOrder] = useState<number[]>(initOrder)
  const [activeMoved, setActiveMoved] = useState<number | null>(null)
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // Register current order if not yet answered
  useEffect(() => {
    if (!answer || answer.length === 0) {
      onAnswer(initOrder)
    }
  }, [])

  const handleDragStart = (i: number) => { 
    if (disabled) return
    dragIndex.current = i 
    setActiveMoved(order[i])
  }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (!disabled) setDragOver(i)
  }

  const handleDrop = (i: number) => {
    if (dragIndex.current === null || disabled) return
    const newOrder = [...order]
    const [moved] = newOrder.splice(dragIndex.current, 1)
    newOrder.splice(i, 0, moved)
    setOrder(newOrder)
    onAnswer(newOrder)
    setActiveMoved(moved)
    setTimeout(() => setActiveMoved(null), 350)
    dragIndex.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => { 
    dragIndex.current = null
    setDragOver(null) 
    setTimeout(() => setActiveMoved(null), 300)
  }

  // Touch support for mobile/tablet
  const touchStart = useRef<number | null>(null)
  const handleTouchStart = (i: number) => { 
    if (!disabled) {
      touchStart.current = i
      setActiveMoved(order[i])
    }
  }
  const handleTouchEnd = (i: number) => {
    if (touchStart.current === null || touchStart.current === i || disabled) return
    const newOrder = [...order]
    const [moved] = newOrder.splice(touchStart.current, 1)
    newOrder.splice(i, 0, moved)
    setOrder(newOrder)
    onAnswer(newOrder)
    setActiveMoved(moved)
    setTimeout(() => setActiveMoved(null), 350)
    touchStart.current = null
  }

  // Keyboard/button move up and down with smooth animation
  const moveItem = (position: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    const target = direction === 'up' ? position - 1 : position + 1
    if (target < 0 || target >= order.length) return
    const newOrder = [...order]
    const [moved] = newOrder.splice(position, 1)
    newOrder.splice(target, 0, moved)
    setOrder(newOrder)
    onAnswer(newOrder)
    setActiveMoved(moved)
    setTimeout(() => setActiveMoved(null), 380)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.4rem', lineHeight: 1.5 }}>
        {question.question}
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>↕</span> {t.quizEngine.dragInstruction || 'Drag cards or use arrows to arrange in correct order.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {order.map((itemIdx, position) => {
          const isJustMoved = activeMoved === itemIdx
          const isDraggedOver = dragOver === position

          return (
            <div
              key={itemIdx}
              draggable={!disabled}
              onDragStart={() => handleDragStart(position)}
              onDragOver={e => handleDragOver(e, position)}
              onDrop={() => handleDrop(position)}
              onDragEnd={handleDragEnd}
              onTouchStart={() => handleTouchStart(position)}
              onTouchEnd={() => handleTouchEnd(position)}
              className={`drag-item option-btn ${isDraggedOver ? 'drag-over' : ''}`}
              id={`sequence-item-${position}`}
              style={{ 
                cursor: disabled ? 'default' : 'grab', 
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.9rem 1.15rem',
                borderRadius: '12px',
                transition: 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease, background 0.2s ease',
                border: isDraggedOver
                  ? '2px dashed var(--color-gold)'
                  : isJustMoved
                  ? '1.5px solid var(--color-primary)'
                  : undefined,
                background: isJustMoved
                  ? 'rgba(242, 128, 20, 0.08)'
                  : isDraggedOver
                  ? 'rgba(212, 175, 55, 0.08)'
                  : undefined,
                transform: isDraggedOver
                  ? 'scale(1.02)'
                  : isJustMoved
                  ? 'scale(1.018)'
                  : 'scale(1)',
                boxShadow: isJustMoved
                  ? '0 6px 20px rgba(242, 128, 20, 0.25)'
                  : undefined,
                position: 'relative',
                zIndex: isJustMoved ? 2 : 1,
              }}
            >
              {/* Step Order Badge */}
              <span
                style={{
                  width: 32, 
                  height: 32,
                  borderRadius: 8,
                  background: isJustMoved ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  border: isJustMoved ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border-gold)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.85rem', 
                  fontWeight: 800,
                  color: isJustMoved ? '#ffffff' : 'var(--color-gold)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                {position + 1}
              </span>

              {/* Item Text */}
              <span style={{ flex: 1, fontSize: '0.96rem', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.45 }}>
                {question.items[itemIdx]}
              </span>

            {/* Rearrange Action Controls */}
            {!disabled && (
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} 
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={position === 0}
                  onClick={e => moveItem(position, 'up', e)}
                  title="Move Up"
                  aria-label="Move Up"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: position === 0 ? 'transparent' : 'var(--color-surface-2)',
                    color: position === 0 ? 'var(--color-muted)' : 'var(--color-gold)',
                    opacity: position === 0 ? 0.35 : 1,
                    cursor: position === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={position === order.length - 1}
                  onClick={e => moveItem(position, 'down', e)}
                  title="Move Down"
                  aria-label="Move Down"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: position === order.length - 1 ? 'transparent' : 'var(--color-surface-2)',
                    color: position === order.length - 1 ? 'var(--color-muted)' : 'var(--color-gold)',
                    opacity: position === order.length - 1 ? 0.35 : 1,
                    cursor: position === order.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ▼
                </button>
                <span 
                  style={{ 
                    color: 'var(--color-muted)', 
                    fontSize: '1.25rem', 
                    marginLeft: '0.35rem', 
                    userSelect: 'none',
                    lineHeight: 1 
                  }}
                >
                  ⠿
                </span>
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}
