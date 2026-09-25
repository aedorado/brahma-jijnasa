'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import type { Quiz, QuizMeta, QuizSession } from '@/types/quiz'
import { AdminLiveRoom, type LiveEntry } from '@/components/admin/AdminLiveRoom'
import { AdminSeriesManager } from '@/components/admin/AdminSeriesManager'
import { AdminQuizCatalog } from '@/components/admin/AdminQuizCatalog'
import { AdminAnalytics, type AttemptRecord } from '@/components/admin/AdminAnalytics'
import { AdminQuizCreator } from '@/components/admin/AdminQuizCreator'

type AdminPillar = 'live' | 'series' | 'catalog' | 'analytics' | 'create'

export default function AdminPage() {
  const [activePillar, setActivePillar] = useState<AdminPillar>('live')
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [activeSessions, setActiveSessions] = useState<QuizSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [liveStats, setLiveStats] = useState<{ joined: number; completed: number; entries: LiveEntry[] }>({
    joined: 0,
    completed: 0,
    entries: [],
  })
  const [allAttempts, setAllAttempts] = useState<AttemptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [quizDetailsCache, setQuizDetailsCache] = useState<Record<string, Quiz>>({})

  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const loadQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) setQuizzes(await res.json())
    } catch (e) {
      console.warn('Error loading quizzes:', e)
    }
  }

  const loadActiveSessions = async () => {
    try {
      const { data } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
      
      const list = data || []
      setActiveSessions(list)
      if (list.length > 0) {
        setSelectedSessionId(prev => (list.some(s => s.id === prev) ? prev : list[0].id))
      } else {
        setSelectedSessionId(null)
      }
    } catch {
      // ignore
    }
  }

  const loadAllAttempts = async () => {
    try {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*, profiles(full_name, avatar_url, email)')
        .order('completed_at', { ascending: false })

      if (data) {
        const uniqueAttempts: AttemptRecord[] = []
        const seen = new Set<string>()
        for (const att of (data as AttemptRecord[])) {
          const key = att.session_id ? `${att.user_id}_${att.session_id}` : att.id
          if (seen.has(key)) continue
          seen.add(key)
          uniqueAttempts.push(att)
        }
        setAllAttempts(uniqueAttempts)
      }
    } catch (e) {
      console.warn('Error loading attempts:', e)
    }
  }

  const loadLiveStats = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, max_score, time_taken, profiles(full_name, avatar_url)')
        .eq('session_id', sessionId)
        .order('score', { ascending: false })
        .order('time_taken', { ascending: true, nullsFirst: false })

      if (data) {
        const uniqueEntries: LiveEntry[] = []
        const seenUsers = new Set<string>()

        for (const d of (data as any[])) {
          if (seenUsers.has(d.user_id)) continue
          seenUsers.add(d.user_id)
          uniqueEntries.push({
            user_id: d.user_id,
            full_name: d.profiles?.full_name || 'Anonymous Student',
            avatar_url: d.profiles?.avatar_url || null,
            score: d.score,
            max_score: d.max_score,
            time_taken: d.time_taken,
          })
        }

        // Tie-breaker: Highest score first; if equal, lowest time_taken first
        uniqueEntries.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          const timeA = (a.time_taken != null && a.time_taken > 0) ? a.time_taken : Number.MAX_SAFE_INTEGER
          const timeB = (b.time_taken != null && b.time_taken > 0) ? b.time_taken : Number.MAX_SAFE_INTEGER
          return timeA - timeB
        })

        setLiveStats({
          joined: uniqueEntries.length,
          completed: uniqueEntries.length,
          entries: uniqueEntries,
        })
      }
    } catch (err) {
      console.warn('Error loading live stats:', err)
    }
  }

  const fetchQuizDetails = async (quizId: string) => {
    if (quizDetailsCache[quizId]) return
    try {
      const res = await fetch(`/api/quiz/${quizId}`)
      if (res.ok) {
        const data = await res.json()
        setQuizDetailsCache(prev => ({ ...prev, [quizId]: data }))
      }
    } catch (e) {
      console.warn('Failed to load quiz details:', e)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      loadQuizzes(),
      loadActiveSessions(),
      loadAllAttempts(),
      selectedSessionId ? loadLiveStats(selectedSessionId) : Promise.resolve(),
    ])
    setTimeout(() => setRefreshing(false), 400)
  }

  // Auth gate
  useEffect(() => {
    if (authLoading) return
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      router.push('/')
      return
    }

    const init = async () => {
      await Promise.all([loadQuizzes(), loadActiveSessions(), loadAllAttempts()])
      setLoading(false)
    }
    init()
  }, [authLoading, user])

  // Realtime subscription + auto-polling for the selected live session
  useEffect(() => {
    if (!selectedSessionId) {
      setLiveStats({ joined: 0, completed: 0, entries: [] })
      return
    }
    loadLiveStats(selectedSessionId)

    const interval = setInterval(() => {
      loadLiveStats(selectedSessionId)
      loadAllAttempts()
    }, 3500)

    const channel = supabase
      .channel(`realtime_session_${selectedSessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_attempts' },
        () => {
          loadLiveStats(selectedSessionId)
          loadAllAttempts()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [selectedSessionId])

  const startSession = async (quizId: string) => {
    // Check if session for this quiz is already active
    const existing = activeSessions.find(s => s.quiz_id === quizId && s.is_active)
    if (existing) {
      const shouldGoToExisting = confirm(
        `A live room is already active for this quiz with PIN ${existing.pin}!\n\nClick OK to open the existing room.\nClick Cancel if you want to start a new, additional room.`
      )
      if (shouldGoToExisting) {
        setSelectedSessionId(existing.id)
        setActivePillar('live')
        return
      }
    }

    setStarting(quizId)
    const pin = String(Math.floor(1000 + Math.random() * 9000))

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        pin,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('one_active_session')) {
        const confirmEnd = confirm(
          'Another quiz session is already active in your database. Would you like to end the previous session and start this new one?\n\n(Tip: Run migration 003 to allow multiple sessions to run simultaneously!)'
        )
        if (confirmEnd) {
          // Deactivate previous active session(s)
          await supabase
            .from('quiz_sessions')
            .update({ is_active: false, ended_at: new Date().toISOString() })
            .eq('is_active', true)

          // Retry starting the session
          const { data: retryData, error: retryError } = await supabase
            .from('quiz_sessions')
            .insert({
              quiz_id: quizId,
              pin,
              created_by: user?.id,
            })
            .select()
            .single()

          if (retryError) {
            alert(`Could not start session: ${retryError.message}`)
          } else {
            await loadActiveSessions()
            if (retryData?.id) setSelectedSessionId(retryData.id)
            setActivePillar('live')
          }
        }
      } else {
        alert(`Could not start session: ${error.message}`)
      }
    } else {
      await loadActiveSessions()
      if (data?.id) setSelectedSessionId(data.id)
      setActivePillar('live')
    }
    setStarting(null)
  }

  const endSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this live session? Devotees in this room will no longer be able to submit.')) return
    await supabase
      .from('quiz_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    await loadActiveSessions()
    await loadAllAttempts()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div className="spinner-gold" />
          <p className="text-muted" style={{ marginTop: '1rem' }}>Loading Admin & Teacher Control Center...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Admin & Teacher Control Center</h1>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                {user?.role === 'admin' ? '👑 Admin' : '⚡ Teacher'}
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Manage live classroom sessions, 30-day series campaigns, quiz libraries, and devotee diagnostics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
            <Link href="/" className="btn btn-ghost btn-sm">
              ← View Quizzes
            </Link>
          </div>
        </div>

        {/* 5-Pillar Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.75rem',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActivePillar('live')}
            className={`btn btn-sm ${activePillar === 'live' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
            id="admin-pillar-live"
          >
            <span>⚡</span> Live Rooms
            {activeSessions.length > 0 && (
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                {activeSessions.length} Live
              </span>
            )}
          </button>

          <button
            onClick={() => setActivePillar('series')}
            className={`btn btn-sm ${activePillar === 'series' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
            id="admin-pillar-series"
          >
            <span>📚</span> 64 Principles Series
            <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
              Kārtika
            </span>
          </button>

          <button
            onClick={() => setActivePillar('catalog')}
            className={`btn btn-sm ${activePillar === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
            id="admin-pillar-catalog"
          >
            <span>📑</span> Quiz Library
            <span className="badge badge-ghost" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
              {quizzes.length}
            </span>
          </button>

          <button
            onClick={() => setActivePillar('analytics')}
            className={`btn btn-sm ${activePillar === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
            id="admin-pillar-analytics"
          >
            <span>📊</span> Analytics & Grading
            <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
              {allAttempts.length}
            </span>
          </button>

          <button
            onClick={() => setActivePillar('create')}
            className={`btn btn-sm ${activePillar === 'create' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 10 }}
            id="admin-pillar-create"
          >
            <span>✨</span> Create Quiz
          </button>
        </div>

        {/* PILLAR 1: LIVE CLASSROOM ROOM */}
        {activePillar === 'live' && (
          <AdminLiveRoom
            activeSessions={activeSessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={id => setSelectedSessionId(id)}
            liveStats={liveStats}
            quizzes={quizzes}
            onStartSession={startSession}
            onEndSession={endSession}
            starting={starting}
          />
        )}

        {/* PILLAR 2: SERIES & 64 PRINCIPLES CAMPAIGN */}
        {activePillar === 'series' && (
          <AdminSeriesManager
            onSessionStarted={async () => {
              await loadActiveSessions()
              setActivePillar('live')
            }}
          />
        )}

        {/* PILLAR 3: MASTER QUIZ CATALOG */}
        {activePillar === 'catalog' && (
          <AdminQuizCatalog
            quizzes={quizzes}
            activeSessions={activeSessions}
            onStartSession={startSession}
            onSelectSession={(sessionId) => {
              setSelectedSessionId(sessionId)
              setActivePillar('live')
            }}
            starting={starting}
            onOpenCreator={() => setActivePillar('create')}
          />
        )}

        {/* PILLAR 4: ANALYTICS & GRADING */}
        {activePillar === 'analytics' && (
          <AdminAnalytics
            allAttempts={allAttempts}
            quizzes={quizzes}
            quizDetailsCache={quizDetailsCache}
            onFetchQuizDetails={fetchQuizDetails}
          />
        )}

        {/* PILLAR 5: QUIZ CREATOR STUDIO */}
        {activePillar === 'create' && (
          <AdminQuizCreator
            onQuizPublished={async (quizId) => {
              await loadQuizzes()
            }}
            onSwitchToCatalog={() => setActivePillar('catalog')}
          />
        )}
      </div>
    </div>
  )
}
