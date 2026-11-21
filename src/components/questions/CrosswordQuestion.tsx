'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { FormattedText } from '@/components/FormattedText'
import type {
  CrosswordQuestion as CrosswordQuestionType,
  CrosswordClueItem,
  CrosswordPlacedWord,
  CrosswordLayout,
  CrosswordAnswer,
} from '@/types/quiz'

interface Props {
  question: CrosswordQuestionType
  answer: CrosswordAnswer | null
  onAnswer: (val: CrosswordAnswer) => void
  revealAnswerKey?: boolean
}

// ============================================================
// CROSSWORD LAYOUT COMPILER (Algorithmic Grid Generator)
// ============================================================

function isValidPlacement(
  word: string,
  startRow: number,
  startCol: number,
  direction: 'across' | 'down',
  gridLetters: Record<string, string>
): boolean {
  const maxLimit = 25

  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? startRow : startRow + i
    const c = direction === 'across' ? startCol + i : startCol

    if (Math.abs(r) > maxLimit || Math.abs(c) > maxLimit) return false

    const existing = gridLetters[`${r},${c}`]
    if (existing && existing !== word[i]) {
      return false
    }

    if (!existing) {
      const neighbors =
        direction === 'across'
          ? [`${r - 1},${c}`, `${r + 1},${c}`]
          : [`${r},${c - 1}`, `${r},${c + 1}`]

      if (neighbors.some(n => gridLetters[n])) {
        return false
      }
    }
  }

  const beforeKey =
    direction === 'across'
      ? `${startRow},${startCol - 1}`
      : `${startRow - 1},${startCol}`
  const afterKey =
    direction === 'across'
      ? `${startRow},${startCol + word.length}`
      : `${startRow + word.length},${startCol}`

  if (gridLetters[beforeKey] || gridLetters[afterKey]) {
    return false
  }

  return true
}

function calculatePlacementScore(
  word: string,
  startRow: number,
  startCol: number,
  direction: 'across' | 'down',
  gridLetters: Record<string, string>,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): number {
  let intersections = 0
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? startRow : startRow + i
    const c = direction === 'across' ? startCol + i : startCol
    if (gridLetters[`${r},${c}`]) intersections++
  }

  const newMinRow = Math.min(minRow, startRow, direction === 'down' ? startRow + word.length - 1 : startRow)
  const newMaxRow = Math.max(maxRow, startRow, direction === 'down' ? startRow + word.length - 1 : startRow)
  const newMinCol = Math.min(minCol, startCol, direction === 'across' ? startCol + word.length - 1 : startCol)
  const newMaxCol = Math.max(maxCol, startCol, direction === 'across' ? startCol + word.length - 1 : startCol)

  const width = newMaxCol - newMinCol + 1
  const height = newMaxRow - newMinRow + 1
  const diff = Math.abs(width - height)
  const shapePenalty = width * height + diff * 6

  return intersections * 35 - shapePenalty
}

