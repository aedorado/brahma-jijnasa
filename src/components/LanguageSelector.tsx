'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import type { SupportedLanguage } from '@/lib/i18n/translations'

const LANG_SHORT_CODES: Record<string, string> = {
  en: 'EN',
  hi: 'HI',
  pt: 'PT',
}

export function LanguageSelector() {
  const { language, setLanguage, languages } = useLanguage()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentOption = languages.find(l => l.code === language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="navbar-util-btn"
        onClick={() => setOpen(o => !o)}
        id="language-selector-btn"
        aria-label="Select Language"
        title="Change Language"
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{currentOption.flag}</span>
        <span className="lang-code-label">{LANG_SHORT_CODES[currentOption.code] || currentOption.code.toUpperCase()}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          className="card dropdown-menu-popover animate-scaleIn"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 150,
            padding: '0.35rem',
            zIndex: 150,
          }}
        >
          <div style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Language
          </div>
          {languages.map(opt => {
            const isSelected = opt.code === language
            return (
              <button
                key={opt.code}
                className="dropdown-menu-item"
                style={{
                  color: isSelected ? 'var(--color-gold)' : 'var(--color-text)',
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? 'rgba(212,175,55,0.1)' : 'transparent',
                }}
                onClick={() => {
                  setLanguage(opt.code as SupportedLanguage)
                  setOpen(false)
                }}
                id={`lang-opt-${opt.code}`}
              >
                <span style={{ fontSize: '1.05rem' }}>{opt.flag}</span>
                <span>{opt.label}</span>
                {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--color-gold)', fontSize: '0.8rem' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

