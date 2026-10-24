'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import type { Quiz, QuizMeta, Question, Category, Difficulty } from '@/types/quiz'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz'
import type { QuizSeriesRound } from '@/types/series'
import { validateQuestionsList } from '@/lib/quiz-validator'

interface AdminQuizCreatorProps {
  onQuizPublished: (quizId: string) => Promise<void>
  onSwitchToCatalog: () => void
  onDryRunQuiz?: (quiz: Quiz) => void
  editingQuizId?: string | null
  onClearEditingQuiz?: () => void
  catalogQuizzes?: QuizMeta[]
  initialSeriesDay?: number | null
  onClearInitialSeriesDay?: () => void
}

type SupportedLang = 'en' | 'hi' | 'pt'

const LANG_CONFIG: { key: SupportedLang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { key: 'pt', label: 'Português', flag: '🇧🇷' },
]

function toLocalDatetimeString(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const MM = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
  } catch {
    return ''
  }
}

function localToIsoString(localStr: string): string | undefined {
  if (!localStr) return undefined
  try {
    const d = new Date(localStr)
    return isNaN(d.getTime()) ? undefined : d.toISOString()
  } catch {
    return undefined
  }
}

function formatIstDisplay(localDatetimeStr: string): string {
  if (!localDatetimeStr) return ''
  try {
    const d = new Date(localDatetimeStr)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(d) + ' IST'
  } catch {
    return ''
  }
}

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

  // 1. Separate Metadata Form State
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

  // 1b. Series Campaign Linking State
  const [seriesRounds, setSeriesRounds] = useState<QuizSeriesRound[]>([])
  const [linkToSeries, setLinkToSeries] = useState(false)
  const [selectedSeriesDay, setSelectedSeriesDay] = useState<number | null>(null)
  const [unlockAtInput, setUnlockAtInput] = useState('')

  // 2. Multilingual Questions State (only questions array per language)
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

  // 3. UI / Validation State
  const [parseError, setParseError] = useState<string | null>(null)
  const [cleanLog, setCleanLog] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // 4. Searchable Quiz Dropdown State
  const [quizDropdownOpen, setQuizDropdownOpen] = useState(false)
  const [quizSearchQuery, setQuizSearchQuery] = useState('')
  const [seriesSearchQuery, setSeriesSearchQuery] = useState('')
  const quizDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quizDropdownRef.current && !quizDropdownRef.current.contains(event.target as Node)) {
        setQuizDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setQuizDropdownOpen(false)
      }
    }
    if (quizDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [quizDropdownOpen])

  // Fetch series rounds on mount
  useEffect(() => {
    let isMounted = true
    async function fetchRounds() {
      try {
        const res = await fetch('/api/series/sacred-teachings-64-principles')
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.rounds)) {
            setSeriesRounds(data.rounds)
          }
        }
      } catch (e) {
        console.warn('Failed to load series rounds:', e)
      }
    }
    fetchRounds()
    return () => { isMounted = false }
  }, [])

  // Handle incoming initialSeriesDay prop
  useEffect(() => {
    if (initialSeriesDay !== null && initialSeriesDay !== undefined && seriesRounds.length > 0) {
      const round = seriesRounds.find(r => r.day_number === initialSeriesDay)
      if (round) {
        setLinkToSeries(true)
        setSelectedSeriesDay(round.day_number)
        setCategory('64-principles')
        setSlug(round.quiz_id)
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
      const res = await fetch(`/api/quiz/${targetId}?raw=true`)
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
      const matchedRound = seriesRounds.find(r => r.quiz_id === targetId || r.quiz_id === data.id)
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
          rawMap[lang] = JSON.stringify(qObj[lang], null, 2)
        }
      }

      // If active language has no questions but English does, default to en
      if (!parsedMap[activeLang]?.length && parsedMap.en?.length) {
        setActiveLang('en')
      }

      setQuestionsRaw(rawMap)
      setParsedQuestions(parsedMap)
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
  }, [editingQuizId, seriesRounds])

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
    setQuestionsRaw({ en: '', hi: '', pt: '' })
    setParsedQuestions({ en: [], hi: [], pt: [] })
    setLinkToSeries(false)
    setSelectedSeriesDay(null)
    setUnlockAtInput('')
    setQuizSearchQuery('')
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

  // Smart question parser & cleaner (cleans markdown fences, array glitches, etc.)
  const cleanAndParseQuestionArray = (input: string, logs: string[]): Question[] => {
    let cleaned = input.trim()
    if (!cleaned) return []

    // 1. Strip markdown fences ```json ... ```
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()
      logs.push('Stripped markdown code fences')
    }

    // 2. Fix NotebookLM glitch: [1][2] -> [1, 2]
    const fixedArray = cleaned.replace(/\[\s*(\d+)\s*\]\s*\[\s*(\d+)\s*\]/g, '[$1, $2]')
    if (fixedArray !== cleaned) {
      cleaned = fixedArray
      logs.push('Auto-corrected NotebookLM array index syntax (e.g. [1][2] → [1, 2])')
    }

    // 3. Fix HTML entities
    cleaned = cleaned.replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch (syntaxErr: any) {
      throw new Error(`Invalid JSON syntax: ${syntaxErr.message || 'Check for missing brackets, quotes, or trailing commas.'}`)
    }

    // Handle case where user pasted a whole legacy quiz object instead of just questions
    let qArray: any[] = []
    if (Array.isArray(parsed)) {
      qArray = parsed
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
      qArray = parsed.questions
      logs.push('Detected full legacy quiz JSON: extracted questions array and filled form metadata!')
      if (!title && parsed.title) setTitle(parsed.title)
      if (!slug && parsed.id) {
        setSlug(parsed.id)
        setIsSlugManual(true)
      }
      if (parsed.category) setCategory(parsed.category)
      if (parsed.description) setDescription(parsed.description)
      if (parsed.difficulty) setDifficulty(parsed.difficulty)
      if (parsed.timeLimit) setTimeLimitMins(Math.round(parsed.timeLimit / 60))
      if (parsed.onTimeExpiry) setOnTimeExpiry(parsed.onTimeExpiry)
    } else {
      throw new Error('Input must be a JSON array of questions: [ { "type": "single-choice", ... } ]')
    }

    if (qArray.length === 0) {
      throw new Error('Questions array is empty.')
    }

    // Strict schema & type validation
    const validation = validateQuestionsList(qArray)
    if (!validation.valid) {
      throw new Error(`Question Validation Failed:\n• ${validation.errors.join('\n• ')}`)
    }

    if (validation.warnings.length > 0) {
      logs.push(...validation.warnings)
    }
    logs.push(`✅ Schema check passed: ${validation.normalizedQuestions.length} questions strictly verified against schema.`)

    return validation.normalizedQuestions
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

      const validatedList = cleanAndParseQuestionArray(activeText, logs)
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
            const list = cleanAndParseQuestionArray(rawText, logs)
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
        series_day_number: linkToSeries && selectedSeriesDay !== null ? selectedSeriesDay : undefined,
        unlock_at: linkToSeries && unlockAtInput ? localToIsoString(unlockAtInput) : undefined,
      }

      const res = await fetch('/api/admin/save-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save quiz')

      setPublishedId(data.quizId)
      await onQuizPublished(data.quizId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error publishing quiz.'
      setParseError(msg)
    } finally {
      setPublishing(false)
    }
  }

  // Filtered quizzes for searchable dropdown
  const filteredCatalogQuizzes = catalogQuizzes.filter(q => {
    if (!quizSearchQuery.trim()) return true
    const query = quizSearchQuery.toLowerCase()
    return (
      q.title.toLowerCase().includes(query) ||
      q.id.toLowerCase().includes(query) ||
      (q.category && q.category.toLowerCase().includes(query))
    )
  })

  const selectedQuiz = isEditingExisting ? catalogQuizzes.find(q => q.id === slug) : null

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

  const handleCopyLink = () => {
    if (!publishedId) return
    navigator.clipboard.writeText(`${window.location.origin}/q/${publishedId}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Filter available series days:
  // Days for which a quiz is ALREADY created in the database are NOT shown!
  // (If currently editing an existing quiz, allow its current day)
  const existingQuizIdSet = new Set(catalogQuizzes.map(q => q.id))
  const availableSeriesRounds = seriesRounds.filter(round => {
    if (isEditingExisting && (round.quiz_id === slug || round.day_number === selectedSeriesDay)) {
      return true
    }
    return !existingQuizIdSet.has(round.quiz_id)
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

    setSelectedSeriesDay(dayNum)
    setCategory('64-principles')
    setSlug(round.quiz_id)
    setIsSlugManual(true)
    if (!title || title.startsWith('Day ') || title === 'Untitled Quiz') {
      setTitle(round.title || `Day ${round.day_number}: Sacred Teachings`)
    }
    if (round.unlock_at) {
      setUnlockAtInput(toLocalDatetimeString(round.unlock_at))
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* Published Success Alert */}
      {publishedId && (
        <div
          className="card-gold animate-fadeIn"
          style={{
            padding: '1.75rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-success">🎉 Quiz Published to Supabase CMS</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Immediately live for live classroom & self-study</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                URL: <code style={{ color: 'var(--color-gold)' }}>/q/{publishedId}</code>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopyLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>{copiedLink ? '✓ Copied' : '🔗 Copy Student Link'}</span>
              </button>
              <Link
                href={`/q/${publishedId}`}
                target="_blank"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>👁 Play Test Quiz ↗</span>
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onSwitchToCatalog}
                style={{ border: '1px solid var(--color-border)' }}
              >
                Go to Catalog →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: METADATA FORM */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Quiz Studio & CMS Manager</h2>
              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Supabase Powered</span>
              {isEditingExisting && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  ✏️ Editing: {slug}
                </span>
              )}
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              {isEditingExisting
                ? `Currently editing "${title}". Modify fields or questions below and click Update.`
                : 'Enter quiz details below or choose an existing quiz from the dropdown to edit it.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Searchable Quick Load Dropdown Combobox */}
            {catalogQuizzes.length > 0 && (
              <div ref={quizDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setQuizDropdownOpen(!quizDropdownOpen)}
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.85rem',
                    background: 'var(--color-surface-2)',
                    border: quizDropdownOpen ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                    color: 'var(--color-text)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    maxWidth: 360,
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to search and switch between quizzes"
                >
                  <span style={{ fontSize: '0.85rem' }}>{isEditingExisting ? '✏️' : '➕'}</span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}
                  >
                    {selectedQuiz
                      ? `${selectedQuiz.title.length > 30 ? selectedQuiz.title.slice(0, 30) + '...' : selectedQuiz.title} (${selectedQuiz.id})`
                      : isEditingExisting
                      ? `Edit: ${slug}`
                      : '+ Create Brand New Quiz'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
                    {quizDropdownOpen ? '▲' : '▼'}
                  </span>
                </button>

                {/* Floating Searchable Menu */}
                {quizDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: 380,
                      maxWidth: '92vw',
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 12,
                      boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.3), 0 6px 16px rgba(0, 0, 0, 0.15)',
                      zIndex: 100,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search Input Box */}
                    <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '0.65rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                          🔍
                        </span>
                        <input
                          type="text"
                          value={quizSearchQuery}
                          onChange={e => setQuizSearchQuery(e.target.value)}
                          placeholder="Search quizzes by title, slug, or day..."
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '0.45rem 1.8rem 0.45rem 2.1rem',
                            borderRadius: 7,
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                        {quizSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setQuizSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: '0.5rem',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-muted)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Quizzes List */}
                    <div style={{ maxHeight: 280, overflowY: 'auto', padding: '0.35rem 0' }}>
                      {/* "+ Create Brand New Quiz" Option */}
                      <button
                        type="button"
                        onClick={() => {
                          handleResetToNew()
                          setQuizDropdownOpen(false)
                          setQuizSearchQuery('')
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.6rem 0.9rem',
                          background: !isEditingExisting ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                          color: !isEditingExisting ? 'var(--color-gold)' : 'var(--color-text)',
                          border: 'none',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>➕</span>
                        <span>+ Create Brand New Quiz</span>
                        {!isEditingExisting && <span style={{ marginLeft: 'auto' }}>✓</span>}
                      </button>

                      {filteredCatalogQuizzes.length === 0 ? (
                        <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                          No quizzes match "{quizSearchQuery}"
                        </div>
                      ) : (
                        filteredCatalogQuizzes.map(q => {
                          const isSelected = isEditingExisting && slug === q.id
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                loadQuizForEditing(q.id)
                                setQuizDropdownOpen(false)
                                setQuizSearchQuery('')
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.55rem 0.9rem',
                                background: isSelected ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.15rem',
                                borderBottom: '1px solid rgba(128, 128, 128, 0.08)',
                                transition: 'background 0.12s ease',
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)'
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--color-gold)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  ✏️ {q.title}
                                </span>
                                {isSelected && <span style={{ color: 'var(--color-gold)', fontWeight: 800, fontSize: '0.8rem' }}>✓</span>}
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                                <span style={{ fontFamily: 'monospace', color: 'var(--color-gold)' }}>{q.id}</span>
                                <span>•</span>
                                <span>{q.category}</span>
                                {q.totalQuestions !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>{q.totalQuestions} Qs</span>
                                  </>
                                )}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEditingExisting && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleResetToNew}
                style={{ border: '1px solid var(--color-border)', padding: '0.4rem 0.75rem' }}
              >
                + New Quiz
              </button>
            )}

            <Link
              href="/prompts/README.md"
              target="_blank"
              className="btn btn-ghost btn-xs"
              style={{ border: '1px solid var(--color-border)', padding: '0.4rem 0.75rem' }}
            >
              📖 Master Prompts
            </Link>
          </div>
        </div>

        {loadingQuiz && (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-gold)', fontWeight: 600 }}>
            <span className="spinner-gold" style={{ display: 'inline-block', marginRight: '0.5rem' }} />
            Loading quiz data from database...
          </div>
        )}

        {/* Form Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Title */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Quiz Title <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Day 1: The Life & Legacy of HH Bhakti Tirtha Swami"
              className="input"
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Slug / ID (URL path) <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setIsSlugManual(true)
                setSlug(e.target.value)
              }}
              placeholder="e.g. 64-day-01"
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-gold)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="64-principles">64 Principles (Bhakti Tirtha Swami)</option>
              <option value="bhagavad-gita">Bhagavad Gītā</option>
              <option value="vaishnava-calendar">Vaiṣṇava Calendar & Ācāryas</option>
              <option value="mahabharata">Mahābhārata</option>
              <option value="caitanya-caritamrta">Śrī Caitanya-caritāmṛta</option>
              <option value="general">General / Philosophy</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="easy">Easy (Fundamentals)</option>
              <option value="medium">Medium (Analytical)</option>
              <option value="hard">Hard (Scholarly)</option>
            </select>
          </div>

          {/* Time Limit */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Time Limit (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={timeLimitMins}
              onChange={e => setTimeLimitMins(Number(e.target.value))}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Author Name / Created By */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Author / Study Circle Attribution
            </label>
            <input
              type="text"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="e.g. Anurag Prabhu / Bhakti Tirtha Swami Circle"
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Published Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Visibility Status
            </label>
            <select
              value={isPublished ? 'published' : 'draft'}
              onChange={e => setIsPublished(e.target.value === 'published')}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="published">🚀 Published (Live in Library)</option>
              <option value="draft">📝 Draft (Admin only)</option>
            </select>
          </div>

          {/* Description */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
              Description & Study References
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Life, surrender, preaching & teachings of HH Bhakti Tirtha Swami from Black Lotus..."
              rows={2}
              className="input"
              style={{
                background: 'var(--color-surface-2)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
                resize: 'vertical',
                minHeight: '70px',
              }}
            />
          </div>
        </div>

        {/* SERIES CAMPAIGN LINKING CARD */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            borderRadius: 12,
            background: 'var(--color-surface)',
            border: linkToSeries ? '1.5px solid var(--color-primary)' : '1px dashed var(--color-border)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={linkToSeries}
                onChange={e => {
                  const checked = e.target.checked
                  setLinkToSeries(checked)
                  if (!checked) {
                    setSelectedSeriesDay(null)
                  }
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  📅 Link Quiz to 30-Day Series Campaign (Sacred Teachings — 64 Principles)
                </span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                  Assign this quiz to a series day, configure release date/time (IST), and sync student curriculum.
                </p>
              </div>
            </label>

            {linkToSeries && selectedSeriesDay !== null && (
              <span className="badge badge-gold" style={{ fontSize: '0.78rem' }}>
                Day {selectedSeriesDay} Linked
              </span>
            )}
          </div>

          {linkToSeries && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                  Select Series Day <span style={{ color: 'var(--color-error)' }}>*</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                    (Days with existing quizzes are excluded)
                  </span>
                </label>
                {availableSeriesRounds.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#f59e0b', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    All 30 series days already have quizzes created!
                  </div>
                ) : (
                  <div>
                    {availableSeriesRounds.length > 5 && (
                      <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
                        <input
                          type="text"
                          value={seriesSearchQuery}
                          onChange={e => setSeriesSearchQuery(e.target.value)}
                          placeholder="Search series day or topic..."
                          style={{
                            width: '100%',
                            padding: '0.35rem 1.8rem 0.35rem 0.65rem',
                            borderRadius: 6,
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '0.78rem',
                            outline: 'none',
                          }}
                        />
                        {seriesSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSeriesSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: '0.4rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-muted)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    <select
                      value={selectedSeriesDay !== null ? String(selectedSeriesDay) : ''}
                      onChange={e => handleSeriesDaySelect(e.target.value)}
                      className="input"
                      style={{
                        background: 'var(--color-surface-2)',
                        border: '1.5px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">-- Choose unassigned series day ({filteredSeriesRounds.length} available) --</option>
                      {filteredSeriesRounds.map(r => (
                        <option key={r.day_number} value={r.day_number}>
                          {r.day_number <= 0 ? `Prep Day ${r.day_number}: ` : `Day ${r.day_number}: `}
                          {r.title} ({r.principles_range || r.quiz_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                  Going Live / Release Schedule (IST)
                </label>
                <input
                  type="datetime-local"
                  value={unlockAtInput}
                  onChange={e => setUnlockAtInput(e.target.value)}
                  className="input"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontSize: '0.88rem',
                  }}
                />
                {unlockAtInput && (
                  <p style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                    🕒 Scheduled Release: {formatIstDisplay(unlockAtInput)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: QUESTIONS JSON EDITOR */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Questions Payload</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
              Paste <strong>only</strong> the questions array <code>[&#123; ... &#125;]</code>. Switch tabs to provide localized translations.
            </p>
          </div>

          {/* Language Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-surface-2)', padding: '0.3rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            {LANG_CONFIG.map(l => {
              const count = parsedQuestions[l.key].length
              const isActive = activeLang === l.key
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setActiveLang(l.key)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--color-muted)',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: 12,
                        background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-3, rgba(0,0,0,0.08))',
                        color: isActive ? '#FFFFFF' : 'var(--color-text)',
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Textarea for Current Active Language */}
        <div style={{ marginBottom: '1.25rem' }}>
          <textarea
            value={questionsRaw[activeLang]}
            onChange={e => {
              const val = e.target.value
              setQuestionsRaw(prev => ({ ...prev, [activeLang]: val }))
              setParsedQuestions(prev => ({ ...prev, [activeLang]: [] }))
              if (parseError) setParseError(null)
            }}
            placeholder={`Paste ONLY ${LANG_CONFIG.find(l => l.key === activeLang)?.label} questions array here:\n[\n  {\n    "type": "single-choice",\n    "question": "...",\n    "options": ["A", "B", "C", "D"],\n    "correctIndex": 0\n  }\n]`}
            rows={10}
            className="input"
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: 12,
              background: 'var(--color-surface-2)',
              border: parseError ? '1.5px solid var(--color-error)' : '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Parse error */}
        {parseError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-error)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: 600,
              whiteSpace: 'pre-wrap',
            }}
          >
            ⚠️ {parseError}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleValidateQuestions}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <span>🔍</span> Clean & Validate {LANG_CONFIG.find(l => l.key === activeLang)?.label} Questions
            </button>

            {questionsRaw[activeLang] && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuestionsRaw(prev => ({ ...prev, [activeLang]: '' }))
                  setParsedQuestions(prev => ({ ...prev, [activeLang]: [] }))
                  setParseError(null)
                }}
                style={{ border: '1px solid var(--color-border)' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {dryRunQuizCandidate && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onDryRunQuiz?.(dryRunQuizCandidate)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
                title="Run dry run simulation in real quiz engine before publishing"
              >
                <span>🧪</span> Dry Run ({dryRunQuizCandidate.questions.length} Qs)
              </button>
            )}

            <button
              className="btn btn-gold btn-sm"
              onClick={handlePublish}
              disabled={publishing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
            >
              <span>🚀</span> {publishing ? 'Saving...' : isEditingExisting ? '🚀 Update Quiz in Supabase CMS' : '🚀 Publish to Supabase CMS'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: VALIDATION PREVIEW */}
      {activeQuestionsList.length > 0 && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-gold">
                  {CATEGORY_ICONS[category as Category] || '📜'} {CATEGORY_LABELS[category as Category] || category}
                </span>
                <span className="badge badge-success">✅ Validated ({activeQuestionsList.length} Questions)</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{title || 'Untitled Quiz'}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{description || 'No description provided'}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
                ⏱️ {timeLimitMins} mins
              </span>
              <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
                🔑 ID: {slug || 'unassigned'}
              </span>
              <span className="badge badge-ghost" style={{ fontSize: '0.75rem' }}>
                👤 {authorName || 'Brahmā-Jijñāsā'}
              </span>
            </div>
          </div>

          {/* Auto-clean logs if any */}
          {cleanLog.length > 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(74, 222, 128, 0.08)', borderRadius: 8, border: '1px solid rgba(74, 222, 128, 0.2)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--color-success)' }}>
              <strong>Auto-adjustments applied:</strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
                {cleanLog.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Question List */}
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Question Preview ({activeQuestionsList.length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeQuestionsList.map((q: Question, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 10,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-gold)', fontSize: '0.85rem' }}>#{idx + 1}</span>
                    <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.type}</span>
                    <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.difficulty}</span>
                    <span className="badge badge-ghost" style={{ fontSize: '0.68rem' }}>{q.points || 1} pts</span>
                  </div>
                  {q.reference && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                      📖 {q.reference}
                    </span>
                  )}
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.5rem', lineHeight: 1.4, color: 'var(--color-text)' }}>
                  {q.question}
                </p>

                {'options' in q && Array.isArray((q as { options?: string[] }).options) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {((q as { options: string[] }).options).map((opt: string, optIdx: number) => {
                      const singleMatch = 'correctIndex' in q && (q as { correctIndex?: number }).correctIndex === optIdx
                      const multiMatch = 'correctIndices' in q && Array.isArray((q as { correctIndices?: number[] }).correctIndices) && (q as { correctIndices: number[] }).correctIndices.includes(optIdx)
                      const isCorrect = singleMatch || multiMatch
                      return (
                        <div
                          key={optIdx}
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            background: isCorrect ? 'rgba(74, 222, 128, 0.15)' : 'var(--glass-bg)',
                            border: isCorrect ? '1.5px solid rgba(74, 222, 128, 0.5)' : '1px solid var(--color-border)',
                            color: isCorrect ? 'var(--color-success)' : 'var(--color-text)',
                            fontWeight: isCorrect ? 700 : 400,
                          }}
                        >
                          {isCorrect ? '✓ ' : '• '} {opt}
                        </div>
                      )
                    })}
                  </div>
                )}

                {q.explanation && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic', marginTop: '0.3rem' }}>
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