function compileSingleLayout(wordItems: CrosswordClueItem[]): CrosswordLayout | null {
  const sorted = [...wordItems].sort((a, b) => b.word.length - a.word.length)
  const placed: CrosswordPlacedWord[] = []
  const gridLetters: Record<string, string> = {}

  let minRow = 0
  let maxRow = 0
  let minCol = 0
  let maxCol = 0

  const first = sorted[0]
  placed.push({
    word: first.word,
    clue: first.clue,
    reference: first.reference,
    verseText: first.verseText,
    row: 0,
    col: 0,
    direction: 'across',
    number: 1,
  })
  first.word.split('').forEach((char, idx) => {
    gridLetters[`0,${idx}`] = char
  })
  maxCol = first.word.length - 1

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    const candidates: { row: number; col: number; direction: 'across' | 'down'; score: number }[] = []

    Object.entries(gridLetters).forEach(([coord, gridChar]) => {
      const [gr, gc] = coord.split(',').map(Number)
      let charIdx = item.word.indexOf(gridChar)

      while (charIdx !== -1) {
        const coveringWord = placed.find(w => {
          const wStart = w.direction === 'across' ? w.col : w.row
          const wCoord = w.direction === 'across' ? gc : gr
          const isOrthogonal = w.direction === 'across' ? w.row === gr : w.col === gc
          return isOrthogonal && wCoord >= wStart && wCoord < wStart + w.word.length
        })

        const newDir = coveringWord?.direction === 'across' ? 'down' : 'across'
        const startR = newDir === 'across' ? gr : gr - charIdx
        const startC = newDir === 'across' ? gc - charIdx : gc

        if (isValidPlacement(item.word, startR, startC, newDir, gridLetters)) {
          const score = calculatePlacementScore(
            item.word,
            startR,
            startC,
            newDir,
            gridLetters,
            minRow,
            maxRow,
            minCol,
            maxCol
          )
          candidates.push({ row: startR, col: startC, direction: newDir, score })
        }

        charIdx = item.word.indexOf(gridChar, charIdx + 1)
      }
    })

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score)
      const chosen = candidates[0]
      placed.push({
        word: item.word,
        clue: item.clue,
        reference: item.reference,
        verseText: item.verseText,
        row: chosen.row,
        col: chosen.col,
        direction: chosen.direction,
        number: 0,
      })
      item.word.split('').forEach((char, idx) => {
        const r = chosen.direction === 'across' ? chosen.row : chosen.row + idx
        const c = chosen.direction === 'across' ? chosen.col + idx : chosen.col
        gridLetters[`${r},${c}`] = char
        minRow = Math.min(minRow, r)
        maxRow = Math.max(maxRow, r)
        minCol = Math.min(minCol, c)
        maxCol = Math.max(maxCol, c)
      })
    }
  }

  if (placed.length < Math.min(wordItems.length, 8)) return null

  const rowOffset = -minRow
  const colOffset = -minCol
  const normalizedPlaced = placed.map(w => ({
    ...w,
    row: w.row + rowOffset,
    col: w.col + colOffset,
  }))

  const startPoints = [...normalizedPlaced].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })

  const coordNumbers: Record<string, number> = {}
  let currentNum = 1
  startPoints.forEach(w => {
    const key = `${w.row},${w.col}`
    if (!coordNumbers[key]) {
      coordNumbers[key] = currentNum++
    }
    w.number = coordNumbers[key]
  })

  const finalGrid: Record<string, { letter: string; number?: number }> = {}
  normalizedPlaced.forEach(w => {
    w.word.split('').forEach((char, idx) => {
      const r = w.direction === 'across' ? w.row : w.row + idx
      const c = w.direction === 'across' ? w.col + idx : w.col
      finalGrid[`${r},${c}`] = { letter: char }
    })
  })

  Object.entries(coordNumbers).forEach(([coord, num]) => {
    if (finalGrid[coord]) {
      finalGrid[coord].number = num
    }
  })

  return {
    grid: finalGrid,
    placedWords: normalizedPlaced,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  }
}

