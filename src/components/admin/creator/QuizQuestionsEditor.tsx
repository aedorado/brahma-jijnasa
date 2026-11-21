'use client'

import { useState, useRef } from 'react'
import type { Quiz, Question } from '@/types/quiz'
import type { SupportedLang, EditorFormat } from './types'
import { LANG_CONFIG } from './utils'
import { FormattedText } from '@/components/FormattedText'

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
  editorFormat: EditorFormat
  onToggleEditorFormat: (format: EditorFormat) => void
  onDownloadMarkdown?: () => void
  onDownloadJson?: () => void
  isSlugDuplicate?: boolean
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
  editorFormat,
  onToggleEditorFormat,
  onDownloadMarkdown,
  onDownloadJson,
  isSlugDuplicate = false,
}: QuizQuestionsEditorProps) {
  const activeLangConfig = LANG_CONFIG.find(l => l.key === activeLang)
  const activeCount = parsedQuestions[activeLang]?.length || 0
  const [showFormattingGuide, setShowFormattingGuide] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertFormatting = (prefix: string, suffix: string, defaultText: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 1. Snapshot cursor and both internal & window scroll positions
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const savedTextareaScroll = textarea.scrollTop
    const savedWindowScroll = typeof window !== 'undefined' ? window.scrollY : 0

    const current = questionsRaw[activeLang] || ''
    const hasSelection = start !== end
    const rawSelected = hasSelection ? current.slice(start, end) : ''

    let replacement = ''
    let newCursorStart = start + prefix.length
    let newCursorEnd = start + prefix.length

    // Multiline handling for list items and blockquotes when selecting multiple lines
    if (hasSelection && (prefix === '- ' || prefix === '1. ' || prefix === '> ')) {
      const lines = rawSelected.split('\n')
      if (prefix === '- ') {
        replacement = lines.map(line => line.trim() ? `- ${line.replace(/^[-*•]\s+/, '')}` : line).join('\n')
      } else if (prefix === '1. ') {
        let num = 1
        replacement = lines.map(line => {
          if (!line.trim()) return line
          const cleaned = line.replace(/^\d+[\.\)]\s+/, '')
          return `${num++}. ${cleaned}`
        }).join('\n')
      } else if (prefix === '> ') {
        replacement = lines.map(line => line.trim() ? `> ${line.replace(/^>\s?/, '')}` : line).join('\n')
      }
      newCursorStart = start
      newCursorEnd = start + replacement.length
    } else {
      const selected = hasSelection ? rawSelected : defaultText
      replacement = `${prefix}${selected}${suffix}`
      newCursorStart = start + prefix.length
      newCursorEnd = start + prefix.length + selected.length
    }

    const updated = current.slice(0, start) + replacement + current.slice(end)
    onRawChange(updated)

    // 2. Restore focus, selection, and viewport scroll smoothly without jumping to the end
    requestAnimationFrame(() => {
      if (!textarea) return
      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(newCursorStart, newCursorEnd)
      textarea.scrollTop = savedTextareaScroll
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: savedWindowScroll, behavior: 'instant' as ScrollBehavior })
      }
    })
  }

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Questions Payload</h3>
            {/* Format Switcher */}
            <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: '0.2rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => onToggleEditorFormat('markdown')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: 6,
                  border: 'none',
                  background: editorFormat === 'markdown' ? 'var(--color-primary)' : 'transparent',
                  color: editorFormat === 'markdown' ? '#FFFFFF' : 'var(--color-muted)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📝</span> Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => onToggleEditorFormat('json')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: 6,
                  border: 'none',
                  background: editorFormat === 'json' ? 'var(--color-primary)' : 'transparent',
                  color: editorFormat === 'json' ? '#FFFFFF' : 'var(--color-muted)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>⚙️</span> JSON (.json)
              </button>
            </div>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            {editorFormat === 'markdown' ? (
              <>Authoring in <strong>Markdown</strong> mode with <code>## q1 | single-choice</code> and <code>- [x]</code> checkboxes. Rich formatting supported: <strong>bold</strong>, <em>italics</em>, lists, quotes, and newlines.</>
            ) : (
              <>Authoring in <strong>JSON</strong> mode with raw question schema <code>[&#123; "type": ... &#125;]</code>. Markdown strings supported in <code>question</code> and <code>explanation</code>.</>
            )}
          </p>
        </div>

        {/* Language Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-surface-2)', padding: '0.3rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          {LANG_CONFIG.map(l => {
            const count = parsedQuestions[l.key].length
            const isActive = activeLang === l.key
            const isOptional = l.key !== 'en'
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
                {isOptional && (
                  <span style={{ fontSize: '0.68rem', opacity: isActive ? 0.9 : 0.7, fontWeight: 500 }}>
                    (Optional)
                  </span>
                )}
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

      {/* Optional language notice banner */}
      {activeLang !== 'en' && (
        <div
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 8,
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
            color: 'var(--color-primary)',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <span style={{ fontSize: '1rem' }}>💡</span>
          <span>
            <strong>{activeLangConfig?.label || activeLang} questions are optional.</strong> You can leave this tab completely blank — devotees choosing {activeLangConfig?.label || activeLang} will seamlessly take the quiz in English!
          </span>
        </div>
      )}

      {/* Collapsible Formatting Cheat Sheet / Guide */}
      {showFormattingGuide && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1.1rem 1.25rem',
            borderRadius: 12,
            background: 'var(--color-surface-2)',
            border: '1.5px solid var(--color-border-gold)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>📖</span> Text Formatting Quick Guide & Cheatsheet
            </h4>
            <button
              type="button"
              onClick={() => setShowFormattingGuide(false)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', opacity: 0.8 }}
            >
              ✕ Close
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
            Formatting works automatically in <strong>Questions</strong>, <strong>Explanations</strong>, <strong>Scenarios</strong>, and <strong>Clues</strong> using intuitive Markdown:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '0.75rem',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.3rem' }}>Bold & Italics</div>
              <div><code>**bold text**</code> &rarr; <strong>bold text</strong></div>
              <div style={{ marginTop: '0.2rem' }}><code>*italic text*</code> &rarr; <em>italic text</em> (ideal for Sanskrit: <em>jīva</em>, <em>Bhagavad-gītā</em>)</div>
              <div style={{ marginTop: '0.2rem' }}><code>***bold + italic***</code> &rarr; <strong><em>bold + italic</em></strong></div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-gold)', marginBottom: '0.3rem' }}>Bullet & Numbered Lists</div>
              <div><code>- Item 1\n- Item 2</code> &rarr; • Item 1, • Item 2</div>
              <div style={{ marginTop: '0.2rem' }}><code>1. First\n2. Second</code> &rarr; 1. First, 2. Second</div>
              <div style={{ marginTop: '0.2rem', color: 'var(--color-muted)', fontSize: '0.74rem' }}>Indenting lines under items continues the list item.</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-accent-2)', marginBottom: '0.3rem' }}>Quotes & Key Terms</div>
              <div><code>&gt; Scriptural quote</code> &rarr; Shloka quote block callout</div>
              <div style={{ marginTop: '0.2rem' }}><code>`om tat sat`</code> &rarr; <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>om tat sat</code> badge</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.3rem' }}>Newlines & Paragraphs</div>
              <div>Single <code>Enter</code> (<code>\n</code>) &rarr; breaks onto new line (<code>&lt;br /&gt;</code>)</div>
              <div style={{ marginTop: '0.2rem' }}>Double <code>Enter</code> (<code>\n\n</code>) &rarr; separates into distinct paragraphs</div>
            </div>
          </div>
        </div>
      )}

      {/* Formatting Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.4rem',
          padding: '0.45rem 0.75rem',
          background: 'var(--color-surface-2)',
          borderRadius: '10px 10px 0 0',
          border: '1.5px solid var(--color-border)',
          borderBottom: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            Formatting:
          </span>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('**', '**', 'bold text')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontWeight: 800, fontSize: '0.78rem' }}
            title="Bold (**text**)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('*', '*', 'italic text')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontStyle: 'italic', fontSize: '0.78rem' }}
            title="Italic (*text*)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('***', '***', 'bold italic text')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontWeight: 800, fontStyle: 'italic', fontSize: '0.78rem' }}
            title="Bold + Italic (***text***)"
          >
            <em><strong>BI</strong></em>
          </button>
          <span style={{ width: '1px', height: '14px', background: 'var(--color-border)', margin: '0 0.15rem' }} />
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('- ', '', 'Bullet item')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontSize: '0.78rem' }}
            title="Bullet List (- item)"
          >
            • List
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('1. ', '', 'Numbered item')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontSize: '0.78rem' }}
            title="Numbered List (1. item)"
          >
            1. List
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('> ', '', 'Scriptural verse or quote')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontSize: '0.78rem' }}
            title="Verse / Quote (> quote)"
          >
            “ Quote
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertFormatting('`', '`', 'key-term')}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'unset', fontSize: '0.75rem', fontFamily: 'monospace' }}
            title="Key Term / Code (`term`)"
          >
            `Code`
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFormattingGuide(prev => !prev)}
          className="btn btn-ghost btn-sm"
          style={{
            padding: '0.2rem 0.55rem',
            height: 'auto',
            minHeight: 'unset',
            fontSize: '0.76rem',
            color: showFormattingGuide ? 'var(--color-gold)' : 'var(--color-muted)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: showFormattingGuide ? '1px solid var(--color-border-gold)' : '1px solid transparent',
          }}
        >
          <span>✨</span>
          <span>{showFormattingGuide ? 'Hide Formatting Guide' : 'Formatting Guide'}</span>
        </button>
      </div>

      {/* Textarea for Current Active Language */}
      <div style={{ marginBottom: '1.25rem' }}>
        <textarea
          ref={textareaRef}
          value={questionsRaw[activeLang]}
          onChange={e => onRawChange(e.target.value)}
          placeholder={
            activeLang !== 'en'
              ? `(Optional) Paste or type ${activeLangConfig?.label || activeLang} questions here.\n\nLeave this tab completely blank to have devotees automatically take the English version of this quiz.`
              : editorFormat === 'markdown'
                ? `Paste or type English questions in Markdown:\n\n## q1 | single-choice | easy\n\n**Q:** Which principle describes the eternal nature of the soul according to *Bhagavad-gītā* 2.20?\n\n**Options:**\n- [x] The soul is **unborn** (*ajaḥ*) and indestructible\n- [ ] The soul is created at physical birth\n- [ ] The soul dies when the physical body dies\n\n**Ref:** BG 2.20\n\n**Explanation:** In **Bhagavad-gītā 2.20**, Lord Krishna explains:\n> *na jāyate mriyate vā kadācin...*\nKey principles:\n- The soul is eternal (*śāśvataḥ*)\n- Weapons cannot harm it`
                : `Paste ONLY English questions array here:\n[\n  {\n    "type": "single-choice",\n    "question": "Which principle describes the soul according to *Bhagavad-gītā* 2.20?",\n    "options": ["The soul is **unborn** and eternal", "The soul is created at birth"],\n    "correctIndex": 0,\n    "explanation": "According to **Bhagavad-gītā 2.20**:\n- The soul is eternal\n- It undergoes no changes"\n  }\n]`
          }
          rows={12}
          className="input"
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '0 0 12px 12px',
            background: 'var(--color-surface-2)',
            border: parseError ? '1.5px solid var(--color-error)' : '1.5px solid var(--color-border)',
            borderTop: 'none',
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
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onValidate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <span>🔍</span> Clean & Validate {activeLangConfig?.label || activeLang} Questions {activeLang !== 'en' ? '(Optional)' : ''}
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

          {/* Export / Download Buttons */}
          {activeCount > 0 && onDownloadMarkdown && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onDownloadMarkdown}
              style={{ border: '1px solid var(--color-border)', fontSize: '0.78rem' }}
              title="Download entire quiz with metadata as Markdown (.md)"
            >
              📥 Export .md
            </button>
          )}
          {activeCount > 0 && onDownloadJson && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onDownloadJson}
              style={{ border: '1px solid var(--color-border)', fontSize: '0.78rem' }}
              title="Download entire quiz with metadata as JSON (.json)"
            >
              📥 Export .json
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

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={onPublish}
              disabled={publishing || (!isEditingExisting && isSlugDuplicate)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                opacity: (!isEditingExisting && isSlugDuplicate) ? 0.6 : 1,
                cursor: (!isEditingExisting && isSlugDuplicate) ? 'not-allowed' : 'pointer',
              }}
              title={(!isEditingExisting && isSlugDuplicate) ? 'Cannot publish: Slug already exists. Choose a unique slug.' : undefined}
            >
              <span>{isEditingExisting ? '💾' : '🚀'}</span> {publishing ? 'Saving...' : isEditingExisting ? 'Update Quiz in Supabase CMS' : 'Publish New Quiz to Supabase CMS'}
            </button>
            {!isEditingExisting && isSlugDuplicate && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-error, #ef4444)', fontWeight: 700 }}>
                ⚠️ Cannot publish: slug already in use.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
