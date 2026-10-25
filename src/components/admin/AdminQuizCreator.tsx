'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { Quiz, Question, Difficulty } from '@/types/quiz'
import type { AdminQuizCreatorProps, SupportedLang, EditorFormat } from './creator/types'
import {
  LANG_CONFIG,
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
}: AdminQuizCreatorProps) {
  const { user } = useAuth()

  // 1. Metadata Form State
  const [titles, setTitles] = useState<Record<SupportedLang, string>>({
    en: '',
    hi: '',
    pt: '',
  })
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [category, setCategory] = useState<string>('64-principles')
  const [descriptions, setDescriptions] = useState<Record<SupportedLang, string>>({
    en: '',
    hi: '',
    pt: '',
  })
  const title = titles.en || ''
  const description = descriptions.en || ''
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [timeLimitMins, setTimeLimitMins] = useState(12)
  const [onTimeExpiry, setOnTimeExpiry] = useState<'submit-partial' | 'block-submit'>('submit-partial')
  const [authorName, setAuthorName] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)

  // 2. Multilingual Questions State
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

  // 3. UI / Validation State
  const [parseError, setParseError] = useState<string | null>(null)
  const [cleanLog, setCleanLog] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null)

  // Function to load any existing quiz for editing
  const loadQuizForEditing = async (targetId: string) => {
    if (!targetId) return
    setLoadingQuiz(true)
    setParseError(null)
    setPublishedId(null)

    try {
      const res = await fetch(`/api/quiz/${targetId}?raw=true&t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Could not load quiz "${targetId}" from database.`)
      const data = await res.json()

      const qObj = data.questions || {}
      const metaObj = qObj._meta || {}

      const loadedTitles: Record<SupportedLang, string> = {
        en: data.titles?.en || metaObj.titles?.en || data.title || '',
        hi: data.titles?.hi || metaObj.titles?.hi || '',
        pt: data.titles?.pt || metaObj.titles?.pt || '',
      }
      const loadedDescriptions: Record<SupportedLang, string> = {
        en: data.descriptions?.en || metaObj.descriptions?.en || data.description || '',
        hi: data.descriptions?.hi || metaObj.descriptions?.hi || '',
        pt: data.descriptions?.pt || metaObj.descriptions?.pt || '',
      }

      setTitles(loadedTitles)
      setSlug(data.id || targetId)
      setIsSlugManual(true)
      setCategory(data.category || 'general')
      setDescriptions(loadedDescriptions)
      setDifficulty(data.difficulty || 'medium')
      setTimeLimitMins(Math.round((data.time_limit || 720) / 60))
      setOnTimeExpiry(data.on_time_expiry || 'submit-partial')
      setAuthorName(data.author_name || '')
      setIsPublished(data.is_published !== false)
      setIsEditingExisting(true)

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
        title: loadedTitles.en,
        titles: loadedTitles,
        slug: data.id || targetId,
        category: data.category || 'general',
        description: loadedDescriptions.en,
        descriptions: loadedDescriptions,
        difficulty: data.difficulty || 'medium',
        timeLimitMins: Math.round((data.time_limit || 720) / 60),
        onTimeExpiry: data.on_time_expiry || 'submit-partial',
        authorName: data.author_name || '',
        isPublished: data.is_published !== false,
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
    setTitles({ en: '', hi: '', pt: '' })
    setSlug('')
    setIsSlugManual(false)
    setCategory('64-principles')
    setDescriptions({ en: '', hi: '', pt: '' })
    setDifficulty('medium')
    setTimeLimitMins(12)
    setOnTimeExpiry('submit-partial')
    setIsPublished(true)
    setIsEditingExisting(false)
    setPublishedId(null)
    setLastSavedSnapshot(null)
    setQuestionsRaw({ en: '', hi: '', pt: '' })
    setParsedQuestions({ en: [], hi: [], pt: [] })
    onClearEditingQuiz?.()
  }

  // Initialize author name from user profile once loaded
  useEffect(() => {
    if (user && !authorName) {
      const displayName = user.full_name || user.email?.split('@')[0] || ''
      if (displayName) setAuthorName(displayName)
    }
  }, [user, authorName])

  // Localized title & description handlers
  const handleLocalizedTitleChange = (lang: SupportedLang, val: string) => {
    setTitles(prev => ({ ...prev, [lang]: val }))
    if (lang === 'en' && !isSlugManual) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(autoSlug)
    }
  }

  const handleTitleChange = (val: string) => {
    handleLocalizedTitleChange('en', val)
  }

  const handleLocalizedDescriptionChange = (lang: SupportedLang, val: string) => {
    setDescriptions(prev => ({ ...prev, [lang]: val }))
  }

  const handleDescriptionChange = (val: string) => {
    handleLocalizedDescriptionChange('en', val)
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
    const effectiveTitle = titles[activeLang]?.trim() || titles.en || 'Untitled Quiz'
    const effectiveDescription = descriptions[activeLang]?.trim() || descriptions.en || ''
    const fullMd = quizToMarkdown({
      id: slug || 'quiz',
      title: effectiveTitle,
      category: category as any,
      description: effectiveDescription,
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
    const effectiveTitle = titles[activeLang]?.trim() || titles.en || 'Untitled Quiz'
    const effectiveDescription = descriptions[activeLang]?.trim() || descriptions.en || ''
    const fullQuiz = {
      id: slug || 'quiz',
      title: effectiveTitle,
      category,
      description: effectiveDescription,
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
      const canonicalTitle = titles.en?.trim() || Object.values(titles).find(t => t.trim())
      if (!canonicalTitle) throw new Error('Please enter a Quiz Title.')
      if (!slug.trim()) throw new Error('Please enter a unique Quiz Slug / ID.')

      const activeText = questionsRaw[activeLang]
      const langLabel = LANG_CONFIG.find(l => l.key === activeLang)?.label || activeLang

      // Hindi and Portuguese questions are completely optional
      if (!activeText.trim()) {
        if (activeLang === 'en') {
          throw new Error('Please paste questions for the English tab (English is required as the baseline).')
        } else {
          // Clear any parsed questions for this optional language
          setParsedQuestions(prev => ({
            ...prev,
            [activeLang]: [],
          }))
          setCleanLog([
            `ℹ️ [${langLabel}] Questions left blank. Quiz will automatically fallback to English for ${langLabel} devotees.`,
          ])
          return
        }
      }

      const { questions: validatedList, legacyMetadata } = cleanAndParseQuestionArray(activeText, logs)

      if (legacyMetadata) {
        if (legacyMetadata.title) {
          setTitles(prev => ({ ...prev, [activeLang]: legacyMetadata.title || prev[activeLang] }))
          if (activeLang === 'en' && !slug && legacyMetadata.id) {
            setSlug(legacyMetadata.id)
            setIsSlugManual(true)
          }
        }
        if (legacyMetadata.description) {
          setDescriptions(prev => ({ ...prev, [activeLang]: legacyMetadata.description || prev[activeLang] }))
        }
        if (!slug && legacyMetadata.id) {
          setSlug(legacyMetadata.id)
          setIsSlugManual(true)
        }
        if (legacyMetadata.category) setCategory(legacyMetadata.category)
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
      const canonicalTitle = titles.en.trim() || Object.values(titles).find(t => t.trim()) || ''
      if (!canonicalTitle) throw new Error('Please provide an English Quiz Title.')
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

      // Fallback if only non-en was entered
      if (!questionsPayload.en) {
        const firstKey = Object.keys(questionsPayload)[0]
        if (firstKey) questionsPayload.en = questionsPayload[firstKey]
      }

      const payload = {
        id: slug.trim(),
        title: canonicalTitle,
        titles: {
          en: titles.en.trim() || canonicalTitle,
          ...(titles.hi.trim() ? { hi: titles.hi.trim() } : {}),
          ...(titles.pt.trim() ? { pt: titles.pt.trim() } : {}),
        },
        category,
        description: descriptions.en.trim() || Object.values(descriptions).find(d => d.trim()) || '',
        descriptions: {
          en: descriptions.en.trim(),
          ...(descriptions.hi.trim() ? { hi: descriptions.hi.trim() } : {}),
          ...(descriptions.pt.trim() ? { pt: descriptions.pt.trim() } : {}),
        },
        difficulty,
        time_limit: timeLimitMins * 60,
        on_time_expiry: onTimeExpiry,
        author_name: authorName.trim() || 'Brahmā-Jijñāsā Devotee',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        is_published: isPublished,
        tags: [category],
        questions: questionsPayload,
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
        title: titles.en,
        titles,
        slug,
        category,
        description: descriptions.en,
        descriptions,
        difficulty,
        timeLimitMins,
        onTimeExpiry,
        authorName,
        isPublished,
        questionsRaw,
      }))
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

  // Construct current quiz for dry-run
  const activeQuestionsList = parsedQuestions[activeLang].length > 0
    ? parsedQuestions[activeLang]
    : parsedQuestions.en

  const dryRunQuizCandidate: Quiz | null = activeQuestionsList.length > 0 ? {
    id: slug || 'test-preview',
    title: titles[activeLang]?.trim() || titles.en || 'Quiz Preview',
    titles,
    category: category as any,
    description: descriptions[activeLang]?.trim() || descriptions.en || '',
    descriptions,
    difficulty,
    timeLimit: timeLimitMins * 60,
    onTimeExpiry: onTimeExpiry,
    questions: activeQuestionsList,
  } : null

  // Change tracking & unsaved changes detection
  const currentSnapshot = computeQuizSnapshot({
    title: titles.en,
    titles,
    slug,
    category,
    description: descriptions.en,
    descriptions,
    difficulty,
    timeLimitMins,
    onTimeExpiry,
    authorName,
    isPublished,
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
        title={titles.en}
        titles={titles}
        onTitleChange={handleTitleChange}
        onLocalizedTitleChange={handleLocalizedTitleChange}
        slug={slug}
        onSlugChange={val => {
          setIsSlugManual(true)
          setSlug(val)
        }}
        category={category}
        onCategoryChange={setCategory}
        description={descriptions.en}
        descriptions={descriptions}
        onDescriptionChange={handleDescriptionChange}
        onLocalizedDescriptionChange={handleLocalizedDescriptionChange}
        activeLang={activeLang}
        onActiveLangChange={setActiveLang}
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
        title={titles[activeLang]?.trim() || title}
        description={descriptions[activeLang]?.trim() || description}
        category={category}
        timeLimitMins={timeLimitMins}
        slug={slug}
        authorName={authorName}
        cleanLog={cleanLog}
      />
    </div>
  )
}
