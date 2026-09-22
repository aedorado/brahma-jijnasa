'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { SequenceQuestion } from '@/types/quiz'
import { useLanguage } from '@/context/LanguageContext'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

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

  // DOM node references and layout measurement for buttery smooth FLIP animations
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const prevPositions = useRef<Map<number, number>>(new Map())

  // Reset tracked positions when question changes
  useEffect(() => {
    prevPositions.current.clear()
  }, [question.id, question.question])

  // FLIP (First, Last, Invert, Play) animation on order change
  useIsomorphicLayoutEffect(() => {
    const currentPositions = new Map<number, number>()
    itemRefs.current.forEach((el, itemIdx) => {
      if (el) {
        currentPositions.set(itemIdx, el.getBoundingClientRect().top)
      }
    })

    // If we have previous recorded positions, animate items that moved
    if (prevPositions.current.size > 0) {
      itemRefs.current.forEach((el, itemIdx) => {
        if (el && prevPositions.current.has(itemIdx)) {
          const prevTop = prevPositions.current.get(itemIdx)!
          const currentTop = currentPositions.get(itemIdx)!
          const deltaY = prevTop - currentTop

          if (Math.abs(deltaY) > 1) {
            // Invert: snap immediately to previous visual position
            el.style.transform = `translateY(${deltaY}px)`
            el.style.transition = 'none'

            // Force reflow
            void el.offsetHeight

            // Play: smoothly slide to new destination
            requestAnimationFrame(() => {
              el.style.transition = 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.28s ease, border-color 0.28s ease, background 0.2s ease'
              el.style.transform = ''
            })
          }
        }
      })
    }

    // Save current positions for next reorder
    prevPositions.current = currentPositions
  }, [order])

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
    setTimeout(() => setActiveMoved(null), 380)
    dragIndex.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => { 
    dragIndex.current = null
    setDragOver(null) 
    setTimeout(() => setActiveMoved(null), 300)
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
        <span>↕</span> {t.quizEngine.dragInstruction || 'Use arrows or drag cards to arrange in correct order.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', position: 'relative' }}>
        {order.map((itemIdx, position) => {
          const isJustMoved = activeMoved === itemIdx
          const isDraggedOver = dragOver === position

          return (
            <div
              key={itemIdx}
              ref={el => {
                if (el) itemRefs.current.set(itemIdx, el)
                else itemRefs.current.delete(itemIdx)
              }}
              draggable={!disabled}
              onDragStart={() => handleDragStart(position)}
              onDragOver={e => handleDragOver(e, position)}
              onDrop={() => handleDrop(position)}
              onDragEnd={handleDragEnd}
              className={`drag-item option-btn ${isDraggedOver ? 'drag-over' : ''}`}
              id={`sequence-item-${position}`}
              style={{ 
                cursor: disabled ? 'default' : 'grab', 
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.9rem 1.15rem',
                borderRadius: '12px',
                border: isDraggedOver
                  ? '2px dashed var(--color-gold)'
                  : isJustMoved
                  ? '1.5px solid var(--color-primary)'
                  : undefined,
                background: isJustMoved
                  ? 'rgba(242, 128, 20, 0.12)'
                  : isDraggedOver
                  ? 'rgba(212, 175, 55, 0.08)'
                  : undefined,
                boxShadow: isJustMoved
                  ? '0 6px 20px rgba(242, 128, 20, 0.28), 0 0 12px rgba(240, 199, 78, 0.2)'
                  : undefined,
                position: 'relative',
                zIndex: isJustMoved ? 5 : 1,
                willChange: 'transform',
                touchAction: 'pan-y',
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
                  transition: 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease',
                  transform: isJustMoved ? 'scale(1.08)' : 'scale(1)',
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
                    className="sequence-arrow-btn"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={position === order.length - 1}
                    onClick={e => moveItem(position, 'down', e)}
                    title="Move Down"
                    aria-label="Move Down"
                    className="sequence-arrow-btn"
                  >
                    ▼
                  </button>
                  <span 
                    style={{ 
                      color: 'var(--color-muted)', 
                      fontSize: '1.25rem', 
                      marginLeft: '0.35rem', 
                      userSelect: 'none',
                      lineHeight: 1,
                      opacity: 0.65,
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
