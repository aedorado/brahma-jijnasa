'use client'

import { useState } from 'react'
import type { Quiz, QuizMeta, Category } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'

interface AdminQuizCatalogProps {
  quizzes: QuizMeta[]
  onStartSession: (quizId: string) => Promise<void>
  starting: string | null
}

export function AdminQuizCatalog({ quizzes, onStartSession, starting }: AdminQuizCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Drawer preview
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleCopyLink = (quizId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/q/${quizId}`)
    setCopiedId(quizId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleInspectQuestions = async (quizId: string) => {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}`)
      if (res.ok) {
        setPreviewQuiz(await res.json())
      }
    } catch (e) {
      console.warn('Failed to load quiz details:', e)
    } finally {
      setLoadingPreview(false)
    }
  }

  const filteredQuizzes = quizzes.filter(q => {
    const matchCat = selectedCategory === 'all' || q.category === selectedCategory
    const qStr = searchQuery.toLowerCase().trim()
    const matchSearch = !qStr || q.title.toLowerCase().includes(qStr) || q.description.toLowerCase().includes(qStr) || q.id.toLowerCase().includes(qStr)
    return matchCat && matchSearch
  })

  const categories = ['all', 'puranas', 'bhagavad-gita', 'mahabharata', 'caitanya', 'upanishads', 'vedas', 'general']

  return (
    <div className="animate-fadeIn">
      {/* Search and Category Bar */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Master Quiz Catalog</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Showing {filteredQuizzes.length} of {quizzes.length} quizzes in library
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by title, shastra, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
                minWidth: 260,
              }}
            />

            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                className={`btn btn-xs ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('cards')}
                style={{ padding: '0.4rem 0.6rem' }}
                title="Card View"
              >
                🪟 Cards
              </button>
              <button
                className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
                style={{ padding: '0.4rem 0.6rem' }}
                title="Table View"
              >
                📋 Table
              </button>
            </div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-xs ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '9999px',
                padding: '0.35rem 0.8rem',
                fontSize: '0.78rem',
                border: selectedCategory === cat ? undefined : '1px solid var(--color-border)',
              }}
            >
              {cat === 'all' ? '✨ All Scripture' : `${CATEGORY_ICONS[cat as Category] || '📜'} ${CATEGORY_LABELS[cat as Category] || cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredQuizzes.map(quiz => (
            <div
              key={quiz.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                    {CATEGORY_ICONS[quiz.category] || '📜'} {CATEGORY_LABELS[quiz.category] || quiz.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {quiz.totalQuestions} Questions
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.35 }}>
                  {quiz.title}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {quiz.description}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <button
                    className="btn btn-ghost btn-xs w-full"
                    onClick={() => handleInspectQuestions(quiz.id)}
                    style={{ border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>👁</span> Preview ({quiz.totalQuestions})
                  </button>

                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleCopyLink(quiz.id)}
                    style={{ border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}
                  >
                    {copiedId === quiz.id ? '✓ Copied' : '🔗 Link'}
                  </button>
                </div>

                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={() => onStartSession(quiz.id)}
                  disabled={starting === quiz.id}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>⚡</span> {starting === quiz.id ? 'Starting...' : 'Start Live Classroom Session'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Title & Description</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Questions</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Difficulty</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuizzes.map(quiz => (
                  <tr key={quiz.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{quiz.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{quiz.description}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                        {quiz.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {quiz.totalQuestions}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className="text-muted" style={{ textTransform: 'capitalize' }}>{quiz.difficulty}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleInspectQuestions(quiz.id)}
                          style={{ border: '1px solid var(--color-border)' }}
                        >
                          👁 Preview
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleCopyLink(quiz.id)}
                          style={{ border: '1px solid var(--color-border)' }}
                        >
                          {copiedId === quiz.id ? '✓ Copied' : '🔗'}
                        </button>
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => onStartSession(quiz.id)}
                          disabled={starting === quiz.id}
                        >
                          ⚡ Live
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUESTION PREVIEW DRAWER */}
      {previewQuiz && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setPreviewQuiz(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              height: '100%',
              background: 'var(--color-bg)',
              borderLeft: '1px solid var(--color-border)',
              padding: '2rem',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                  {previewQuiz.category}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{previewQuiz.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{previewQuiz.description}</p>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPreviewQuiz(null)}
                style={{ fontSize: '1.2rem', padding: '0.2rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {previewQuiz.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="card"
                  style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontSize: '0.85rem' }}>
                      Q{idx + 1} • {q.type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {q.points} pts
                    </span>
                  </div>

                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                    {q.question}
                  </p>

                  {q.reference && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-gold)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                      📖 {q.reference}
                    </p>
                  )}

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8 }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
