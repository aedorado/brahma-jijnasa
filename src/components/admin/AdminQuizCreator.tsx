'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { Quiz, Question, Difficulty } from '@/types/quiz'
import type { QuizSeriesRound } from '@/types/series'

import type { AdminQuizCreatorProps, SupportedLang, EditorFormat } from './creator/types'
import {
  LANG_CONFIG,
  toLocalDatetimeString,
  localToIsoString,
  formatIstDisplay,
  cleanAndParseQuestionArray,
  computeQuizSnapshot,
} from './creator/utils'
import { isMarkdownQuiz, questionsToMarkdown, quizToMarkdown } from '@/lib/quiz-markdown'
import { QuizPublishedAlert } from './creator/QuizPublishedAlert'
import { QuizMetadataForm } from './creator/QuizMetadataForm'
import { QuizQuestionsEditor } from './creator/QuizQuestionsEditor'
import { QuizPreviewList } from './creator/QuizPreviewList'

export function AdminQuizCreator({
  onQuizPublished,
  onSwitchToCatalog,
  onDryRunQuiz,
  editingQuizId,
  onClearEditingQuiz,
  catalogQuizzes = [],
  initialSeriesDay,
  onClearInitialSeriesDay,
}: AdminQuizCreatorProps) {
  const { user } = useAuth()

  // 1. Metadata Form State
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [category, setCategory] = useState<string>('64-principles')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [timeLimitMins, setTimeLimitMins] = useState(12)
  const [onTimeExpiry, setOnTimeExpiry] = useState<'submit-partial' | 'block-submit'>('submit-partial')
  const [authorName, setAuthorName] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)

  // 2. Series Campaign Linking State
  const [seriesRounds, setSeriesRounds] = useState<QuizSeriesRound[]>([])
  const [linkToSeries, setLinkToSeries] = useState(false)
  const [selectedSeriesDay, setSelectedSeriesDay] = useState<number | null>(null)
  const [unlockAtInput, setUnlockAtInput] = useState('')
  const [seriesSearchQuery, setSeriesSearchQuery] = useState('')

  // 3. Multilingual Questions State
  const [activeLang, setActiveLang] = useState<SupportedLang>('en')
  const [questionsRaw, setQuestionsRaw] = useState<Record<SupportedLang, string>>({
    en: '',
    hi: '',
    pt: '',
  })
  const [parsedQuestions, setParsedQuestions] = useState<Record<SupportedLang, Question[]>>({
    en: [],
    hi: [],
    pt: [],
  })
  const [editorFormat, setEditorFormat] = useState<EditorFormat>('markdown')

  // 4. UI / Validation State
  const [parseError, setParseError] = useState<string | null>(null)
  const [cleanLog, setCleanLog] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null)