function buildLayout(wordItems: CrosswordClueItem[]): CrosswordLayout {
  let result = compileSingleLayout(wordItems)
  if (result) return result

  for (let i = 0; i < 50; i++) {
    const shuffled = [...wordItems].sort(() => Math.random() - 0.5)
    result = compileSingleLayout(shuffled)
    if (result) return result
  }

  return { grid: {}, placedWords: [], rows: 0, cols: 0 }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CrosswordQuestion({ question, answer, onAnswer, revealAnswerKey = false }: Props) {
  const { t, language } = useLanguage()

  // Multilingual text extractors
  const getClueText = useCallback(
    (w: CrosswordClueItem | CrosswordPlacedWord | null | undefined): string => {
      if (!w) return ''
      if (w.translations && w.translations[language]?.clue) {
        return w.translations[language]!.clue!
      }
      return w.clue
    },
    [language]
  )

  const getVerseText = useCallback(
    (w: CrosswordClueItem | CrosswordPlacedWord | null | undefined): string | undefined => {
      if (!w) return undefined
      if (w.translations && w.translations[language]?.verseText) {
        return w.translations[language]!.verseText
      }
      return w.verseText
    },
    [language]
  )

  const getDirectionLabel = useCallback(
    (dir: 'across' | 'down') => {
      if (dir === 'across') {
        return t.crossword?.across || (language === 'hi' ? 'बाएँ से दाएँ' : language === 'pt' ? 'Horizontal' : 'Across')
      }
      return t.crossword?.down || (language === 'hi' ? 'ऊपर से नीचे' : language === 'pt' ? 'Vertical' : 'Down')
    },
    [t, language]
  )

  // 1. Layout Resolution
  const layout = useMemo<CrosswordLayout>(() => {
    if (question.precompiledLayout && question.precompiledLayout.placedWords?.length > 0) {
      return question.precompiledLayout
    }
    return buildLayout(question.words || [])
  }, [question])

  // 2. User Answers Map
  const userCells = useMemo<Record<string, string>>(() => {
    if (!answer || typeof answer !== 'object') return {}
    if ('cells' in answer && answer.cells && typeof answer.cells === 'object') {
      return answer.cells as Record<string, string>
    }
    return answer as Record<string, string>
  }, [answer])

  // 3. Selection State
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(() => {
    if (layout.placedWords.length > 0) {
      return { r: layout.placedWords[0].row, c: layout.placedWords[0].col }
    }
    return null
  })

  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>(() => {
    if (layout.placedWords.length > 0) {
      return layout.placedWords[0].direction
    }
    return 'across'
  })

  // Mobile Tab state ('across' | 'down')
  const [mobileTab, setMobileTab] = useState<'across' | 'down'>(() => {
    return layout.placedWords.length > 0 ? layout.placedWords[0].direction : 'across'
  })

  const [showVerseModal, setShowVerseModal] = useState<CrosswordPlacedWord | null>(null)

  // Find all words covering cell & direction helpers
  const getWordsAtCell = useCallback(
    (r: number, c: number): CrosswordPlacedWord[] => {
      return layout.placedWords.filter(w => {
        if (w.direction === 'across') {
          return w.row === r && c >= w.col && c < w.col + w.word.length
        } else {
          return w.col === c && r >= w.row && r < w.row + w.word.length
        }
      })
    },
    [layout]
  )

  const findCoveringWord = useCallback(
    (r: number, c: number, dir?: 'across' | 'down'): CrosswordPlacedWord | undefined => {
      const words = getWordsAtCell(r, c)
      if (words.length === 0) return undefined
      if (dir) {
        return words.find(w => w.direction === dir)
      }
      return words.find(w => w.direction === activeDirection) || words[0]
    },
    [getWordsAtCell, activeDirection]
  )

  const getActiveWordForCell = useCallback(
    (r: number, c: number): CrosswordPlacedWord | undefined => {
      const words = getWordsAtCell(r, c)
      if (words.length === 0) return undefined
      const matching = words.find(w => w.direction === activeDirection)
      if (matching) return matching
      return words[0]
    },
    [getWordsAtCell, activeDirection]
  )

  // Derived Active Word & Highlights
  const { currentActiveWord, activeWordLetters, activeClueNumber } = useMemo(() => {
    if (!activeCell) {
      return {
        currentActiveWord: null,
        activeWordLetters: new Set<string>(),
        activeClueNumber: null,
      }
    }

    const word = getActiveWordForCell(activeCell.r, activeCell.c)

    if (word) {
      const letters = new Set<string>()
      for (let i = 0; i < word.word.length; i++) {
        const r = word.direction === 'across' ? word.row : word.row + i
        const c = word.direction === 'across' ? word.col + i : word.col
        letters.add(`${r},${c}`)
      }
      return {
        currentActiveWord: word,
        activeWordLetters: letters,
        activeClueNumber: word.number,
      }
    }

    return {
      currentActiveWord: null,
      activeWordLetters: new Set<string>(),
      activeClueNumber: null,
    }
  }, [activeCell, getActiveWordForCell])

  // Focus cell helper
  const focusCellInput = useCallback((r: number, c: number) => {
    const el = document.getElementById(`cw-cell-${r},${c}`) as HTMLInputElement | null
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  // Auto-advance cursor to next cell in word or next word
  const advanceCursor = useCallback(
    (r: number, c: number, currentAnswers: Record<string, string>) => {
      const word = getActiveWordForCell(r, c)
      if (!word) return

      // Keep active direction in sync with current word
      if (word.direction !== activeDirection) {
        setActiveDirection(word.direction)
        setMobileTab(word.direction)
      }

      const wordStart = word.direction === 'across' ? word.col : word.row
      const cellPos = word.direction === 'across' ? c : r
      const relativeIdx = cellPos - wordStart

      // 1. Advance to next letter along current word
      if (relativeIdx < word.word.length - 1) {
        const nextR = word.direction === 'across' ? word.row : word.row + relativeIdx + 1
        const nextC = word.direction === 'across' ? word.col + relativeIdx + 1 : word.col
        setActiveCell({ r: nextR, c: nextC })
        focusCellInput(nextR, nextC)
        return
      }

      // 2. If at end of word, check if any earlier letter in this word is still unfilled
      for (let i = 0; i < word.word.length; i++) {
        const cr = word.direction === 'across' ? word.row : word.row + i
        const cc = word.direction === 'across' ? word.col + i : word.col
        if (!currentAnswers[`${cr},${cc}`]) {
          setActiveCell({ r: cr, c: cc })
          focusCellInput(cr, cc)
          return
        }
      }

      // 3. Current word is completely filled! Auto-advance to next incomplete clue
      const nextWord = layout.placedWords
        .sort((a, b) => a.number - b.number)
        .find(w => {
          for (let i = 0; i < w.word.length; i++) {
            const cr = w.direction === 'across' ? w.row : w.row + i
            const cc = w.direction === 'across' ? w.col + i : w.col
            if (!currentAnswers[`${cr},${cc}`]) return true
          }
          return false
        })

      if (nextWord) {
        let targetR = nextWord.row
        let targetC = nextWord.col
        for (let i = 0; i < nextWord.word.length; i++) {
          const cr = nextWord.direction === 'across' ? nextWord.row : nextWord.row + i
          const cc = nextWord.direction === 'across' ? nextWord.col + i : nextWord.col
          if (!currentAnswers[`${cr},${cc}`]) {
            targetR = cr
            targetC = cc
            break
          }
        }
        setActiveDirection(nextWord.direction)
        setMobileTab(nextWord.direction)
        setActiveCell({ r: targetR, c: targetC })
        focusCellInput(targetR, targetC)
      }
    },
    [getActiveWordForCell, activeDirection, focusCellInput, layout]
  )

  // Cell Click / Focus Handler
  const handleCellClick = (r: number, c: number) => {
    if (!layout.grid[`${r},${c}`]) return

    const words = getWordsAtCell(r, c)
    if (words.length === 0) return

    if (activeCell && activeCell.r === r && activeCell.c === c) {
      if (words.length > 1) {
        const newDir = activeDirection === 'across' ? 'down' : 'across'
        setActiveDirection(newDir)
        setMobileTab(newDir)
      }
    } else {
      setActiveCell({ r, c })
      const hasAcross = words.some(w => w.direction === 'across')
      const hasDown = words.some(w => w.direction === 'down')
      if (hasAcross && !hasDown) {
        setActiveDirection('across')
        setMobileTab('across')
      } else if (hasDown && !hasAcross) {
        setActiveDirection('down')
        setMobileTab('down')
      }
    }

    focusCellInput(r, c)
  }

  // Clue Click Handler
  const handleClueClick = (word: CrosswordPlacedWord) => {
    setActiveDirection(word.direction)
    setMobileTab(word.direction)

    let target = { r: word.row, c: word.col }
    for (let i = 0; i < word.word.length; i++) {
      const r = word.direction === 'across' ? word.row : word.row + i
      const c = word.direction === 'across' ? word.col + i : word.col
      if (!userCells[`${r},${c}`]) {
        target = { r, c }
        break
      }
    }
    setActiveCell(target)
    focusCellInput(target.r, target.c)

    const el = document.getElementById(`clue-${word.number}-${word.direction}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // Key Down Handler (Supports direct A-Z typing, Backspace navigation, and Arrows)
  const handleInputKeyDown = (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key

    // Physical Keyboard A-Z Typing
    if (/^[a-zA-Z]$/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      const char = key.toUpperCase()
      const coord = `${r},${c}`
      const next = { ...userCells, [coord]: char }
      onAnswer(next)
      advanceCursor(r, c, next)
      return
    }

    // Backspace Navigation
    if (key === 'Backspace') {
      e.preventDefault()
      const coord = `${r},${c}`
      if (userCells[coord]) {
        const next = { ...userCells }
        delete next[coord]
        onAnswer(next)
      } else {
        const word = getActiveWordForCell(r, c)
        if (word) {
          const wordStart = word.direction === 'across' ? word.col : word.row
          const cellPos = word.direction === 'across' ? c : r
          const relativeIdx = cellPos - wordStart
          if (relativeIdx > 0) {
            const prevR = word.direction === 'across' ? word.row : word.row + relativeIdx - 1
            const prevC = word.direction === 'across' ? word.col + relativeIdx - 1 : word.col
            const prevCoord = `${prevR},${prevC}`
            const next = { ...userCells }
            delete next[prevCoord]
            onAnswer(next)
            setActiveCell({ r: prevR, c: prevC })
            focusCellInput(prevR, prevC)
          }
        }
      }
      return
    }

    if (key === 'ArrowRight') {
      e.preventDefault()
      if (activeDirection === 'down') {
        const words = getWordsAtCell(r, c)
        if (words.some(w => w.direction === 'across')) {
          setActiveDirection('across')
          setMobileTab('across')
          return
        }
      }
      if (layout.grid[`${r},${c + 1}`]) {
        setActiveCell({ r, c: c + 1 })
        focusCellInput(r, c + 1)
      }
      return
    }

    if (key === 'ArrowLeft') {
      e.preventDefault()
      if (activeDirection === 'down') {
        const words = getWordsAtCell(r, c)
        if (words.some(w => w.direction === 'across')) {
          setActiveDirection('across')
          setMobileTab('across')
          return
        }
      }
      if (layout.grid[`${r},${c - 1}`]) {
        setActiveCell({ r, c: c - 1 })
        focusCellInput(r, c - 1)
      }
      return
    }

    if (key === 'ArrowDown') {
      e.preventDefault()
      if (activeDirection === 'across') {
        const words = getWordsAtCell(r, c)
        if (words.some(w => w.direction === 'down')) {
          setActiveDirection('down')
          setMobileTab('down')
          return
        }
      }
      if (layout.grid[`${r + 1},${c}`]) {
        setActiveCell({ r: r + 1, c })
        focusCellInput(r + 1, c)
      }
      return
    }

    if (key === 'ArrowUp') {
      e.preventDefault()
      if (activeDirection === 'across') {
        const words = getWordsAtCell(r, c)
        if (words.some(w => w.direction === 'down')) {
          setActiveDirection('down')
          setMobileTab('down')
          return
        }
      }
      if (layout.grid[`${r - 1},${c}`]) {
        setActiveCell({ r: r - 1, c })
        focusCellInput(r - 1, c)
      }
      return
    }

    if (key === ' ' || key === 'Enter') {
      e.preventDefault()
      const words = getWordsAtCell(r, c)
      if (words.length > 1) {
        const newDir = activeDirection === 'across' ? 'down' : 'across'
        setActiveDirection(newDir)
        setMobileTab(newDir)
      }
    }
  }

  // Input Change Handler (Mobile virtual keyboards & fallback)
  const handleInputChange = (r: number, c: number, value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z]/g, '')
    if (cleaned.length > 0) {
      const char = cleaned.slice(-1)
      const coord = `${r},${c}`
      const next = { ...userCells, [coord]: char }
      onAnswer(next)
      advanceCursor(r, c, next)
    }
  }

  // Clue Stepper helpers
  const activeWordIndex = layout.placedWords.findIndex(
    w => w.number === activeClueNumber && w.direction === activeDirection
  )

  const handlePrevClue = () => {
    if (layout.placedWords.length === 0) return
    const prevIdx = activeWordIndex <= 0 ? layout.placedWords.length - 1 : activeWordIndex - 1
    handleClueClick(layout.placedWords[prevIdx])
  }

  const handleNextClue = () => {
    if (layout.placedWords.length === 0) return
    const nextIdx = activeWordIndex >= layout.placedWords.length - 1 ? 0 : activeWordIndex + 1
    handleClueClick(layout.placedWords[nextIdx])
  }

  const acrossClues = useMemo(
    () => layout.placedWords.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number),
    [layout]
  )
  const downClues = useMemo(
    () => layout.placedWords.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number),
    [layout]
  )

  // Word completion check
  const isWordCompleted = useCallback(
    (w: CrosswordPlacedWord): boolean => {
      for (let i = 0; i < w.word.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i
        const c = w.direction === 'across' ? w.col + i : w.col
        const expected = w.word[i]
        const actual = (userCells[`${r},${c}`] || '').toUpperCase()
        if (expected !== actual) return false
      }
      return true
    },
    [userCells]
  )

  if (layout.rows === 0 || layout.cols === 0) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
        <p>Arranging Sacred Crossword Syllables...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        /* ——— CROSSWORD MODERN RESPONSIVE STYLESHEET ——— */
        .cw-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }

        /* ── TWO-COLUMN DESKTOP LAYOUT (Grid gets 1.8fr, clues get 1fr) ── */
        .cw-layout-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1.05fr);
          gap: 1.5rem;
          align-items: start;
          width: 100%;
        }

        @media (max-width: 880px) {
          .cw-layout-grid {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
        }

        /* ── GRID PANEL ── */
        .cw-grid-panel {
          position: relative;
          background: var(--color-surface);
          padding: 1.35rem 1.5rem;
          border-radius: var(--radius-lg, 16px);
          border: 1.5px solid var(--color-border);
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .cw-grid-panel {
            padding: 0.85rem 0.5rem;
            border-radius: var(--radius-md, 12px);
          }
        }

        /* ── ACTIVE CLUE BANNER (Sleek, Compact Command Strip) ── */
        .cw-active-banner {
          width: 100%;
          background: var(--color-surface-2);
          border: 1.5px solid var(--color-border-gold);
          border-radius: var(--radius-md, 12px);
          padding: 0.75rem 1rem;
          margin-bottom: 1.15rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          box-sizing: border-box;
        }

        [data-theme="light"] .cw-active-banner {
          background: #FFFDF7;
          border-color: rgba(217, 119, 6, 0.35);
        }

        .cw-active-banner-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .cw-active-badge-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cw-badge {
          background: var(--color-primary);
          color: #FFFFFF;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 0.22rem 0.65rem;
          border-radius: 6px;
          text-transform: uppercase;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .cw-ref-tag {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-gold);
          background: rgba(240, 199, 78, 0.12);
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          border: 1px solid var(--color-border-gold);
        }

        .cw-banner-controls {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .cw-banner-btn {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background: var(--color-surface);
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cw-banner-btn:hover {
          border-color: var(--color-gold);
          color: var(--color-gold);
        }

        .cw-dir-btn {
          background: rgba(240, 199, 78, 0.15);
          border-color: var(--color-border-gold);
          color: var(--color-gold);
          font-weight: 800;
        }

        .cw-active-clue-text {
          font-size: 0.96rem;
          font-weight: 600;
          line-height: 1.45;
          color: var(--color-text);
          margin: 0;
        }

        .cw-verse-btn {
          align-self: flex-start;
          background: none;
          border: none;
          padding: 0;
          font-size: 0.78rem;
          color: var(--color-gold);
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          margin-top: 0.15rem;
        }

        /* ── MATRIX & SCALED CELLS ── */
        .cw-matrix-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0.25rem 0;
        }

        .cw-matrix {
          display: grid;
          grid-template-columns: repeat(${layout.cols}, minmax(0, 1fr));
          gap: 2.5px;
          width: 100%;
          /* Desktop: scale cells generously up to 52px each, min 480px width */
          max-width: min(100%, ${Math.max(layout.cols * 50, 460)}px);
          margin: 0 auto;
          background: transparent;
        }

        @media (max-width: 768px) {
          .cw-matrix {
            gap: 2px;
            max-width: 100%;
          }
        }

        .cw-cell {
          aspect-ratio: 1;
          position: relative;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          transition: background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
        }

        /* Inactive empty cells: subtle dotted grid, NEVER solid dark blocks! */
        .cw-cell.cw-inactive {
          background-color: transparent !important;
          border: none !important;
          background-image: radial-gradient(var(--color-gold) 1.2px, transparent 1.2px);
          background-size: 11px 11px;
          opacity: 0.16;
          box-shadow: none !important;
        }

        /* Active word cells */
        .cw-cell.cw-active {
          background-color: var(--color-surface);
          border: 1.5px solid var(--color-border);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          cursor: pointer;
        }

        [data-theme="light"] .cw-cell.cw-active {
          background-color: #FFFFFF;
          border-color: rgba(180, 83, 9, 0.28);
        }

        [data-theme="dark"] .cw-cell.cw-active {
          background-color: #2E2452;
          border-color: rgba(240, 199, 78, 0.3);
        }

        /* Active Path (cells along current word) */
        .cw-cell.cw-path {
          background-color: rgba(240, 199, 78, 0.22) !important;
          border-color: var(--color-gold) !important;
        }

        [data-theme="light"] .cw-cell.cw-path {
          background-color: #FEF3C7 !important;
          border-color: #D97706 !important;
        }

        [data-theme="dark"] .cw-cell.cw-path {
          background-color: rgba(240, 199, 78, 0.22) !important;
          border-color: var(--color-gold) !important;
        }

        /* Focused cursor cell */
        .cw-cell.cw-focused {
          background-color: #FDE68A !important;
          border: 2.5px solid var(--color-primary) !important;
          box-shadow: 0 0 12px rgba(242, 128, 20, 0.45) !important;
          z-index: 5;
        }

        [data-theme="light"] .cw-cell.cw-focused {
          background-color: #FDE68A !important;
          border-color: #D97706 !important;
        }

        [data-theme="dark"] .cw-cell.cw-focused {
          background-color: rgba(242, 128, 20, 0.35) !important;
          border-color: var(--color-primary) !important;
        }

        .cw-cell-num {
          position: absolute;
          top: 2px;
          left: 3px;
          font-size: clamp(0.55rem, 1.4vw, 0.72rem);
          font-weight: 800;
          color: var(--color-gold);
          line-height: 1;
          pointer-events: none;
          z-index: 3;
        }

        .cw-cell-input {
          width: 100%;
          height: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          text-align: center;
          font-size: clamp(1.1rem, 3.2vw, 1.6rem);
          font-weight: 800;
          text-transform: uppercase;
          color: var(--color-text);
          caret-color: transparent;
          cursor: pointer;
          z-index: 2;
          padding: 0;
          margin: 0;
          font-family: inherit;
        }

        .cw-cell-key {
          font-size: clamp(1.1rem, 3.2vw, 1.6rem);
          font-weight: 800;
          text-transform: uppercase;
          color: var(--color-success);
          line-height: 1;
          margin-top: 2px;
        }

        /* ── FOOTER HINT ── */
        .cw-grid-footer {
          margin-top: 0.85rem;
          font-size: 0.75rem;
          color: var(--color-muted);
          text-align: center;
        }

        /* ── MOBILE TABS (< 880px) ── */
        .cw-mobile-tabs {
          display: none;
          width: 100%;
          background: var(--color-surface-2);
          padding: 0.25rem;
          border-radius: var(--radius-md, 10px);
          border: 1px solid var(--color-border);
          gap: 0.35rem;
          margin-bottom: 0.75rem;
        }

        @media (max-width: 880px) {
          .cw-mobile-tabs {
            display: flex;
          }
        }

        .cw-mobile-tab-btn {
          flex: 1;
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 800;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .cw-mobile-tab-btn.active {
          background: var(--color-primary);
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        /* ── CLUES PANEL ── */
        .cw-clues-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }

        @media (min-width: 881px) {
          .cw-clues-panel {
            max-height: 560px;
            overflow-y: auto;
            padding-right: 0.35rem;
          }
        }

        .cw-clue-card {
          background: var(--color-surface);
          padding: 1.15rem;
          border-radius: var(--radius-lg, 16px);
          border: 1.5px solid var(--color-border);
          box-shadow: var(--shadow-card);
        }

        @media (max-width: 880px) {
          .cw-clue-card.cw-mobile-hidden {
            display: none !important;
          }
        }

        .cw-clue-card h4 {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--color-gold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding-bottom: 0.45rem;
          margin: 0 0 0.75rem 0;
          border-bottom: 1.5px solid var(--color-border-gold);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .cw-clue-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .cw-clue-item {
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-md, 8px);
          border-left: 3.5px solid transparent;
          background: var(--color-surface-2);
          color: var(--color-text);
          cursor: pointer;
          transition: all var(--transition-base, 0.15s ease);
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .cw-clue-item:hover {
          background: var(--color-surface-3);
          border-left-color: var(--color-gold);
        }

        /* Selected Clue Item */
        .cw-clue-item.selected {
          border-left-color: var(--color-primary) !important;
          color: var(--color-text) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        [data-theme="light"] .cw-clue-item.selected {
          background: #FEF3C7 !important;
          border-left-color: var(--color-primary) !important;
          color: #1F1633 !important;
        }

        [data-theme="dark"] .cw-clue-item.selected {
          background: rgba(242, 128, 20, 0.22) !important;
          border-left-color: var(--color-primary) !important;
          color: #FFFFFF !important;
        }

        .cw-clue-item.completed {
          opacity: 0.65;
        }

        .cw-clue-header-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cw-clue-label {
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--color-gold);
        }

        [data-theme="light"] .cw-clue-item.selected .cw-clue-label {
          color: var(--color-primary);
        }

        [data-theme="dark"] .cw-clue-item.selected .cw-clue-label {
          color: var(--color-gold);
        }

        .cw-clue-desc {
          font-size: 0.9rem;
          line-height: 1.45;
          margin: 0;
          color: inherit;
        }
      `}</style>

      <div className="cw-wrapper">
        <div className="cw-layout-grid">
          {/* Column 1: Grid Panel */}
          <div className="cw-grid-panel">
            {/* Active Clue Command Strip */}
            <div className="cw-active-banner">
              <div className="cw-active-banner-row">
                <div className="cw-active-badge-group">
                  <span className="cw-badge">
                    {currentActiveWord
                      ? `${currentActiveWord.number} ${getDirectionLabel(currentActiveWord.direction)} • ${currentActiveWord.word.length} ${t.crossword?.letters || (language === 'hi' ? 'अक्षर' : language === 'pt' ? 'letras' : 'letters')}`
                      : t.crossword?.selectCell || 'Select Cell'}
                  </span>
                  {currentActiveWord?.reference && (
                    <span className="cw-ref-tag">{currentActiveWord.reference}</span>
                  )}
                </div>

                <div className="cw-banner-controls">
                  <button type="button" className="cw-banner-btn" onClick={handlePrevClue} title="Previous Clue">
                    {t.crossword?.prevClue || '‹ Prev'}
                  </button>
                  <button type="button" className="cw-banner-btn" onClick={handleNextClue} title="Next Clue">
                    {t.crossword?.nextClue || 'Next ›'}
                  </button>
                </div>
              </div>

              <p className="cw-active-clue-text">
                <FormattedText
                  text={getClueText(currentActiveWord) || t.crossword?.tapCellPrompt || 'Tap any cell or select a clue below.'}
                  inline
                  as="span"
                />
              </p>

              {getVerseText(currentActiveWord) && (
                <button
                  type="button"
                  className="cw-verse-btn"
                  onClick={() => setShowVerseModal(currentActiveWord)}
                >
                  {t.crossword?.viewVerseContext || '📜 View Verse Context'}
                </button>
              )}
            </div>

            {/* Matrix Board */}
            <div className="cw-matrix-wrapper">
              <div className="cw-matrix">
                {Array.from({ length: layout.rows }).map((_, r) =>
                  Array.from({ length: layout.cols }).map((_, c) => {
                    const coord = `${r},${c}`
                    const cell = layout.grid[coord]

                    if (!cell) {
                      return <div key={coord} className="cw-cell cw-inactive" />
                    }

                    const isFocused = activeCell?.r === r && activeCell?.c === c
                    const isPath = activeWordLetters.has(coord)
                    const userLetter = userCells[coord] || ''
                    const keyLetter = cell.letter || ''

                    return (
                      <div
                        key={coord}
                        className={`cw-cell cw-active ${isPath ? 'cw-path' : ''} ${isFocused ? 'cw-focused' : ''}`}
                        onClick={() => handleCellClick(r, c)}
                      >
                        {cell.number && <span className="cw-cell-num">{cell.number}</span>}

                        {revealAnswerKey ? (
                          <span className="cw-cell-key">{keyLetter}</span>
                        ) : (
                          <input
                            id={`cw-cell-${coord}`}
                            type="text"
                            maxLength={2}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="characters"
                            spellCheck="false"
                            className="cw-cell-input"
                            value={userLetter}
                            onFocus={() => handleCellClick(r, c)}
                            onKeyDown={e => handleInputKeyDown(r, c, e)}
                            onChange={e => handleInputChange(r, c, e.target.value)}
                          />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="cw-grid-footer">
              {t.crossword?.hintFooter || 'Tip: Press Space or tap a cell to switch direction • Arrows to navigate'}
            </div>
          </div>

          {/* Column 2: Clues Panel (Desktop: both lists stacked; Mobile: tabbed) */}
          <div className="cw-clues-panel">
            {/* Mobile Tab Bar (< 880px) */}
            <div className="cw-mobile-tabs">
              <button
                type="button"
                className={`cw-mobile-tab-btn ${mobileTab === 'across' ? 'active' : ''}`}
                onClick={() => {
                  setMobileTab('across')
                  setActiveDirection('across')
                }}
              >
                ➡️ {getDirectionLabel('across')} ({acrossClues.length})
              </button>
              <button
                type="button"
                className={`cw-mobile-tab-btn ${mobileTab === 'down' ? 'active' : ''}`}
                onClick={() => {
                  setMobileTab('down')
                  setActiveDirection('down')
                }}
              >
                ⬇️ {getDirectionLabel('down')} ({downClues.length})
              </button>
            </div>

            {/* Across Clues (Always visible on desktop; on mobile visible when mobileTab === 'across') */}
            <div className={`cw-clue-card ${mobileTab !== 'across' ? 'cw-mobile-hidden' : ''}`}>
              <h4>
                <span>➡️</span> {getDirectionLabel('across')} ({acrossClues.length})
              </h4>
              <div className="cw-clue-list">
                {acrossClues.map(w => {
                  const isSelected = activeClueNumber === w.number && activeDirection === 'across'
                  const isDone = isWordCompleted(w)
                  return (
                    <div
                      key={`across-${w.number}`}
                      id={`clue-${w.number}-across`}
                      className={`cw-clue-item ${isSelected ? 'selected' : ''} ${isDone ? 'completed' : ''}`}
                      onClick={() => handleClueClick(w)}
                    >
                      <div className="cw-clue-header-line">
                        <span className="cw-clue-label">
                          {w.number}. ({w.word.length} {t.crossword?.letters || (language === 'hi' ? 'अक्षर' : language === 'pt' ? 'letras' : 'letters')}) {isDone && '✓'}
                        </span>
                        {w.reference && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>
                            {w.reference}
                          </span>
                        )}
                      </div>
                      <p className="cw-clue-desc">
                        <FormattedText text={getClueText(w)} inline as="span" />
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Down Clues (Always visible on desktop; on mobile visible when mobileTab === 'down') */}
            <div className={`cw-clue-card ${mobileTab !== 'down' ? 'cw-mobile-hidden' : ''}`}>
              <h4>
                <span>⬇️</span> {getDirectionLabel('down')} ({downClues.length})
              </h4>
              <div className="cw-clue-list">
                {downClues.map(w => {
                  const isSelected = activeClueNumber === w.number && activeDirection === 'down'
                  const isDone = isWordCompleted(w)
                  return (
                    <div
                      key={`down-${w.number}`}
                      id={`clue-${w.number}-down`}
                      className={`cw-clue-item ${isSelected ? 'selected' : ''} ${isDone ? 'completed' : ''}`}
                      onClick={() => handleClueClick(w)}
                    >
                      <div className="cw-clue-header-line">
                        <span className="cw-clue-label">
                          {w.number}. ({w.word.length} {t.crossword?.letters || (language === 'hi' ? 'अक्षर' : language === 'pt' ? 'letras' : 'letters')}) {isDone && '✓'}
                        </span>
                        {w.reference && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>
                            {w.reference}
                          </span>
                        )}
                      </div>
                      <p className="cw-clue-desc">
                        <FormattedText text={getClueText(w)} inline as="span" />
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Verse Context Modal */}
        {showVerseModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setShowVerseModal(null)}
          >
            <div
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border-gold)',
                borderRadius: 'var(--radius-lg, 16px)',
                padding: '1.5rem',
                maxWidth: '520px',
                width: '100%',
                boxShadow: 'var(--shadow-card)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-gold)' }}>
                  {t.crossword?.verseContextTitle || 'Verse Context'} ({showVerseModal.reference || `Clue ${showVerseModal.number}`})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVerseModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted)',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--color-text)', margin: '0 0 1rem 0', fontStyle: 'italic' }}>
                {getVerseText(showVerseModal)}
              </p>
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowVerseModal(null)}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.45rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {t.crossword?.close || 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
