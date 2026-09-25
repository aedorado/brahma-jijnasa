'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    setLoading(true)
    setError('')

    // Special Sandbox PIN: Always live for testing (000 or 0000)
    if (pin === '000' || pin === '0000') {
      if (!user) {
        login(`/session/${pin}`)
        return
      }
      router.push(`/session/${pin}`)
      return
    }

    if (pin.length !== 4) {
      setError(t.home.enter4DigitPinError || 'Please enter a 4-digit PIN')
      setLoading(false)
      return
    }

    // Check if session exists and is active
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('pin', pin)
      .eq('is_active', true)
      .single()

    if (!session) {
      setError(t.home.noActiveSessionError || 'No active quiz found with this PIN. Ask your teacher.')
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
    <div className="home-wrapper">
      {/* Background ambient lighting */}
      <div className="home-ambient-glow" />

      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="container">
          <div className="home-hero-inner animate-fadeIn">
            {/* Vedic Sutra Pill */}
            <div className="home-sutra-badge">
              <span className="home-sutra-ref">Vedānta-Sūtra 1.1.1</span>
            </div>

            <p className="sanskrit home-sutra-quote">
              {t.home.sanskritQuote}
            </p>
            <p className="home-sutra-meaning">
              {t.home.sanskritMeaning}
            </p>

            <h1 className="home-title">
              {t.home.heroTitle}{' '}
              <span className="home-title-gradient">
                {t.home.heroTitleHighlight}
              </span>
            </h1>

            <p className="home-subtitle">
              {t.home.heroSubtitle}
            </p>

            {/* Platform Highlights Metrics Bar */}
            <div className="home-stats-bar">
              <div className="home-stat-item">
                <span className="home-stat-value">30+</span>
                <span className="home-stat-label">{t.home.statsDailyRounds || 'Daily Rounds'}</span>
              </div>
              <div className="home-stat-divider" />
              <div className="home-stat-item">
                <span className="home-stat-value">16</span>
                <span className="home-stat-label">{t.home.statsInteractiveFormats || 'Interactive Formats'}</span>
              </div>
              <div className="home-stat-divider" />
              <div className="home-stat-item">
                <span className="home-stat-value">9</span>
                <span className="home-stat-label">{t.home.statsBhaktiStages || 'Bhakti Stages'}</span>
              </div>
              <div className="home-stat-divider" />
              <div className="home-stat-item">
                <span className="home-stat-value">3</span>
                <span className="home-stat-label">{t.home.statsLanguages || 'Languages'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Pathways Grid: Live PIN vs Featured Sadhana Series */}
      <section className="home-pathways-section">
        <div className="container">
          <div className="home-pathways-grid">
            {/* Pathway 1: Live PIN Session Entry */}
            <div className="card-gold home-pathway-card home-pin-card animate-scaleIn">
              <div className="home-pathway-header">
                <div className="home-card-icon-badge">⚡</div>
                <div>
                  <h2 className="home-pathway-title">{t.home.joinLiveQuiz}</h2>
                  <p className="home-pathway-subtitle">{t.home.enterPinPrompt}</p>
                </div>
              </div>

              <form onSubmit={handlePinSubmit} className="home-pin-form">
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
                  autoComplete="off"
                />

                {error && (
                  <p className="home-pin-error">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  id="join-quiz-btn"
                  className="btn btn-primary btn-lg w-full"
                  disabled={loading || (pin.length !== 4 && pin !== '000')}
                >
                  {loading ? t.home.checkingPin : t.home.enterInquiryBtn}
                </button>

                <button
                  type="button"
                  onClick={() => setPin('0000')}
                  id="sandbox-pin-hint-btn"
                  className="home-demo-pin-btn"
                >
                  <span>{t.home.testRoundHint || '✨ Want to take a test round? Try PIN 0000'}</span>
                </button>
              </form>
            </div>

            {/* Pathway 2: Featured Sadhana Series Spotlight */}
            <div className="card-gold home-pathway-card home-series-card animate-scaleIn">
              <div className="home-series-card-top">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                    {t.home.featuredSeriesBadge || '🌟 Featured Series'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {t.home.thirtyDailyRounds || '30 Daily Sadhana Rounds'}
                  </span>
                </div>

                <h3 className="home-series-title">
                  {t.home.reflectionsTitle || 'Reflections on Sacred Teachings'}
                </h3>
                <p className="home-series-subheading">
                  {t.home.reflectionsSubtitle || 'Principles for Community (1–30)'}
                </p>

                <p className="home-series-desc">
                  {t.home.reflectionsDesc || 'Immerse in Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura’s sacred community principles from Reflections on Sacred Teachings V by His Holiness Bhakti Tirtha Swami.'}
                </p>
              </div>

              <div className="home-series-actions">
                <Link
                  href="/series/sacred-teachings-64-principles"
                  className="btn btn-primary"
                  id="explore-series-btn"
                >
                  <span>{t.series?.exploreSeries || 'Explore Series →'}</span>
                </Link>
                <Link
                  href="/series"
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--color-border)' }}
                  id="view-all-series-btn"
                >
                  <span>{t.nav.allSeries || 'All Series'}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scriptural Spotlight: BG 4.34 */}
      <section className="home-spotlight-section">
        <div className="container-sm">
          <div className="home-shloka-card animate-fadeIn">
            <div className="home-shloka-header">
              <span className="home-shloka-badge">Śrīmad Bhagavad Gītā 4.34</span>
              <span className="home-shloka-theme">{t.home.bgShlokaTheme || 'The Spirit of Inquiry'}</span>
            </div>
            <p className="sanskrit home-shloka-sanskrit">
              तद्विद्धि प्रणिपातेन परिप्रश्नेन सेवया।<br />
              उपदेक्ष्यन्ति ते ज्ञानं ज्ञानिनस्तत्त्वदर्शिनः॥
            </p>
            <p className="home-shloka-translation">
              {t.home.bgShlokaTranslation || '"Just try to learn the truth by approaching a spiritual master. Inquire from him submissively and render service unto him. The self-realized souls can impart knowledge unto you because they have seen the truth."'}
            </p>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="home-features-section">
        <div className="container">
          <div className="home-features-grid">
            {[
              {
                icon: '📜',
                title: t.home.features.scripture,
                desc: t.home.features.scriptureDesc,
              },
              {
                icon: '🎯',
                title: t.home.features.types,
                desc: t.home.features.typesDesc,
              },
              {
                icon: '🏆',
                title: t.home.features.leaderboard,
                desc: t.home.features.leaderboardDesc,
              },
              {
                icon: '💡',
                title: t.home.features.learn,
                desc: t.home.features.learnDesc,
              },
            ].map(f => (
              <div key={f.title} className="card home-feature-card">
                <div className="home-feature-icon">{f.icon}</div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
