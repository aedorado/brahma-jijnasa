'use client'

import type { QuizSeriesRound } from '@/types/series'

interface QuizSeriesLinkerProps {
  linkToSeries: boolean
  onToggleLinkToSeries: (checked: boolean) => void
  selectedSeriesDay: number | null
  availableSeriesRounds: QuizSeriesRound[]
  seriesSearchQuery: string
  onSeriesSearchQueryChange: (query: string) => void
  filteredSeriesRounds: QuizSeriesRound[]
  onSeriesDaySelect: (dayNumStr: string) => void
  unlockAtInput: string
  onUnlockAtInputChange: (val: string) => void
  formatIstDisplay: (localDatetimeStr: string) => string
}

export function QuizSeriesLinker({
  linkToSeries,
  onToggleLinkToSeries,
  selectedSeriesDay,
  availableSeriesRounds,
  seriesSearchQuery,
  onSeriesSearchQueryChange,
  filteredSeriesRounds,
  onSeriesDaySelect,
  unlockAtInput,
  onUnlockAtInputChange,
  formatIstDisplay,
}: QuizSeriesLinkerProps) {
  return (
    <div
      style={{
        marginTop: '1.25rem',
        padding: '1.25rem',
        borderRadius: 12,
        background: 'var(--color-surface)',
        border: linkToSeries ? '1.5px solid var(--color-primary)' : '1px dashed var(--color-border)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={linkToSeries}
            onChange={e => onToggleLinkToSeries(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          <div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
              📅 Link Quiz to 30-Day Series Campaign (Sacred Teachings — 64 Principles)
            </span>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              Assign this quiz to a series day, configure release date/time (IST), and sync student curriculum.
            </p>
          </div>
        </label>

        {linkToSeries && selectedSeriesDay !== null && (
          <span className="badge badge-gold" style={{ fontSize: '0.78rem' }}>
            Day {selectedSeriesDay} Linked
          </span>
        )}
      </div>

      {linkToSeries && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Select Series Day <span style={{ color: 'var(--color-error)' }}>*</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                (Days with existing quizzes are excluded)
              </span>
            </label>
            {availableSeriesRounds.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#f59e0b', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                All 30 series days already have quizzes created!
              </div>
            ) : (
              <div>
                {availableSeriesRounds.length > 5 && (
                  <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
                    <input
                      type="text"
                      value={seriesSearchQuery}
                      onChange={e => onSeriesSearchQueryChange(e.target.value)}
                      placeholder="Search series day or topic..."
                      style={{
                        width: '100%',
                        padding: '0.35rem 1.8rem 0.35rem 0.65rem',
                        borderRadius: 6,
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.78rem',
                        outline: 'none',
                      }}
                    />
                    {seriesSearchQuery && (
                      <button
                        type="button"
                        onClick={() => onSeriesSearchQueryChange('')}
                        style={{
                          position: 'absolute',
                          right: '0.4rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
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
                )}
                <select
                  value={selectedSeriesDay !== null ? String(selectedSeriesDay) : ''}
                  onChange={e => onSeriesDaySelect(e.target.value)}
                  className="input"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- Choose unassigned series day ({filteredSeriesRounds.length} available) --</option>
                  {filteredSeriesRounds.map(r => (
                    <option key={r.day_number} value={r.day_number}>
                      {r.day_number <= 0 ? `Prep Day ${r.day_number}: ` : `Day ${r.day_number}: `}
                      {r.title} ({r.principles_range || r.quiz_id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Going Live / Release Schedule (IST)
            </label>
            <input
              type="datetime-local"
              value={unlockAtInput}
              onChange={e => onUnlockAtInputChange(e.target.value)}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
              }}
            />
            {unlockAtInput && (
              <p style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                🕒 Scheduled Release: {formatIstDisplay(unlockAtInput)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
