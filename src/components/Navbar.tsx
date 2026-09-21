'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { UserAvatar } from '@/components/UserAvatar'
import { getTheme, setTheme } from '@/lib/session-storage'

export function Navbar() {
  const { user, loading, login, logout } = useAuth()
  const { t } = useLanguage()
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    setTheme(next)
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          {/* Logo */}
          <Link href="/" className="navbar-logo">
            <span className="navbar-logo-main">Brahma Jijñāsā</span>
            <span className="navbar-logo-sub">ब्रह्म जिज्ञासा</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/leaderboard"
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: 600, color: 'var(--color-gold)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              id="nav-leaderboard-btn"
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </Link>

            {/* Language dropdown */}
            <LanguageSelector />

            {/* Theme toggle */}
            <button
              className="theme-toggle"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {loading ? (
              <div style={{ width: 80, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
            ) : user ? (
              <div className="flex items-center gap-2" style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm flex items-center gap-1"
                  onClick={() => setMenuOpen(o => !o)}
                  id="user-menu-btn"
                >
                  <UserAvatar
                    name={user.full_name}
                    url={user.avatar_url}
                    size={24}
                  />
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.full_name?.split(' ')[0] || 'Profile'}
                  </span>
                  <span style={{ fontSize: '0.7rem' }}>▾</span>
                </button>

                {menuOpen && (
                  <div
                    className="card"
                    style={{
                      position: 'absolute', top: '110%', right: 0,
                      minWidth: 170, padding: '0.5rem', zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.35rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gold)' }}>{user.full_name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                    </div>

                    {(user.role === 'admin' || user.role === 'teacher') && (
                      <Link
                        href="/admin"
                        className="btn btn-ghost btn-sm w-full"
                        style={{ justifyContent: 'flex-start', marginBottom: '0.25rem' }}
                        onClick={() => setMenuOpen(false)}
                        id="admin-link"
                      >
                        ⚡ {t.nav.admin}
                      </Link>
                    )}

                    <Link
                      href="/leaderboard"
                      className="btn btn-ghost btn-sm w-full"
                      style={{ justifyContent: 'flex-start', marginBottom: '0.25rem' }}
                      onClick={() => setMenuOpen(false)}
                      id="menu-leaderboard-link"
                    >
                      🏆 Leaderboard
                    </Link>

                    <Link
                      href="/profile"
                      className="btn btn-ghost btn-sm w-full"
                      style={{ justifyContent: 'flex-start', marginBottom: '0.25rem' }}
                      onClick={() => setMenuOpen(false)}
                      id="profile-link"
                    >
                      👤 {t.nav.profile}
                    </Link>

                    <button
                      className="btn btn-danger btn-sm w-full"
                      style={{ justifyContent: 'flex-start' }}
                      onClick={logout}
                      id="sign-out-btn"
                    >
                      {t.nav.signOut}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => login()}
                id="google-login-btn"
              >
                {t.nav.signIn}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
