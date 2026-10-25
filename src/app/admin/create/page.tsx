'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import type { Quiz, QuizMeta } from '@/types/quiz'
import { AdminQuizCreator } from '@/components/admin/AdminQuizCreator'
import { AdminDryRunModal } from '@/components/admin/AdminDryRunModal'

function AdminCreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editParam = searchParams.get('edit')

  const { user, loading: authLoading } = useAuth()
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dryRunQuiz, setDryRunQuiz] = useState<Quiz | null>(null)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(editParam || null)

  // Sync editingQuizId when URL parameter changes
  useEffect(() => {
    setEditingQuizId(editParam || null)
  }, [editParam])

  // Auth gate
  useEffect(() => {
    if (authLoading) return
    if (!user || (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'creator')) {
      router.push('/')
      return
    }

    const loadData = async () => {
      try {
        const res = await fetch('/api/quizzes')
        if (res.ok) {
          setQuizzes(await res.json())
        }
      } catch (e) {
        console.warn('Error loading quizzes:', e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authLoading, user, router])

  const handleRefreshQuizzes = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) setQuizzes(await res.json())
    } finally {
      setTimeout(() => setRefreshing(false), 300)
    }
  }

  const handleStartDryRun = (quiz: Quiz) => {
    setDryRunQuiz(quiz)
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-gold" />
        <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading Creator Studio...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', minHeight: '85vh' }}>
      {/* Top Header / Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Link
              href="/admin"
              className="text-muted hover:text-gold"
              style={{ fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              Admin Hub
            </Link>
            <span style={{ color: 'var(--color-border)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>
              ✨ Quiz Creator Studio
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>{editingQuizId ? '✏️ Edit Quiz' : '✨ Quiz Creator Studio'}</span>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', verticalAlign: 'middle' }}>
              Direct Route
            </span>
          </h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            {editingQuizId
              ? `Currently editing quiz: "${editingQuizId}". Changes save directly to the database.`
              : 'Compose new multilingual quizzes, parse markdown questions, and publish to the live library.'}
          </p>
        </div>

        {/* Quick Nav Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefreshQuizzes}
            disabled={refreshing}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.82rem' }}
            title="Refresh quiz catalog"
          >
            <span style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            {refreshing ? 'Updating...' : 'Refresh Quizzes'}
          </button>

          <Link
            href="/admin?tab=catalog"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.82rem', textDecoration: 'none' }}
          >
            📑 Quiz Library
          </Link>

          <Link
            href="/admin?tab=series"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.82rem', textDecoration: 'none' }}
          >
            📚 64 Principles Series
          </Link>

          <Link
            href="/admin"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.82rem', textDecoration: 'none' }}
          >
            ← Admin Dashboard
          </Link>
        </div>
      </div>

      {/* Main Studio Component */}
      <AdminQuizCreator
        editingQuizId={editingQuizId}
        onClearEditingQuiz={() => {
          setEditingQuizId(null)
          router.replace('/admin/create')
        }}
        catalogQuizzes={quizzes}
        onQuizPublished={async () => {
          await handleRefreshQuizzes()
        }}
        onSwitchToCatalog={() => {
          router.push('/admin?tab=catalog')
        }}
        onDryRunQuiz={handleStartDryRun}
      />

      {/* DRY RUN MODAL */}
      {dryRunQuiz && (
        <AdminDryRunModal
          quiz={dryRunQuiz}
          onClose={() => setDryRunQuiz(null)}
        />
      )}
    </div>
  )
}

export default function AdminCreatePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner-gold" />
          <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading Creator Studio...</p>
        </div>
      }
    >
      <AdminCreateContent />
    </Suspense>
  )
}
