'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { QuizSeriesRound } from '@/types/series'
import type { QuizMeta } from '@/types/quiz'

interface SeriesDayLinkModalProps {
  isOpen: boolean
  onClose: () => void
  round: QuizSeriesRound | null
  allQuizzes: QuizMeta[]
  allRounds: QuizSeriesRound[]
  onSaveLink: (targetQuizId: string, unlockAtIso?: string) => Promise<void>
  onUnlink: () => Promise<void>
  loading: boolean
}

function toLocalDatetimeString(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function formatIstDisplay(localDatetimeStr: string): string {
  if (!localDatetimeStr) return ''
  try {
    const date = new Date(localDatetimeStr)
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(date) + ' IST'
  } catch {
    return localDatetimeStr
  }
}

export function SeriesDayLinkModal({
  isOpen,
  onClose,
  round,
  allQuizzes,
  allRounds,
  onSaveLink,
  onUnlink,
  loading,
}: SeriesDayLinkModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedQuizId, setSelectedQuizId] = useState<string>('')
  const [unlockAtInput, setUnlockAtInput] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, loading])

  useEffect(() => {
    if (round) {
      setSelectedQuizId(round.quiz_id || '')
      setUnlockAtInput(toLocalDatetimeString(round.unlock_at))
      setSearchQuery('')
    }
  }, [round])

  if (!isOpen || !round || !mounted) return null

  // Map quiz_id to which day it is currently assigned to (if any)
  const quizAssignmentMap = new Map<string, number>()
  for (const r of allRounds) {
    if (r.quiz_id && r.quiz_id.trim()) {
      quizAssignmentMap.set(r.quiz_id.trim(), r.day_number)
    }
  }

  const filteredQuizzes = allQuizzes.filter(q => {
    if (!searchQuery.trim()) return true
    const s = searchQuery.toLowerCase()
    return q.id.toLowerCase().includes(s) || q.title.toLowerCase().includes(s)
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuizId) {
      alert('Please choose a quiz from the library.')
      return
    }
    const isoSchedule = unlockAtInput ? new Date(unlockAtInput).toISOString() : undefined
    await onSaveLink(selectedQuizId, isoSchedule)
  }

  const isCurrentlyAttached = Boolean(round.quiz_id && round.quiz_id.trim() !== '')

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div
        className="card card-gold animate-fadeIn"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative',
          boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>👑 Admin Linker</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                {round.day_number <= 0 ? `Prep Day ${round.day_number}` : `Day ${round.day_number}`}
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              Attach Quiz to Series Day
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
              {round.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost btn-xs"
            style={{ fontSize: '1.1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Search Quizzes */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-text)' }}>
              1. Select Quiz from Library <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search quiz title or ID..."
              className="input"
              style={{
                fontSize: '0.85rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                marginBottom: '0.5rem',
              }}
            />

            <select
              value={selectedQuizId}
              onChange={e => setSelectedQuizId(e.target.value)}
              className="input"
              size={6}
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                height: '160px',
              }}
              required
            >
              <option value="" disabled>-- Select a Quiz ({filteredQuizzes.length} found) --</option>
              {filteredQuizzes.map(q => {
                const assignedDay = quizAssignmentMap.get(q.id)
                const isThisRound = assignedDay === round.day_number
                const isOtherRound = assignedDay !== undefined && !isThisRound
                const tag = isThisRound
                  ? '✓ [Attached to this day]'
                  : isOtherRound
                  ? `⚠️ [Assigned to Day ${assignedDay}]`
                  : '— [Available]'
                return (
                  <option key={q.id} value={q.id} style={{ padding: '0.4rem 0.6rem' }}>
                    {q.title} ({q.id}) {tag}
                  </option>
                )
              })}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
              💡 Attaching a quiz will automatically remove it from any previous day it was assigned to.
            </p>
          </div>

          {/* Release Schedule */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-text)' }}>
              2. Scheduled Going Live / Release Time (IST)
            </label>
            <input
              type="datetime-local"
              value={unlockAtInput}
              onChange={e => setUnlockAtInput(e.target.value)}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
              }}
            />
            {unlockAtInput && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--color-gold)' }}>
                🕒 Scheduled: <strong>{formatIstDisplay(unlockAtInput)}</strong>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <div>
              {isCurrentlyAttached && (
                <button
                  type="button"
                  onClick={onUnlink}
                  disabled={loading}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.78rem' }}
                >
                  ✕ Detach from Day
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedQuizId}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.85rem', fontWeight: 700 }}
              >
                {loading ? 'Saving...' : '💾 Save Link & Schedule'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
