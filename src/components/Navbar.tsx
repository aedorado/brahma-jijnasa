'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useQuizFocus } from '@/context/QuizFocusContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { UserAvatar } from '@/components/UserAvatar'
import { getTheme, setTheme } from '@/lib/session-storage'

export function Navbar() {
  const { user, loading, login, logout } = useAuth()
  const { t } = useLanguage()
  const { isFocusMode, focusTitle, exitFocusMode } = useQuizFocus()
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setThemeState] = useState<'dark' | 'light'>('light')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    setTheme(next)
  }

  // Focus Mode Header: Minimal, distraction-free examination view
  if (isFocusMode) {
    return (
      <header className="navbar navbar-focus-mode">
        <div className="container">
          <div className="focus-navbar-inner">
            {/* Left: Brand Logo */}
            <div className="focus-navbar-left">
              <Link
                href="/"
                className="navbar-logo"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                onClick={(e) => {
                  if (!confirm('Are you sure you want to leave the quiz? Your in-progress timer is running.')) {
                    e.preventDefault()
                  } else {
                    exitFocusMode()
                  }
                }}
              >
                <span className="navbar-logo-main focus-logo-desktop" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                  Brahma Jijñāsā
                </span>
                <span className="navbar-logo-main focus-logo-mobile">
                  🪷 BJ
                </span>
              </Link>
            </div>

            {/* Center: Quiz Title Badge (spans naturally on desktop without premature truncation) */}
            <div className="focus-navbar-center">
              <div className="focus-badge" title={focusTitle || 'Sacred Focus Mode'}>
                <span style={{ flexShrink: 0, fontSize: '0.9rem' }}>🧘</span>
                <span className="focus-badge-title">
                  {focusTitle || 'Focus Mode'}
                </span>
              </div>
            </div>

            {/* Right: Language Selector + Theme Toggle + Exit Button */}
            <div className="focus-navbar-right">
              <LanguageSelector />

              <button
                className="theme-toggle"
                onClick={handleThemeToggle}
                aria-label={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
                title={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to exit the quiz? Your in-progress timer is running.')) {
                    exitFocusMode()
                    router.push('/')
                  }
                }}
                className="quiz-exit-btn"
                title="Exit quiz and return to home"
              >
                <span className="quiz-exit-label-full">✕ Exit</span>
                <span className="quiz-exit-label-mobile">✕</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  const isQuizzesActive = pathname === '/quizzes'
  const isSeriesActive = pathname?.startsWith('/series')
  const isLeaderboardActive = pathname === '/leaderboard'

  return (
    <header className="navbar">
      <div className="container">
        <div className="navbar-inner">
          {/* Brand & Main Nav Links */}
          <div className="navbar-left">
            <Link href="/" className="navbar-logo">
              <span className="navbar-logo-main">Brahma Jijñāsā</span>
              <span className="navbar-logo-sub">ब्रह्म जिज्ञासा</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="navbar-nav-desktop" aria-label="Main Navigation">
              <Link
                href="/quizzes"
                className={`navbar-nav-link ${isQuizzesActive ? 'active' : ''}`}
                id="nav-quizzes-link"
              >
                <span style={{ color: '#4ade80', marginRight: '0.25rem' }}>⚡</span>
                {t.nav.liveQuizzes || 'Live Quizzes'}
              </Link>
              <Link
                href="/series"
                className={`navbar-nav-link ${isSeriesActive ? 'active' : ''}`}
                id="nav-series-link"
              >
                {t.nav.allSeries || 'Series'}
              </Link>
              <Link
                href="/leaderboard"
                className={`navbar-nav-link ${isLeaderboardActive ? 'active' : ''}`}
                id="nav-leaderboard-link"
              >
                {t.nav.leaderboard || 'Leaderboard'}
              </Link>
            </nav>
          </div>

          {/* Right Utility & Auth Zone */}
          <div className="navbar-right">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            <button
              className="theme-toggle"
              onClick={handleThemeToggle}
              aria-label={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
              title={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* User Account / Sign In */}
            {loading ? (
              <div className="navbar-loading-skeleton" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  className="user-pill-btn"
                  onClick={() => setUserMenuOpen(o => !o)}
                  id="user-menu-btn"
                  aria-expanded={userMenuOpen}
                  aria-label="User Account Menu"
                >
                  <UserAvatar
                    name={user.full_name}
                    url={user.avatar_url}
                    size={26}
                  />
                  <span className="user-pill-name">
                    {user.full_name?.split(' ')[0] || 'Profile'}
                  </span>
                  <span className="user-pill-arrow">▾</span>
                </button>

                {userMenuOpen && (
                  <div className="card dropdown-menu-popover user-dropdown-card animate-scaleIn">
                    <div className="user-dropdown-header">
                      <p className="user-dropdown-name">{user.full_name}</p>
                      <p className="user-dropdown-email">{user.email}</p>
                    </div>

                    <div className="user-dropdown-body">
                      {(user.role === 'admin' || user.role === 'teacher') && (
                        <Link
                          href="/admin"
                          className="dropdown-menu-item"
                          onClick={() => setUserMenuOpen(false)}
                          id="admin-link"
                        >
                          <span style={{ fontSize: '1rem' }}>⚡</span>
                          <span>{t.nav.admin}</span>
                        </Link>
                      )}

                      <Link
                        href="/profile"
                        className="dropdown-menu-item"
                        onClick={() => setUserMenuOpen(false)}
                        id="profile-link"
                      >
                        <span style={{ fontSize: '1rem' }}>👤</span>
                        <span>{t.nav.profile}</span>
                      </Link>

                      <Link
                        href="/leaderboard"
                        className="dropdown-menu-item"
                        onClick={() => setUserMenuOpen(false)}
                        id="menu-leaderboard-link"
                      >
                        <span style={{ fontSize: '1rem' }}>🏆</span>
                        <span>{t.nav.leaderboard}</span>
                      </Link>

                      <div className="dropdown-divider" />

                      <button
                        className="dropdown-menu-item user-dropdown-signout"
                        onClick={() => {
                          setUserMenuOpen(false)
                          logout()
                        }}
                        id="sign-out-btn"
                      >
                        <span style={{ fontSize: '1rem' }}>🚪</span>
                        <span>{t.nav.signOut}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-primary btn-sm navbar-signin-btn"
                onClick={() => login()}
                id="google-login-btn"
              >
                {t.nav.signIn}
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              className="navbar-mobile-toggle"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              id="mobile-nav-toggle-btn"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="navbar-mobile-drawer animate-scaleIn">
            <Link
              href="/quizzes"
              className={`navbar-mobile-link ${isQuizzesActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="navbar-mobile-icon">⚡</span>
              <span>{t.nav.liveQuizzes || 'Live Quizzes'}</span>
            </Link>
            <Link
              href="/series"
              className={`navbar-mobile-link ${isSeriesActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="navbar-mobile-icon">📚</span>
              <span>{t.nav.allSeries || 'Series'}</span>
            </Link>
            <Link
              href="/leaderboard"
              className={`navbar-mobile-link ${isLeaderboardActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="navbar-mobile-icon">🏆</span>
              <span>{t.nav.leaderboard || 'Leaderboard'}</span>
            </Link>
            {user && (
              <>
                <div className="dropdown-divider" style={{ margin: '0.4rem 0' }} />
                <Link
                  href="/profile"
                  className="navbar-mobile-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="navbar-mobile-icon">👤</span>
                  <span>{t.nav.profile}</span>
                </Link>
                {(user.role === 'admin' || user.role === 'teacher') && (
                  <Link
                    href="/admin"
                    className="navbar-mobile-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="navbar-mobile-icon">⚡</span>
                    <span>{t.nav.admin}</span>
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
