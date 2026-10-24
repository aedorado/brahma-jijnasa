'use client'

import React, { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import type { SupportedLanguage } from '@/lib/i18n/translations'

const PROMPT_KEY = 'bj_lang_prompted'
const LANG_KEY = 'bj_language'

const LANGUAGE_SUBTITLES: Record<SupportedLanguage, string> = {
  en: 'English (Default)',
  hi: 'हिन्दी (Hindi)',
  pt: 'Português (Portuguese)',
}

export function LanguageWelcomeModal() {
  const { language, setLanguage, languages } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const alreadyPrompted = localStorage.getItem(PROMPT_KEY)
      const explicitLang = localStorage.getItem(LANG_KEY)
      // Only show to first-time visitors who haven't explicitly set a language
      if (!alreadyPrompted && !explicitLang) {
        const timer = setTimeout(() => {
          setIsOpen(true)
        }, 600)
        return () => clearTimeout(timer)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleSelect = (lang: SupportedLanguage) => {
    setLanguage(lang)
    try {
      localStorage.setItem(PROMPT_KEY, 'true')
    } catch {
      // ignore
    }
    setIsOpen(false)
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(PROMPT_KEY, 'true')
    } catch {
      // ignore
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-labelledby="lang-modal-title"
      aria-modal="true"
      className="lang-welcome-overlay animate-fadeIn"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 8, 20, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="lang-welcome-card animate-scaleUp"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--color-surface)',
          borderRadius: 20,
          border: '1px solid var(--color-border-gold)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          padding: '1.75rem',
          position: 'relative',
        }}
      >
        {/* Dismiss 'X' button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close language selector"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            lineHeight: 1,
            borderRadius: 6,
          }}
        >
          ✕
        </button>

        {/* Sacred Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(240, 199, 78, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              margin: '0 auto 0.75rem',
              border: '1px solid rgba(240, 199, 78, 0.3)',
            }}
          >
            🪷
          </div>
          <h2
            id="lang-modal-title"
            style={{
              fontSize: '1.3rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              marginBottom: '0.35rem',
            }}
          >
            Choose Your Language
          </h2>
          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--color-gold)',
              fontFamily: 'var(--font-sanskrit)',
              marginBottom: '0.25rem',
            }}
          >
            अपनी भाषा चुनें • Escolha seu idioma
          </p>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-muted)',
              lineHeight: 1.45,
            }}
          >
            You can always change your language later from the navigation bar.
          </p>
        </div>

        {/* Language Options Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {languages.map(item => {
            const isSelected = language === item.code
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`lang-welcome-option ${isSelected ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.15rem',
                  borderRadius: 12,
                  border: isSelected
                    ? '2px solid var(--color-gold)'
                    : '1px solid var(--color-border)',
                  background: isSelected
                    ? 'rgba(240, 199, 78, 0.12)'
                    : 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{item.flag}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                      {LANGUAGE_SUBTITLES[item.code]}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isSelected ? 'var(--color-gold)' : 'var(--color-muted)',
                  }}
                >
                  {isSelected ? '✓ Active' : 'Select →'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Bottom Skip Action */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0.35rem 0.75rem',
            }}
          >
            Continue with English (Default)
          </button>
        </div>
      </div>
    </div>
  )
}
