'use client'

import type { Quiz, Question } from '@/types/quiz'
import type { SupportedLang } from './types'
import { LANG_CONFIG } from './utils'

interface QuizQuestionsEditorProps {
  activeLang: SupportedLang
  onActiveLangChange: (lang: SupportedLang) => void
  questionsRaw: Record<SupportedLang, string>
  parsedQuestions: Record<SupportedLang, Question[]>
  onRawChange: (val: string) => void
  onClear: () => void
  parseError: string | null
  onValidate: () => void
  dryRunQuizCandidate: Quiz | null
  onDryRun?: (quiz: Quiz) => void
  publishing: boolean
  isEditingExisting: boolean
  hasUnsavedChanges?: boolean
  onPublish: () => void
}

export function QuizQuestionsEditor({
  activeLang,
  onActiveLangChange,
  questionsRaw,
  parsedQuestions,
  onRawChange,
  onClear,
  parseError,
  onValidate,
  dryRunQuizCandidate,
  onDryRun,
  publishing,
  isEditingExisting,
  hasUnsavedChanges = false,
  onPublish,
}: QuizQuestionsEditorProps) {
  const activeLangConfig = LANG_CONFIG.find(l => l.key === activeLang)

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Questions Payload</h3>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            Paste <strong>only</strong> the questions array <code>[&#123; ... &#125;]</code>. Switch tabs to provide localized translations.
          </p>
        </div>

        {/* Language Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-surface-2)', padding: '0.3rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          {LANG_CONFIG.map(l => {
            const count = parsedQuestions[l.key].length
            const isActive = activeLang === l.key
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => onActiveLangChange(l.key)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-muted)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 12,
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-3, rgba(0,0,0,0.08))',
                      color: isActive ? '#FFFFFF' : 'var(--color-text)',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Textarea for Current Active Language */}
      <div style={{ marginBottom: '1.25rem' }}>
        <textarea
          value={questionsRaw[activeLang]}
          onChange={e => onRawChange(e.target.value)}
          placeholder={`Paste ONLY ${activeLangConfig?.label || activeLang} questions array here:\n[\n  {\n    "type": "single-choice",\n    "question": "...",\n    "options": ["A", "B", "C", "D"],\n    "correctIndex": 0\n  }\n]`}
          rows={10}
          className="input"
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: 12,
            background: 'var(--color-surface-2)',
            border: parseError ? '1.5px solid var(--color-error)' : '1.5px solid var(--color-border)',
            color: 'var(--color-text)',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
      </div>

      {/* Parse error */}
      {parseError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-error)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
            whiteSpace: 'pre-wrap',
          }}
        >
          ⚠️ {parseError}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onValidate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <span>🔍</span> Clean & Validate {activeLangConfig?.label || activeLang} Questions
          </button>

          {questionsRaw[activeLang] && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClear}
              style={{ border: '1px solid var(--color-border)' }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasUnsavedChanges && (
            <span
              style={{
                fontSize: '0.78rem',
                color: '#f59e0b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '0.3rem 0.65rem',
                borderRadius: 6,
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              <span style={{ fontSize: '0.65rem' }}>●</span> Unsaved changes
            </span>
          )}

          {dryRunQuizCandidate && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onDryRun?.(dryRunQuizCandidate)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
              title="Run dry run simulation in real quiz engine before publishing"
            >
              <span>🧪</span> Dry Run ({dryRunQuizCandidate.questions.length} Qs)
            </button>
          )}

          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={onPublish}
            disabled={publishing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
          >
            <span>🚀</span> {publishing ? 'Saving...' : isEditingExisting ? '🚀 Update Quiz in Supabase CMS' : '🚀 Publish to Supabase CMS'}
          </button>
        </div>
      </div>
    </div>
  )
}
