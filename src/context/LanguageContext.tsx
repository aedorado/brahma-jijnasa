'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  translations,
} from '@/lib/i18n/translations'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: typeof translations['en']
  languages: typeof SUPPORTED_LANGUAGES
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: translations['en'],
  languages: SUPPORTED_LANGUAGES,
})

const STORAGE_KEY = 'bj_language'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'pt')) {
        setLanguageState(saved)
      }
    } catch {
      // ignore
    }
  }, [])

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  }, [])

  const t = translations[language] || translations['en']

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
