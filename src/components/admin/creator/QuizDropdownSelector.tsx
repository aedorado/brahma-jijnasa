'use client'

import { useState, useRef, useEffect } from 'react'
import type { QuizMeta } from '@/types/quiz'

interface QuizDropdownSelectorProps {
  catalogQuizzes: QuizMeta[]
  isEditingExisting: boolean
  currentSlug: string
  hasUnsavedChanges?: boolean
  onSelectQuiz: (quizId: string) => void
  onResetToNew: () => void
}

export function QuizDropdownSelector({
  catalogQuizzes,
  isEditingExisting,
  currentSlug,
  hasUnsavedChanges = false,
  onSelectQuiz,
  onResetToNew,
}: QuizDropdownSelectorProps) {
  const [quizDropdownOpen, setQuizDropdownOpen] = useState(false)
  const [quizSearchQuery, setQuizSearchQuery] = useState('')
  const quizDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quizDropdownRef.current && !quizDropdownRef.current.contains(event.target as Node)) {
        setQuizDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setQuizDropdownOpen(false)
      }
    }
    if (quizDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [quizDropdownOpen])

  const filteredCatalogQuizzes = catalogQuizzes.filter(q => {
    if (!quizSearchQuery.trim()) return true
    const query = quizSearchQuery.toLowerCase()
    return (
      q.title.toLowerCase().includes(query) ||
      q.id.toLowerCase().includes(query) ||
      (q.category && q.category.toLowerCase().includes(query))
    )
  })

  const selectedQuiz = isEditingExisting ? catalogQuizzes.find(q => q.id === currentSlug) : null

  return (
    <div ref={quizDropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setQuizDropdownOpen(!quizDropdownOpen)}
        style={{
          fontSize: '0.82rem',
          padding: '0.45rem 0.85rem',
          background: 'var(--color-surface-2)',
          border: quizDropdownOpen ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
          color: 'var(--color-text)',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: 360,
          transition: 'all 0.15s ease',
        }}
        title="Click to search and switch between quizzes"
      >
        <span style={{ fontSize: '0.85rem' }}>{isEditingExisting ? '✏️' : '➕'}</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          {selectedQuiz
            ? `${selectedQuiz.title.length > 30 ? selectedQuiz.title.slice(0, 30) + '...' : selectedQuiz.title} (${selectedQuiz.id})`
            : isEditingExisting
            ? `Edit: ${currentSlug}`
            : '+ Create Brand New Quiz'}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
          {quizDropdownOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Floating Searchable Menu */}
      {quizDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 380,
            maxWidth: '92vw',
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.3), 0 6px 16px rgba(0, 0, 0, 0.15)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.65rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                🔍
              </span>
              <input
                type="text"
                value={quizSearchQuery}
                onChange={e => setQuizSearchQuery(e.target.value)}
                placeholder="Search quizzes by title, slug, or day..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.45rem 1.8rem 0.45rem 2.1rem',
                  borderRadius: 7,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              {quizSearchQuery && (
                <button
                  type="button"
                  onClick={() => setQuizSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Quizzes List */}
          <div style={{ maxHeight: 280, overflowY: 'auto', padding: '0.35rem 0' }}>
            {/* "+ Create Brand New Quiz" Option */}
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges) {
                  const confirmed = window.confirm('You have unsaved changes in the current quiz. Discard changes and create a new quiz?')
                  if (!confirmed) return
                }
                onResetToNew()
                setQuizDropdownOpen(false)
                setQuizSearchQuery('')
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.6rem 0.9rem',
                background: !isEditingExisting ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                color: !isEditingExisting ? 'var(--color-gold)' : 'var(--color-text)',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>➕</span>
              <span>+ Create Brand New Quiz</span>
              {!isEditingExisting && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </button>

            {filteredCatalogQuizzes.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                No quizzes match "{quizSearchQuery}"
              </div>
            ) : (
              filteredCatalogQuizzes.map(q => {
                const isSelected = isEditingExisting && currentSlug === q.id
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setQuizDropdownOpen(false)
                        return
                      }
                      if (hasUnsavedChanges) {
                        const confirmed = window.confirm(`You have unsaved changes in the current quiz. Discard changes and load "${q.title}"?`)
                        if (!confirmed) return
                      }
                      onSelectQuiz(q.id)
                      setQuizDropdownOpen(false)
                      setQuizSearchQuery('')
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.9rem',
                      background: isSelected ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                      borderBottom: '1px solid rgba(128, 128, 128, 0.08)',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? 'var(--color-gold)' : 'var(--color-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ✏️ {q.title}
                      </span>
                      {isSelected && <span style={{ color: 'var(--color-gold)', fontWeight: 800, fontSize: '0.8rem' }}>✓</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--color-gold)' }}>{q.id}</span>
                      <span>•</span>
                      <span>{q.category}</span>
                      {q.totalQuestions !== undefined && (
                        <>
                          <span>•</span>
                          <span>{q.totalQuestions} Qs</span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
