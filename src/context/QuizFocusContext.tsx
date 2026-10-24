'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

interface QuizFocusContextType {
  isFocusMode: boolean
  focusTitle: string
  enterFocusMode: (title?: string) => void
  exitFocusMode: () => void
}

const QuizFocusContext = createContext<QuizFocusContextType>({
  isFocusMode: false,
  focusTitle: '',
  enterFocusMode: () => {},
  exitFocusMode: () => {},
})

export function QuizFocusProvider({ children }: { children: React.ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [focusTitle, setFocusTitle] = useState('')

  const enterFocusMode = useCallback((title?: string) => {
    setIsFocusMode(true)
    if (title) setFocusTitle(title)
  }, [])

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false)
    setFocusTitle('')
  }, [])

  const value = useMemo(
    () => ({ isFocusMode, focusTitle, enterFocusMode, exitFocusMode }),
    [isFocusMode, focusTitle, enterFocusMode, exitFocusMode]
  )

  return (
    <QuizFocusContext.Provider value={value}>
      {children}
    </QuizFocusContext.Provider>
  )
}

export function useQuizFocus() {
  return useContext(QuizFocusContext)
}
