'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, login } = useAuth()
  const { t } = useLanguage()
  const supabase = createClient()

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { setError('Please enter a 4-digit PIN'); return }
    setLoading(true)
    setError('')

    // Check if session exists and is active
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('pin', pin)
      .eq('is_active', true)
      .single()

    if (!session) {
      setError('No active quiz found with this PIN. Ask your teacher.')
      setLoading(false)
      return
    }

    // Check if user is logged in
    if (!user) {
      login(`/session/${pin}`)
      return
    }

    router.push(`/session/${pin}`)
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
    if (error) setError('')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ padding: '5rem 0 4rem', textAlign: 'center' }}>
        <div className="container-sm z-above">
          {/* Om symbol */}
          <div
            className="animate-diya"
            style={{
              fontSize: '4rem',
              marginBottom: '1.5rem',
              display: 'inline-block',
              filter: 'drop-shadow(0 0 20px rgba(242,128,20,0.5))',
            }}
          >
            🕉️
          </div>

          <div className="animate-fadeIn">
            <p className="sanskrit" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              {t.home.sanskritQuote}
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem', fontStyle: 'italic' }}>
              {t.home.sanskritMeaning}
            </p>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.1 }}>
              {t.home.heroTitle}{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {t.home.heroTitleHighlight}
              </span>
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: 520, margin: '0 auto 3rem', lineHeight: 1.6 }}>
              {t.home.heroSubtitle}
            </p>
          </div>

          {/* PIN entry card */}
          <div
            className="card-gold animate-scaleIn"
            style={{ padding: '2.5rem 2rem', maxWidth: 400, margin: '0 auto', animationDelay: '0.15s' }}
          >
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', textAlign: 'center', fontWeight: 700 }}>
              {t.home.joinLiveQuiz}
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              {t.home.enterPinPrompt}
            </p>

            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <input
                id="pin-entry"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                className="pin-input"
                placeholder="0000"
                value={pin}
                onChange={handlePinChange}
                autoFocus
                autoComplete="off"
              />

              {error && (
                <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                id="join-quiz-btn"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || pin.length !== 4}
              >
                {loading ? t.home.checkingPin : t.home.enterInquiryBtn}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Featured Quizzes (Direct Link — No PIN Needed) */}
      <section style={{ padding: '1rem 0 3rem' }}>
        <div className="container-sm" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>{t.home.directAccess}</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{t.home.featuredTitle}</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {t.home.featuredSubtitle}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sample Mahābhārata Variety Demo Card */}
            <div
              className="card-gold"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(232,192,69,0.12), rgba(242,128,20,0.08))',
                border: '1.5px solid var(--color-border-gold)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
                    ✨ Special Interactive Variety Demo • 20 Questions
                  </span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--color-gold)' }}>
                    Mahābhārata — Variety Demo
                  </h3>
                  <p style={{ color: 'var(--color-lotus)', fontSize: '0.9rem', maxWidth: 520, lineHeight: 1.6 }}>
                    Full interactive showcase covering Single-choice MCQ, Multi-select, True/False, Who Am I?, Match Pairs, Chronology, Cause-Effect, Odd One Out, Assertion-Reason, Spot the Error, Two Truths One False, and Dharmic Dilemmas.
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-gold)', fontWeight: 700 }}>20 Questions</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>⏱️ 15 min</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                <span className="badge badge-accent">16 Question Types</span>
                <span className="badge">MCQ</span>
                <span className="badge">Match Pairs</span>
                <span className="badge">Who Am I?</span>
                <span className="badge">Dharmic Dilemmas</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <a
                  href="/q/mahabharata-variety-demo"
                  id="start-variety-demo-quiz-btn"
                  className="btn btn-gold btn-lg"
                  style={{ textDecoration: 'none', padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 700 }}
                >
                  🚀 Try Sample Quiz Now →
                </a>
              </div>
            </div>

            {/* Mahābhārata Quiz Card */}
            <div
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className="badge badge-saffron" style={{ marginBottom: '0.5rem' }}>
                    🏹 Mahābhārata • Purnaprajna Dasa
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.25rem 0' }}>
                    Mahābhārata — Authentic Presentation
                  </h3>
                  <p style={{ color: 'var(--color-lotus)', fontSize: '0.88rem', maxWidth: 480, lineHeight: 1.6 }}>
                    20 deep-dive questions testing pastimes, celestial origins, ethical quandaries, Vidura-nīti, and real-life case study applications.
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>20 {t.home.questionsCount}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>⏱️ 15 {t.home.minsLimit}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                <span className="badge">MCQ</span>
                <span className="badge">Multi-Select</span>
                <span className="badge">True/False</span>
                <span className="badge">Case Studies</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <a
                  href="/q/mahabharata-authentic-01"
                  id="start-mahabharata-quiz-btn"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                >
                  {t.home.startMahabharata}
                </a>
              </div>
            </div>

            {/* Bhagavad Gītā Quiz Card */}
            <div
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
                    📿 Bhagavad Gītā
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>
                    Bhagavad Gītā — Core Teachings
                  </h3>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', maxWidth: 460 }}>
                    Karma, dharma, ātmā, and the nature of Brahman with authentic Sanskrit verses and translations.
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>10 {t.home.questionsCount}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>⏱️ 10 {t.home.minsLimit}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <a
                  href="/q/bhagavad-gita-core-01"
                  id="start-gita-quiz-btn"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  {t.home.startGita}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '3rem 0 5rem' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: '📜', title: t.home.features.scripture, desc: t.home.features.scriptureDesc },
              { icon: '🎯', title: t.home.features.types, desc: t.home.features.typesDesc },
              { icon: '🏆', title: t.home.features.leaderboard, desc: t.home.features.leaderboardDesc },
              { icon: '📖', title: t.home.features.learn, desc: t.home.features.learnDesc },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem', fontWeight: 600 }}>{f.title}</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
