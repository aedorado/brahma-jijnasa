'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { useQuizFocus } from '@/context/QuizFocusContext'
import { BookPurchaseModal } from '@/components/BookPurchaseModal'

export function Footer() {
  const { t } = useLanguage()
  const { isFocusMode } = useQuizFocus()
  const [showBookModal, setShowBookModal] = useState(false)

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Focus Mode / Zen Exam Mode: Slim 1-line footer matching examination screen
  if (isFocusMode) {
    return (
      <footer className="global-footer quiz-focus-footer">
        <div className="container">
          <div className="footer-bottom-bar" style={{ borderTop: 'none', paddingTop: 0 }}>
            <p className="footer-copy">
              © {new Date().getFullYear()} Brahma Jijñāsā · {t.footer?.rights || 'Sanātana Dharma Wisdom Platform'}
            </p>

            <button
              onClick={scrollToTop}
              className="footer-back-to-top"
              aria-label="Scroll back to top"
            >
              {t.footer?.backToTop || 'Back to Top ↑'}
            </button>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="global-footer">
      <div className="container">
        <div className="footer-top-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <Link href="/" className="footer-logo">
              <span className="footer-logo-main">Brahma Jijñāsā</span>
              <span className="footer-logo-sub">ब्रह्म जिज्ञासा</span>
            </Link>
            <p className="footer-sanskrit-quote">
              {t.footer?.motto || 'अथातो ब्रह्म जिज्ञासा'}
            </p>
            <p className="footer-tagline">
              {t.footer?.tagline ||
                'A sacred interactive platform for the inquiry and deep realization of Sanātana Dharma scriptures.'}
            </p>
          </div>

          {/* Scripture Series Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">{t.footer?.series || 'Scripture Series'}</h4>
            <ul className="footer-links-list">
              <li>
                <Link href="/series" className="footer-link">
                  {t.footer?.allSeries || 'Series Directory'}
                </Link>
              </li>
              <li>
                <Link href="/series/sacred-teachings-64-principles" className="footer-link">
                  {t.footer?.sixtyFourPrinciples || '64 Community Principles'}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowBookModal(true)}
                  className="footer-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--color-gold)',
                  }}
                >
                  <span>📖</span> 64 Principles Book & QR
                </button>
              </li>
              <li>
                <Link href="/#pin-entry" className="footer-link">
                  {t.footer?.livePin || 'Live Classroom Quiz'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Devotee Wisdom Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">{t.footer?.wisdom || 'Devotee Wisdom'}</h4>
            <ul className="footer-links-list">
              <li>
                <Link href="/leaderboard" className="footer-link">
                  {t.footer?.leaderboard || 'Global Leaderboard'}
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="footer-link">
                  {t.footer?.nineLevels || '9 Stages of Bhakti'}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="footer-link">
                  {t.footer?.profile || 'My Devotee Profile'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Dedication Banner */}
        <div className="footer-dedication-box">
          <p className="footer-dedication-text">
            🪷 {t.footer?.sacredDedication ||
              'Dedicated to the lotus feet of Śrīla Prabhupāda, Śrī Guru & the Paramparā, in service of all sincere seekers of transcendental knowledge.'}
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copy">
            © {new Date().getFullYear()} Brahma Jijñāsā · {t.footer?.rights || 'Sanātana Dharma Wisdom Platform'}
          </p>

          <button
            onClick={scrollToTop}
            className="footer-back-to-top"
            aria-label="Scroll back to top"
          >
            {t.footer?.backToTop || 'Back to Top ↑'}
          </button>
        </div>
      </div>
      <BookPurchaseModal isOpen={showBookModal} onClose={() => setShowBookModal(false)} />
    </footer>
  )
}
