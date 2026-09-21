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

      {/* Features */}
      <section style={{ padding: '2rem 0 5rem' }}>
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
