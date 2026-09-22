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
  
  // HTML5 Desktop Drag state
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // Touch Drag state for mobile
  const [touchDraggingIdx, setTouchDraggingIdx] = useState<number | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState<number>(0)
  const [touchHoverTarget, setTouchHoverTarget] = useState<number | null>(null)
  const touchStartY = useRef<number>(0)
  const touchItemStartPos = useRef<number>(0)
  const touchHoverTargetRef = useRef<number | null>(null)

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
    if (prevPositions.current.size > 0 && touchDraggingIdx === null) {
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
  }, [order, touchDraggingIdx])

  // Register current order if not yet answered
  useEffect(() => {
    if (!answer || answer.length === 0) {
      onAnswer(initOrder)
    }
  }, [])

  // Desktop HTML5 drag handlers
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

  // Mobile Touch Drag on dedicated handle
  const handleTouchDragStart = (position: number, e: React.TouchEvent) => {
    if (disabled) return
    const touch = e.touches[0]
    touchStartY.current = touch.clientY
    touchItemStartPos.current = position
    touchHoverTargetRef.current = position
    setTouchDraggingIdx(order[position])
    setDragOffsetY(0)
    setTouchHoverTarget(position)

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(15) } catch {}
    }
  }

  const handleTouchDragMove = (e: React.TouchEvent) => {
    if (touchDraggingIdx === null) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStartY.current
    setDragOffsetY(deltaY)

    // Find card slot under the touch pointer
    const clientY = touch.clientY
    let targetSlot = touchItemStartPos.current
    for (let i = 0; i < order.length; i++) {
      const el = itemRefs.current.get(order[i])
      if (el) {
        const rect = el.getBoundingClientRect()
        if (clientY >= rect.top && clientY <= rect.bottom) {
          targetSlot = i
          break
        }
      }
    }

    if (targetSlot !== touchHoverTargetRef.current) {
      touchHoverTargetRef.current = targetSlot
      setTouchHoverTarget(targetSlot)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(8) } catch {}
      }
    }
  }

  const handleTouchDragEnd = () => {
    if (touchDraggingIdx === null) return
    const fromPos = touchItemStartPos.current
    const toPos = touchHoverTargetRef.current !== null ? touchHoverTargetRef.current : fromPos

    if (toPos !== fromPos && toPos >= 0 && toPos < order.length) {
      const newOrder = [...order]
      const [moved] = newOrder.splice(fromPos, 1)
      newOrder.splice(toPos, 0, moved)
      setOrder(newOrder)
      onAnswer(newOrder)
      setActiveMoved(moved)
      setTimeout(() => setActiveMoved(null), 380)
    }

    setTouchDraggingIdx(null)
    setDragOffsetY(0)
    setTouchHoverTarget(null)
    touchHoverTargetRef.current = null
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
        <span>↕</span> {t.quizEngine.dragInstruction || 'Use arrows or drag handle (⠿) to arrange in correct order.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', position: 'relative' }}>
        {order.map((itemIdx, position) => {
          const isJustMoved = activeMoved === itemIdx
          const isDesktopDraggedOver = dragOver === position
          const isTouchDragged = touchDraggingIdx === itemIdx
          const isTouchHoveredSlot = touchDraggingIdx !== null && touchHoverTarget === position && position !== touchItemStartPos.current

          return (
            <div
              key={itemIdx}
              ref={el => {
                if (el) itemRefs.current.set(itemIdx, el)
                else itemRefs.current.delete(itemIdx)
              }}
              draggable={!disabled && touchDraggingIdx === null}
              onDragStart={() => handleDragStart(position)}
              onDragOver={e => handleDragOver(e, position)}
              onDrop={() => handleDrop(position)}
              onDragEnd={handleDragEnd}
              className={`drag-item option-btn ${isDesktopDraggedOver || isTouchHoveredSlot ? 'drag-over' : ''}`}
              id={`sequence-item-${position}`}
              style={{ 
                cursor: disabled ? 'default' : isTouchDragged ? 'grabbing' : 'grab', 
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.9rem 1.15rem',
                borderRadius: '12px',
                border: isDesktopDraggedOver || isTouchHoveredSlot
                  ? '2px dashed var(--color-gold)'
                  : isTouchDragged || isJustMoved
                  ? '1.5px solid var(--color-primary)'
                  : undefined,
                background: isTouchDragged || isJustMoved
                  ? 'rgba(242, 128, 20, 0.14)'
                  : isDesktopDraggedOver || isTouchHoveredSlot
                  ? 'rgba(212, 175, 55, 0.10)'
                  : undefined,
                boxShadow: isTouchDragged
                  ? '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 24px rgba(242, 128, 20, 0.35)'
                  : isJustMoved
                  ? '0 6px 20px rgba(242, 128, 20, 0.28), 0 0 12px rgba(240, 199, 78, 0.2)'
                  : undefined,
                transform: isTouchDragged
                  ? `translateY(${dragOffsetY}px) scale(1.025)`
                  : undefined,
                position: 'relative',
                zIndex: isTouchDragged ? 50 : isJustMoved ? 5 : 1,
                willChange: 'transform',
                touchAction: 'pan-y', // Keep page scroll completely smooth
                transition: isTouchDragged ? 'none' : undefined,
              }}
            >
              {/* Step Order Badge */}
              <span
                style={{
                  width: 32, 
                  height: 32,
                  borderRadius: 8,
                  background: isTouchDragged || isJustMoved ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  border: isTouchDragged || isJustMoved ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border-gold)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.85rem', 
                  fontWeight: 800,
                  color: isTouchDragged || isJustMoved ? '#ffffff' : 'var(--color-gold)',
                  flexShrink: 0,
                  transition: 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease',
                  transform: isTouchDragged || isJustMoved ? 'scale(1.08)' : 'scale(1)',
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
                  
                  {/* Touch/Mouse Drag Handle */}
                  <div
                    className={`drag-handle ${isTouchDragged ? 'active' : ''}`}
                    onTouchStart={e => handleTouchDragStart(position, e)}
                    onTouchMove={handleTouchDragMove}
                    onTouchEnd={handleTouchDragEnd}
                    onTouchCancel={handleTouchDragEnd}
                    title="Drag handle to reorder"
                    aria-label="Drag handle to reorder"
                  >
                    ⠿
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
