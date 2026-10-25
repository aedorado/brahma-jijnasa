'use client'

import Link from 'next/link'
import type { Difficulty, QuizMeta } from '@/types/quiz'
import type { QuizSeriesRound } from '@/types/series'
import { QuizDropdownSelector } from './QuizDropdownSelector'
import { QuizSeriesLinker } from './QuizSeriesLinker'

interface QuizMetadataFormProps {
  title: string
  onTitleChange: (val: string) => void
  slug: string
  onSlugChange: (val: string) => void
  category: string
  onCategoryChange: (val: string) => void
  description: string
  onDescriptionChange: (val: string) => void
  difficulty: Difficulty
  onDifficultyChange: (val: Difficulty) => void
  timeLimitMins: number
  onTimeLimitMinsChange: (val: number) => void
  authorName: string
  onAuthorNameChange: (val: string) => void
  isPublished: boolean
  onIsPublishedChange: (val: boolean) => void
  isEditingExisting: boolean
  hasUnsavedChanges?: boolean
  loadingQuiz: boolean
  onResetToNew: () => void
  catalogQuizzes: QuizMeta[]
  onSelectQuiz: (id: string) => void

  // Series Linking
  linkToSeries: boolean
  onToggleLinkToSeries: (val: boolean) => void
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

export function QuizMetadataForm({
  title,
  onTitleChange,
  slug,
  onSlugChange,
  category,
  onCategoryChange,
  description,
  onDescriptionChange,
  difficulty,
  onDifficultyChange,
  timeLimitMins,
  onTimeLimitMinsChange,
  authorName,
  onAuthorNameChange,
  isPublished,
  onIsPublishedChange,
  isEditingExisting,
  hasUnsavedChanges = false,
  loadingQuiz,
  onResetToNew,
  catalogQuizzes,
  onSelectQuiz,

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
}: QuizMetadataFormProps) {
  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Quiz Studio & CMS Manager</h2>
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Supabase Powered</span>
            {isEditingExisting && (
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                ✏️ Editing: {slug}
              </span>
            )}
            {hasUnsavedChanges ? (
              <span
                className="badge animate-fadeIn"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(245, 158, 11, 0.16)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 20,
                }}
                title="You have unsaved changes in this quiz"
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)',
                  }}
                />
                Unsaved Changes
              </span>
            ) : isEditingExisting ? (
              <span
                className="badge animate-fadeIn"
                style={{
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 20,
                }}
              >
                ✓ All Changes Saved
              </span>
            ) : null}
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            {isEditingExisting
              ? `Currently editing "${title}". Modify fields or questions below and click Update.`
              : 'Enter quiz details below or choose an existing quiz from the dropdown to edit it.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Searchable Quick Load Dropdown Combobox */}
          {catalogQuizzes.length > 0 && (
            <QuizDropdownSelector
              catalogQuizzes={catalogQuizzes}
              isEditingExisting={isEditingExisting}
              currentSlug={slug}
              hasUnsavedChanges={hasUnsavedChanges}
              onSelectQuiz={onSelectQuiz}
              onResetToNew={onResetToNew}
            />
          )}

          {isEditingExisting && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                if (hasUnsavedChanges) {
                  const confirmed = window.confirm('You have unsaved changes in the current quiz. Discard changes and start a new quiz?')
                  if (!confirmed) return
                }
                onResetToNew()
              }}
              style={{ border: '1px solid var(--color-border)', padding: '0.4rem 0.75rem' }}
            >
              + New Quiz
            </button>
          )}

          <Link
            href="/prompts/README.md"
            target="_blank"
            className="btn btn-ghost btn-xs"
            style={{ border: '1px solid var(--color-border)', padding: '0.4rem 0.75rem' }}
          >
            📖 Master Prompts
          </Link>
        </div>
      </div>

      {loadingQuiz && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-gold)', fontWeight: 600 }}>
          <span className="spinner-gold" style={{ display: 'inline-block', marginRight: '0.5rem' }} />
          Loading quiz data from database...
        </div>
      )}

      {/* Form Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Title */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Quiz Title <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="e.g. Day 1: The Life & Legacy of HH Bhakti Tirtha Swami"
            className="input"
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        {/* Slug */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Slug / ID (URL path) <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => onSlugChange(e.target.value)}
            placeholder="e.g. 64-day-01"
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-gold)',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Category
          </label>
          <select
            value={category}
            onChange={e => onCategoryChange(e.target.value)}
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="64-principles">64 Principles (Bhakti Tirtha Swami)</option>
            <option value="bhagavad-gita">Bhagavad Gītā</option>
            <option value="vaishnava-calendar">Vaiṣṇava Calendar & Ācāryas</option>
            <option value="mahabharata">Mahābhārata</option>
            <option value="caitanya-caritamrta">Śrī Caitanya-caritāmṛta</option>
            <option value="general">General / Philosophy</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={e => onDifficultyChange(e.target.value as Difficulty)}
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="easy">Easy (Fundamentals)</option>
            <option value="medium">Medium (Analytical)</option>
            <option value="hard">Hard (Scholarly)</option>
          </select>
        </div>

        {/* Time Limit */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Time Limit (Minutes)
          </label>
          <input
            type="number"
            min={1}
            max={180}
            value={timeLimitMins}
            onChange={e => onTimeLimitMinsChange(Number(e.target.value))}
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Author Name / Created By */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Author / Study Circle Attribution
          </label>
          <input
            type="text"
            value={authorName}
            onChange={e => onAuthorNameChange(e.target.value)}
            placeholder="e.g. Anurag Prabhu / Bhakti Tirtha Swami Circle"
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Visibility Status */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Visibility Status
          </label>
          <select
            value={isPublished ? 'published' : 'draft'}
            onChange={e => onIsPublishedChange(e.target.value === 'published')}
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="published">🚀 Published (Live in Library)</option>
            <option value="draft">📝 Draft (Admin only)</option>
          </select>
        </div>

        {/* Description */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Description & Study References
          </label>
          <textarea
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="e.g. Life, surrender, preaching & teachings of HH Bhakti Tirtha Swami from Black Lotus..."
            rows={2}
            className="input"
            style={{
              background: 'var(--color-surface-2)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              resize: 'vertical',
              minHeight: '70px',
            }}
          />
        </div>
      </div>

      {/* Series Campaign Linking Card */}
      <QuizSeriesLinker
        linkToSeries={linkToSeries}
        onToggleLinkToSeries={onToggleLinkToSeries}
        selectedSeriesDay={selectedSeriesDay}
        availableSeriesRounds={availableSeriesRounds}
        seriesSearchQuery={seriesSearchQuery}
        onSeriesSearchQueryChange={onSeriesSearchQueryChange}
        filteredSeriesRounds={filteredSeriesRounds}
        onSeriesDaySelect={onSeriesDaySelect}
        unlockAtInput={unlockAtInput}
        onUnlockAtInputChange={onUnlockAtInputChange}
        formatIstDisplay={formatIstDisplay}
        currentQuizSlug={slug}
      />
    </div>
  )
}
