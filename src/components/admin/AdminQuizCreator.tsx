'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Quiz, Question, Category } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'

interface AdminQuizCreatorProps {
  onQuizPublished: (quizId: string) => Promise<void>
  onSwitchToCatalog: () => void
}

export function AdminQuizCreator({ onQuizPublished, onSwitchToCatalog }: AdminQuizCreatorProps) {
  const [rawInput, setRawInput] = useState('')
  const [parsedQuiz, setParsedQuiz] = useState<Quiz | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [cleanLog, setCleanLog] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Smart parser: cleans markdown fences, fixes array-token glitches like [1][2], adds default properties
  const handleParseAndValidate = () => {
    setParseError(null)
    setCleanLog([])
    const logs: string[] = []

    if (!rawInput.trim()) {
      setParseError('Please paste your quiz JSON or AI output first.')
      return
    }

    try {
      // 1. Strip markdown fences ```json ... ```
      let cleaned = rawInput.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()
        logs.push('Removed markdown code fences')
      }

      // 2. Fix NotebookLM glitch: [1][2] -> [1, 2]
      const fixedArraySyntax = cleaned.replace(/\[\s*(\d+)\s*\]\s*\[\s*(\d+)\s*\]/g, '[$1, $2]')
      if (fixedArraySyntax !== cleaned) {
        cleaned = fixedArraySyntax
        logs.push('Auto-corrected NotebookLM array index syntax (e.g. [1][2] → [1, 2])')
      }

      // 3. Fix HTML entities
      cleaned = cleaned.replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')

      const json = JSON.parse(cleaned)

      if (!json.id) throw new Error('Missing top-level "id" string (e.g. "my-quiz-slug").')
      if (!json.title) throw new Error('Missing top-level "title" string.')
      if (!Array.isArray(json.questions) || json.questions.length === 0) {
        throw new Error('Missing or empty "questions" array.')
      }

      // 4. Ensure each question has a question prompt and sequential id
      json.questions = json.questions.map((q: Record<string, unknown>, idx: number) => {
        let questionText = typeof q.question === 'string' ? q.question : ''
        if (!questionText) {
          if (q.type === 'who-am-i') questionText = 'Who am I based on these clues?'
          else if (q.type === 'who-said-this') questionText = 'Who spoke these words?'
          else if (q.type === 'sequence') questionText = 'Arrange these events in chronological order:'
          else if (q.type === 'match-pairs') questionText = 'Match each item with its correct pair:'
          else if (q.type === 'assertion-reason') questionText = 'Evaluate the Assertion and Reason:'
          else if (q.type === 'spot-the-error') questionText = 'Identify the factual error in this passage:'
          else if (q.type === 'missing-link') questionText = 'Identify the missing link in this sequence:'
          else if (q.type === 'odd-one-out') questionText = 'Identify the item that does not belong with the others:'
          else if (q.type === 'two-truths-one-false') questionText = 'Which of the following three statements is FALSE?'
          else questionText = `Question #${idx + 1}`
        }

        return {
          ...q,
          id: typeof q.id === 'number' ? q.id : idx + 1,
          question: questionText,
          difficulty: typeof q.difficulty === 'string' ? q.difficulty : 'medium',
        }
      })

      if (!json.category) json.category = 'general'
      if (!json.timeLimit) json.timeLimit = 720
      if (!json.onTimeExpiry) json.onTimeExpiry = 'submit-partial'

      setParsedQuiz(json)
      setCleanLog(logs)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON syntax. Please check the pasted text.'
      setParseError(msg)
      setParsedQuiz(null)
    }
  }

  const handlePublish = async () => {
    if (!parsedQuiz) return
    setPublishing(true)
    setParseError(null)

    try {
      const res = await fetch('/api/admin/save-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedQuiz),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save quiz')

      setPublishedId(data.quizId)
      await onQuizPublished(data.quizId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error saving quiz.'
      setParseError(msg)
    } finally {
      setPublishing(false)
    }
  }

  const handleDownloadJson = () => {
    if (!parsedQuiz) return
    const blob = new Blob([JSON.stringify(parsedQuiz, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${parsedQuiz.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyLink = () => {
    if (!publishedId) return
    navigator.clipboard.writeText(`${window.location.origin}/q/${publishedId}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="animate-fadeIn">
      {/* Published Success Alert */}
      {publishedId && (
        <div
          className="card-gold animate-fadeIn"
          style={{
            padding: '1.75rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-success">🎉 Quiz Published Successfully</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Immediately live in library</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{parsedQuiz?.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                URL: <code style={{ color: 'var(--color-gold)' }}>/q/{publishedId}</code>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopyLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>{copiedLink ? '✓ Copied' : '🔗 Copy Student Link'}</span>
              </button>
              <Link
                href={`/q/${publishedId}`}
                target="_blank"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>👁 Play Test Quiz ↗</span>
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onSwitchToCatalog}
                style={{ border: '1px solid var(--color-border)' }}
              >
                Go to Catalog →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Creator Box */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Quiz Creator & Smart Importer</h2>
              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Zero-Git Studio</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Paste raw JSON or output from <strong>Google NotebookLM</strong>, <strong>Claude</strong>, or <strong>ChatGPT</strong>. The studio cleans glitches, validates against platform rules, and publishes instantly.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              href="/prompts/README.md"
              target="_blank"
              className="btn btn-ghost btn-xs"
              style={{ border: '1px solid var(--color-border)', padding: '0.4rem 0.75rem' }}
            >
              📖 View Master Prompts
            </Link>
          </div>
        </div>

        {/* Paste Textarea */}
        <div style={{ marginBottom: '1.25rem' }}>
          <textarea
            value={rawInput}
            onChange={e => {
              setRawInput(e.target.value)
              if (parseError) setParseError(null)
            }}
            placeholder='Paste your JSON or AI output here (e.g. {"id": "my-quiz", "title": "...", "questions": [...]})'
            rows={10}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: 12,
              background: 'rgba(0, 0, 0, 0.25)',
              border: parseError ? '1.5px solid var(--color-error)' : '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Error message */}
        {parseError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            ⚠️ {parseError}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleParseAndValidate}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <span>🔍</span> Clean & Validate Quiz
            </button>

            {rawInput && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setRawInput('')
                  setParsedQuiz(null)
                  setParseError(null)
                  setCleanLog([])
                }}
                style={{ border: '1px solid var(--color-border)' }}
              >
                Clear
              </button>
            )}
          </div>

          {parsedQuiz && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadJson}
                style={{ border: '1px solid var(--color-border)' }}
                title="Download .json file backup"
              >
                💾 Download JSON
              </button>
              <button
                className="btn btn-gold btn-sm"
                onClick={handlePublish}
                disabled={publishing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
              >
                <span>🚀</span> {publishing ? 'Publishing...' : 'Publish Quiz to Library'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Validation Breakdown & Question Inspector */}
      {parsedQuiz && (
        <div className="card" style={{ padding: '2rem' }}>
          {/* Header Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-gold">
                  {CATEGORY_ICONS[parsedQuiz.category as Category] || '📜'} {CATEGORY_LABELS[parsedQuiz.category as Category] || parsedQuiz.category}
                </span>
                <span className="badge badge-success">✅ Validated</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{parsedQuiz.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{parsedQuiz.description}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
                📝 {parsedQuiz.questions.length} Questions
              </span>
              <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
                ⏱️ {Math.round(parsedQuiz.timeLimit / 60)} mins
              </span>
              <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
                🔑 ID: {parsedQuiz.id}
              </span>
            </div>
          </div>

          {/* Auto-clean logs if any */}
          {cleanLog.length > 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(74, 222, 128, 0.08)', borderRadius: 8, border: '1px solid rgba(74, 222, 128, 0.2)', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#86efac' }}>
              <strong>Auto-adjustments applied:</strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
                {cleanLog.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Question List */}
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Question Preview ({parsedQuiz.questions.length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {parsedQuiz.questions.map((q: Question, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-gold)', fontSize: '0.85rem' }}>#{idx + 1}</span>
                    <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.type}</span>
                    <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.difficulty}</span>
                  </div>
                  {q.reference && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                      📖 {q.reference}
                    </span>
                  )}
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  {q.question}
                </p>

                {/* Question specific details */}
                {'options' in q && Array.isArray((q as { options?: string[] }).options) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {((q as { options: string[] }).options).map((opt: string, optIdx: number) => {
                      const singleMatch = 'correctIndex' in q && (q as { correctIndex?: number }).correctIndex === optIdx
                      const multiMatch = 'correctIndices' in q && Array.isArray((q as { correctIndices?: number[] }).correctIndices) && (q as { correctIndices: number[] }).correctIndices.includes(optIdx)
                      const isCorrect = singleMatch || multiMatch
                      return (
                        <div
                          key={optIdx}
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            background: isCorrect ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            border: isCorrect ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid var(--color-border)',
                            color: isCorrect ? '#86efac' : 'var(--color-text)',
                            fontWeight: isCorrect ? 600 : 400,
                          }}
                        >
                          {isCorrect ? '✓ ' : '• '} {opt}
                        </div>
                      )
                    })}
                  </div>
                )}

                {q.explanation && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic', marginTop: '0.3rem' }}>
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