function parseSeriesDayFromSlug(slug: string): number | null {
  if (slug === '64-day-d3') return -2
  if (slug === '64-day-d2') return -1
  if (slug === '64-day-d1') return 0
  const match = slug.match(/^64-day-0*(\d+)$/)
  if (match) return parseInt(match[1], 10)
  return null
}

  // Fetch series rounds
  const fetchSeriesRounds = useCallback(async () => {
    try {
      const res = await fetch(`/api/series/sacred-teachings-64-principles?t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.rounds)) {
          setSeriesRounds(data.rounds)
        }
      }
    } catch (e) {
      console.warn('Failed to load series rounds:', e)
    }
  }, [])

  useEffect(() => {
    fetchSeriesRounds()
  }, [fetchSeriesRounds])

  // Handle incoming initialSeriesDay prop
  useEffect(() => {
    if (initialSeriesDay !== null && initialSeriesDay !== undefined && seriesRounds.length > 0) {
      const round = seriesRounds.find(r => r.day_number === initialSeriesDay)
      if (round) {
        setLinkToSeries(true)
        setSelectedSeriesDay(round.day_number)
        setCategory('64-principles')
        const conventionSlug = round.day_number <= 0 ? `64-day-d${Math.abs(round.day_number) + 1}` : `64-day-${String(round.day_number).padStart(2, '0')}`
        setSlug(round.quiz_id || conventionSlug)
        setIsSlugManual(true)
        if (!title || title.startsWith('Day ') || title === 'Untitled Quiz') {
          setTitle(round.title || `Day ${round.day_number}: Sacred Teachings`)
        }
        if (round.unlock_at) {
          setUnlockAtInput(toLocalDatetimeString(round.unlock_at))
        }
      }
    }
  }, [initialSeriesDay, seriesRounds])

  // Function to load any existing quiz for editing
  const loadQuizForEditing = async (targetId: string) => {
    if (!targetId) return
    setLoadingQuiz(true)
    setParseError(null)
    setPublishedId(null)

    try {
      const roundsPromise: Promise<QuizSeriesRound[]> = fetch(`/api/series/sacred-teachings-64-principles?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => (d && Array.isArray(d.rounds) ? (d.rounds as QuizSeriesRound[]) : seriesRounds))
        .catch(() => seriesRounds)

      const [res, freshRounds] = await Promise.all([
        fetch(`/api/quiz/${targetId}?raw=true&t=${Date.now()}`, { cache: 'no-store' }),
        roundsPromise,
      ])

      const activeRounds: QuizSeriesRound[] = (freshRounds && freshRounds.length > 0) ? freshRounds : seriesRounds
      if (freshRounds && freshRounds.length > 0) {
        setSeriesRounds(freshRounds)
      }

      if (!res.ok) throw new Error(`Could not load quiz "${targetId}" from database.`)
      const data = await res.json()

      setTitle(data.title || '')
      setSlug(data.id || targetId)
      setIsSlugManual(true)
      setCategory(data.category || 'general')
      setDescription(data.description || '')
      setDifficulty(data.difficulty || 'medium')
      setTimeLimitMins(Math.round((data.time_limit || 720) / 60))
      setOnTimeExpiry(data.on_time_expiry || 'submit-partial')
      setAuthorName(data.author_name || '')
      setIsPublished(data.is_published !== false)
      setIsEditingExisting(true)

      // Check if linked to series
      const matchedRound = activeRounds.find((r: QuizSeriesRound) => Boolean(r.quiz_id && (r.quiz_id === targetId || r.quiz_id === data.id)))
      if (matchedRound) {
        setLinkToSeries(true)
        setSelectedSeriesDay(matchedRound.day_number)
        if (matchedRound.unlock_at) {
          setUnlockAtInput(toLocalDatetimeString(matchedRound.unlock_at))
        }
      } else {
        setLinkToSeries(false)
        setSelectedSeriesDay(null)
        setUnlockAtInput('')
      }

      const qObj = data.questions || {}
      const rawMap: Record<SupportedLang, string> = { en: '', hi: '', pt: '' }
      const parsedMap: Record<SupportedLang, Question[]> = { en: [], hi: [], pt: [] }

      for (const lang of ['en', 'hi', 'pt'] as SupportedLang[]) {
        if (Array.isArray(qObj[lang]) && qObj[lang].length > 0) {
          parsedMap[lang] = qObj[lang]
          rawMap[lang] = editorFormat === 'markdown'
            ? questionsToMarkdown(qObj[lang])
            : JSON.stringify(qObj[lang], null, 2)
        }
      }

      // If active language has no questions but English does, default to en
      if (!parsedMap[activeLang]?.length && parsedMap.en?.length) {
        setActiveLang('en')
      }

      setQuestionsRaw(rawMap)
      setParsedQuestions(parsedMap)

      const loadedSnapshot = computeQuizSnapshot({
        title: data.title || '',
        slug: data.id || targetId,
        category: data.category || 'general',
        description: data.description || '',
        difficulty: data.difficulty || 'medium',
        timeLimitMins: Math.round((data.time_limit || 720) / 60),
        onTimeExpiry: data.on_time_expiry || 'submit-partial',
        authorName: data.author_name || '',
        isPublished: data.is_published !== false,
        linkToSeries: Boolean(matchedRound),
        selectedSeriesDay: matchedRound ? matchedRound.day_number : null,
        unlockAtInput: matchedRound?.unlock_at ? toLocalDatetimeString(matchedRound.unlock_at) : '',
        questionsRaw: rawMap,
      })
      setLastSavedSnapshot(loadedSnapshot)
    } catch (err: any) {
      setParseError(err.message || 'Failed to load quiz for editing.')
    } finally {
      setLoadingQuiz(false)
    }
  }

  // Handle incoming editingQuizId prop
  useEffect(() => {
    if (editingQuizId) {
      loadQuizForEditing(editingQuizId)
    }
  }, [editingQuizId])

  // Reset to empty new quiz
  const handleResetToNew = () => {
    setTitle('')
    setSlug('')
    setIsSlugManual(false)
    setCategory('64-principles')
    setDescription('')
    setDifficulty('medium')
    setTimeLimitMins(12)
    setOnTimeExpiry('submit-partial')
    setIsPublished(true)
    setIsEditingExisting(false)
    setPublishedId(null)
    setLastSavedSnapshot(null)
    setQuestionsRaw({ en: '', hi: '', pt: '' })
    setParsedQuestions({ en: [], hi: [], pt: [] })
    setLinkToSeries(false)
    setSelectedSeriesDay(null)
    setUnlockAtInput('')
    setSeriesSearchQuery('')
    onClearInitialSeriesDay?.()
    onClearEditingQuiz?.()
  }

  // Initialize author name from user profile once loaded
  useEffect(() => {
    if (user && !authorName) {
      const displayName = user.full_name || user.email?.split('@')[0] || ''
      if (displayName) setAuthorName(displayName)
    }
  }, [user, authorName])

  // Auto-slugify when title changes if user hasn't typed a custom slug
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isSlugManual) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(autoSlug)
    }
  }

  const handleToggleEditorFormat = (targetFormat: EditorFormat) => {
    if (targetFormat === editorFormat) return
    setEditorFormat(targetFormat)

    const newRaw: Record<SupportedLang, string> = { ...questionsRaw }
    for (const lang of ['en', 'hi', 'pt'] as SupportedLang[]) {
      const currentParsed = parsedQuestions[lang]
      const currentRaw = questionsRaw[lang].trim()

      if (targetFormat === 'markdown') {
        // Convert to Markdown
        if (currentParsed && currentParsed.length > 0) {
          newRaw[lang] = questionsToMarkdown(currentParsed)
        } else if (currentRaw) {
          try {
            const logs: string[] = []
            const { questions: parsedList } = cleanAndParseQuestionArray(currentRaw, logs)
            if (parsedList.length > 0) {
              newRaw[lang] = questionsToMarkdown(parsedList)
              setParsedQuestions(prev => ({ ...prev, [lang]: parsedList }))
            }
          } catch {
            // retain raw if unparseable
          }
        }
      } else {
        // Convert to JSON
        if (currentParsed && currentParsed.length > 0) {
          newRaw[lang] = JSON.stringify(currentParsed, null, 2)
        } else if (currentRaw) {
          try {
            const logs: string[] = []
            const { questions: parsedList } = cleanAndParseQuestionArray(currentRaw, logs)
            if (parsedList.length > 0) {
              newRaw[lang] = JSON.stringify(parsedList, null, 2)
              setParsedQuestions(prev => ({ ...prev, [lang]: parsedList }))
            }
          } catch {
            // retain raw if unparseable
          }
        }
      }
    }
    setQuestionsRaw(newRaw)
  }

  const handleRawChange = (val: string) => {
    setQuestionsRaw(prev => ({ ...prev, [activeLang]: val }))
    setParsedQuestions(prev => ({ ...prev, [activeLang]: [] }))
    if (parseError) setParseError(null)

    // Auto-detect format if user pastes opposite format
    const trimmed = val.trim()
    if (editorFormat === 'json' && isMarkdownQuiz(trimmed)) {
      setEditorFormat('markdown')
    } else if (editorFormat === 'markdown' && trimmed.startsWith('[') && trimmed.includes('"type"')) {
      setEditorFormat('json')
    }
  }

  const handleDownloadMarkdown = () => {
    const list = parsedQuestions[activeLang]?.length > 0 ? parsedQuestions[activeLang] : parsedQuestions.en
    const fullMd = quizToMarkdown({
      id: slug || 'quiz',
      title: title || 'Untitled Quiz',
      category: category as any,
      description,
      difficulty,
      timeLimit: timeLimitMins * 60,
      onTimeExpiry,
      questions: list,
    })
    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug || 'quiz'}.${activeLang}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadJson = () => {
    const list = parsedQuestions[activeLang]?.length > 0 ? parsedQuestions[activeLang] : parsedQuestions.en
    const fullQuiz = {
      id: slug || 'quiz',
      title: title || 'Untitled Quiz',
      category,
      description,
      difficulty,
      timeLimit: timeLimitMins * 60,
      onTimeExpiry,
      questions: list,
    }
    const blob = new Blob([JSON.stringify(fullQuiz, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug || 'quiz'}.${activeLang}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Validate the current language questions & form inputs
  const handleValidateQuestions = () => {
    setParseError(null)
    setCleanLog([])
    const logs: string[] = []

    try {
      if (!title.trim()) throw new Error('Please enter a Quiz Title.')
      if (!slug.trim()) throw new Error('Please enter a unique Quiz Slug / ID.')

      const activeText = questionsRaw[activeLang]
      if (!activeText.trim()) {
        throw new Error(`Please paste questions for ${LANG_CONFIG.find(l => l.key === activeLang)?.label || activeLang} tab.`)
      }

      const { questions: validatedList, legacyMetadata } = cleanAndParseQuestionArray(activeText, logs)

      if (legacyMetadata) {
        if (!title && legacyMetadata.title) setTitle(legacyMetadata.title)
        if (!slug && legacyMetadata.id) {
          setSlug(legacyMetadata.id)
          setIsSlugManual(true)
        }
        if (legacyMetadata.category) setCategory(legacyMetadata.category)
        if (legacyMetadata.description) setDescription(legacyMetadata.description)
        if (legacyMetadata.difficulty) setDifficulty(legacyMetadata.difficulty)
        if (legacyMetadata.timeLimit) setTimeLimitMins(Math.round(legacyMetadata.timeLimit / 60))
        if (legacyMetadata.onTimeExpiry) setOnTimeExpiry(legacyMetadata.onTimeExpiry)
      }

      setParsedQuestions(prev => ({
        ...prev,
        [activeLang]: validatedList,
      }))
      setCleanLog(logs)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON syntax. Please check the pasted questions.'
      setParseError(msg)
    }
  }

  // Save / Publish Quiz
  const handlePublish = async () => {
    setPublishing(true)
    setParseError(null)

    try {
      if (!title.trim()) throw new Error('Please provide a Quiz Title.')
      if (!slug.trim()) throw new Error('Please provide a Quiz Slug (ID).')

      // ALWAYS parse and strictly validate questions directly from the raw text areas
      const questionsPayload: Record<string, Question[]> = {}
      const newlyParsed: Record<SupportedLang, Question[]> = { en: [], hi: [], pt: [] }

      for (const lang of ['en', 'hi', 'pt'] as SupportedLang[]) {
        const rawText = questionsRaw[lang].trim()
        if (rawText) {
          const logs: string[] = []
          try {
            const { questions: list } = cleanAndParseQuestionArray(rawText, logs)
            if (list.length > 0) {
              questionsPayload[lang] = list
              newlyParsed[lang] = list
            }
          } catch (err: any) {
            const langLabel = LANG_CONFIG.find(l => l.key === lang)?.label || lang
            throw new Error(`[${langLabel}] ${err.message}`)
          }
        }
      }

      // Update state with newly validated questions
      setParsedQuestions(prev => ({ ...prev, ...newlyParsed }))

      // Ensure at least one language has validated questions
      if (!questionsPayload.en && !questionsPayload.hi && !questionsPayload.pt) {
        throw new Error('Please enter and validate questions for at least one language.')
      }

      if (linkToSeries && selectedSeriesDay === null) {
        throw new Error('Please select which series day to link this quiz to from the dropdown.')
      }

      if (linkToSeries && selectedSeriesDay !== null) {
        const targetRound = seriesRounds.find(r => r.day_number === selectedSeriesDay)
        if (targetRound?.quiz_id && slug && targetRound.quiz_id !== slug.trim()) {
          throw new Error(`Day ${selectedSeriesDay} is already assigned to quiz "${targetRound.quiz_id}". Please choose an unassigned series day.`)
        }
      }

      // Fallback if only non-en was entered
      if (!questionsPayload.en) {
        const firstKey = Object.keys(questionsPayload)[0]
        if (firstKey) questionsPayload.en = questionsPayload[firstKey]
      }

      const payload = {
        id: slug.trim(),
        title: title.trim(),
        category,
        description: description.trim(),
        difficulty,
        time_limit: timeLimitMins * 60,
        on_time_expiry: onTimeExpiry,
        author_name: authorName.trim() || 'Brahmā-Jijñāsā Devotee',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        is_published: isPublished,
        tags: [category],
        questions: questionsPayload,
        link_to_series: linkToSeries,
        series_day_number: linkToSeries && selectedSeriesDay !== null ? selectedSeriesDay : null,
        unlock_at: linkToSeries && unlockAtInput ? localToIsoString(unlockAtInput) : null,
      }

      const res = await fetch('/api/admin/save-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save quiz')

      setPublishedId(data.quizId)
      setIsEditingExisting(true)
      setLastSavedSnapshot(computeQuizSnapshot({
        title,
        slug,
        category,
        description,
        difficulty,
        timeLimitMins,
        onTimeExpiry,
        authorName,
        isPublished,
        linkToSeries,
        selectedSeriesDay,
        unlockAtInput,
        questionsRaw,
      }))
      await fetchSeriesRounds()
      await onQuizPublished(data.quizId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error publishing quiz.'
      setParseError(msg)
    } finally {
      setPublishing(false)
    }
  }

  const handleCopyLink = () => {
    if (!publishedId) return
    navigator.clipboard.writeText(`${window.location.origin}/q/${publishedId}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Only allow unassigned series days, or the day currently linked to THIS quiz, or currently selected day
  const availableSeriesRounds = seriesRounds.filter(round => {
    const isUnassigned = !round.quiz_id || round.quiz_id.trim() === ''
    const isThisQuiz = Boolean(slug && round.quiz_id && round.quiz_id === slug.trim())
    const isCurrentSelection = selectedSeriesDay !== null && round.day_number === selectedSeriesDay
    return isUnassigned || isThisQuiz || isCurrentSelection
  })

  const filteredSeriesRounds = availableSeriesRounds.filter(round => {
    if (!seriesSearchQuery.trim()) return true
    const q = seriesSearchQuery.toLowerCase()
    return (
      String(round.day_number).includes(q) ||
      round.title.toLowerCase().includes(q) ||
      (round.principles_range && round.principles_range.toLowerCase().includes(q))
    )
  })

  const handleSeriesDaySelect = (dayNumStr: string) => {
    if (!dayNumStr) {
      setSelectedSeriesDay(null)
      return
    }
    const dayNum = Number(dayNumStr)
    const round = seriesRounds.find(r => r.day_number === dayNum)
    if (!round) return

    // Prevent selecting a day already linked to another quiz
    if (round.quiz_id && slug && round.quiz_id !== slug.trim()) {
      alert(`Day ${dayNum} is already assigned to quiz "${round.quiz_id}". Cannot link this quiz to an occupied day.`)
      return
    }

    setSelectedSeriesDay(dayNum)
    setCategory('64-principles')
    const conventionSlug = dayNum <= 0 ? `64-day-d${Math.abs(dayNum) + 1}` : `64-day-${String(dayNum).padStart(2, '0')}`
    if (!slug || slug === 'untitled-quiz' || slug.startsWith('64-day-')) {
      setSlug(round.quiz_id || conventionSlug)
    }
    setIsSlugManual(true)
    if (!title || title.startsWith('Day ') || title === 'Untitled Quiz') {
      setTitle(round.title || `Day ${round.day_number}: Sacred Teachings`)
    }
    if (round.unlock_at) {
      setUnlockAtInput(toLocalDatetimeString(round.unlock_at))
    }
  }

  // Construct current quiz for dry-run
  const activeQuestionsList = parsedQuestions[activeLang].length > 0
    ? parsedQuestions[activeLang]
    : parsedQuestions.en

  const dryRunQuizCandidate: Quiz | null = activeQuestionsList.length > 0 ? {
    id: slug || 'test-preview',
    title: title || 'Quiz Preview',
    category: category as any,
    description: description || '',
    difficulty,
    timeLimit: timeLimitMins * 60,
    onTimeExpiry: onTimeExpiry,
    questions: activeQuestionsList,
  } : null

  // Change tracking & unsaved changes detection
  const currentSnapshot = computeQuizSnapshot({
    title,
    slug,
    category,
    description,
    difficulty,
    timeLimitMins,
    onTimeExpiry,
    authorName,
    isPublished,
    linkToSeries,
    selectedSeriesDay,
    unlockAtInput,
    questionsRaw,
  })

  const hasUnsavedChanges = isEditingExisting
    ? (lastSavedSnapshot !== null ? currentSnapshot !== lastSavedSnapshot : false)
    : Boolean(
        title.trim() ||
        slug.trim() ||
        questionsRaw.en.trim() ||
        questionsRaw.hi.trim() ||
        questionsRaw.pt.trim() ||
        description.trim()
      ) && !publishedId

  // Warn user on page reload / navigation if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <div className="animate-fadeIn">
      {/* Published Success Alert */}
      {publishedId && (
        <QuizPublishedAlert
          publishedId={publishedId}
          title={title}
          copiedLink={copiedLink}
          onCopyLink={handleCopyLink}
          onSwitchToCatalog={onSwitchToCatalog}
        />
      )}

      {/* SECTION 1: METADATA FORM */}
      <QuizMetadataForm
        title={title}
        onTitleChange={handleTitleChange}
        slug={slug}
        onSlugChange={val => {
          setIsSlugManual(true)
          setSlug(val)
        }}
        category={category}
        onCategoryChange={setCategory}
        description={description}
        onDescriptionChange={setDescription}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        timeLimitMins={timeLimitMins}
        onTimeLimitMinsChange={setTimeLimitMins}
        authorName={authorName}
        onAuthorNameChange={setAuthorName}
        isPublished={isPublished}
        onIsPublishedChange={setIsPublished}
        isEditingExisting={isEditingExisting}
        hasUnsavedChanges={hasUnsavedChanges}
        loadingQuiz={loadingQuiz}
        onResetToNew={handleResetToNew}
        catalogQuizzes={catalogQuizzes}
        onSelectQuiz={loadQuizForEditing}
        linkToSeries={linkToSeries}
        onToggleLinkToSeries={checked => {
          setLinkToSeries(checked)
          if (!checked) {
            setSelectedSeriesDay(null)
          } else if (selectedSeriesDay === null) {
            const autoDay = parseSeriesDayFromSlug(slug)
            if (autoDay !== null) {
              handleSeriesDaySelect(String(autoDay))
            }
          }
        }}
        selectedSeriesDay={selectedSeriesDay}
        availableSeriesRounds={availableSeriesRounds}
        seriesSearchQuery={seriesSearchQuery}
        onSeriesSearchQueryChange={setSeriesSearchQuery}
        filteredSeriesRounds={filteredSeriesRounds}
        onSeriesDaySelect={handleSeriesDaySelect}
        unlockAtInput={unlockAtInput}
        onUnlockAtInputChange={setUnlockAtInput}
        formatIstDisplay={formatIstDisplay}
      />

      {/* SECTION 2: QUESTIONS EDITOR */}
      <QuizQuestionsEditor
        activeLang={activeLang}
        onActiveLangChange={setActiveLang}
        questionsRaw={questionsRaw}
        parsedQuestions={parsedQuestions}
        hasUnsavedChanges={hasUnsavedChanges}
        editorFormat={editorFormat}
        onToggleEditorFormat={handleToggleEditorFormat}
        onDownloadMarkdown={handleDownloadMarkdown}
        onDownloadJson={handleDownloadJson}
        onRawChange={handleRawChange}
        onClear={() => {
          setQuestionsRaw(prev => ({ ...prev, [activeLang]: '' }))
          setParsedQuestions(prev => ({ ...prev, [activeLang]: [] }))
          setParseError(null)
        }}
        parseError={parseError}
        onValidate={handleValidateQuestions}
        dryRunQuizCandidate={dryRunQuizCandidate}
        onDryRun={onDryRunQuiz}
        publishing={publishing}
        isEditingExisting={isEditingExisting}
        onPublish={handlePublish}
      />

      {/* SECTION 3: VALIDATION PREVIEW */}
      <QuizPreviewList
        questions={activeQuestionsList}
        title={title}
        description={description}
        category={category}
        timeLimitMins={timeLimitMins}
        slug={slug}
        authorName={authorName}
        cleanLog={cleanLog}
      />
    </div>
  )
}
