'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import type { SupportedLanguage } from '@/lib/i18n/translations'

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
        className="btn btn-ghost btn-sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.75rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          border: '1.5px solid var(--color-border)',
        }}
        onClick={() => setOpen(o => !o)}
        id="language-selector-btn"
        aria-label="Select Language"
      >
        <span>{currentOption.flag}</span>
        <span style={{ fontSize: '0.85rem' }}>{currentOption.label}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div
          className="card animate-scaleIn"
          style={{
            position: 'absolute',
            top: '115%',
            right: 0,
            minWidth: 140,
            padding: '0.4rem',
            zIndex: 150,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            border: '1px solid var(--color-border-gold)',
          }}
        >
          {languages.map(opt => {
            const isSelected = opt.code === language
            return (
              <button
                key={opt.code}
                className="btn btn-ghost btn-sm w-full"
                style={{
                  justifyContent: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--color-gold)' : 'var(--color-text)',
                  background: isSelected ? 'rgba(232,192,69,0.12)' : 'transparent',
                  marginBottom: '0.2rem',
                }}
                onClick={() => {
                  setLanguage(opt.code as SupportedLanguage)
                  setOpen(false)
                }}
                id={`lang-opt-${opt.code}`}
              >
                <span style={{ fontSize: '1.1rem' }}>{opt.flag}</span>
                <span>{opt.label}</span>
                {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--color-gold)' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
