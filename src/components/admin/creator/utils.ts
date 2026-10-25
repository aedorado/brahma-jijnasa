import { validateQuestionsList } from '@/lib/quiz-validator'
import { isMarkdownQuiz, parseQuizMarkdown } from '@/lib/quiz-markdown'
import type { Question } from '@/types/quiz'
import type { SupportedLang, LangConfigItem, ParseQuestionsResult, LegacyQuizMetadata } from './types'

export const LANG_CONFIG: LangConfigItem[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { key: 'pt', label: 'Português', flag: '🇧🇷' },
]

export function toLocalDatetimeString(isoString?: string): string {
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

export function localToIsoString(localStr: string): string | undefined {
  if (!localStr) return undefined
  try {
    const d = new Date(localStr)
    return isNaN(d.getTime()) ? undefined : d.toISOString()
  } catch {
    return undefined
  }
}

export function formatIstDisplay(localDatetimeStr: string): string {
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

export function computeQuizSnapshot(data: {
  title: string
  slug: string
  category: string
  description: string
  difficulty: string
  timeLimitMins: number
  onTimeExpiry: string
  authorName: string
  isPublished: boolean
  linkToSeries?: boolean
  selectedSeriesDay?: number | null
  unlockAtInput?: string
  questionsRaw: Record<SupportedLang, string>
}): string {
  return JSON.stringify({
    title: data.title.trim(),
    slug: data.slug.trim(),
    category: data.category,
    description: data.description.trim(),
    difficulty: data.difficulty,
    timeLimitMins: data.timeLimitMins,
    onTimeExpiry: data.onTimeExpiry,
    authorName: data.authorName.trim(),
    isPublished: data.isPublished,
    questionsRaw: {
      en: (data.questionsRaw.en || '').trim(),
      hi: (data.questionsRaw.hi || '').trim(),
      pt: (data.questionsRaw.pt || '').trim(),
    },
  })
}

/**
 * Smart question parser & cleaner (cleans markdown fences, array glitches, etc.)
 */
export function cleanAndParseQuestionArray(input: string, logs: string[]): ParseQuestionsResult {
  let cleaned = input.trim()
  if (!cleaned) return { questions: [] }

  // 0. Check for Markdown quiz format (starts with frontmatter '---' or '## q' headers)
  if (isMarkdownQuiz(cleaned)) {
    logs.push('Detected Markdown quiz format: parsing question blocks & frontmatter...')
    const mdResult = parseQuizMarkdown(cleaned)
    if (mdResult.errors.length > 0) {
      throw new Error(`Markdown Parsing Failed:\n• ${mdResult.errors.join('\n• ')}`)
    }
    if (mdResult.warnings.length > 0) {
      logs.push(...mdResult.warnings)
    }
    logs.push(`✅ Successfully parsed ${mdResult.questions.length} questions from Markdown format.`)
    return {
      questions: mdResult.questions,
      legacyMetadata: mdResult.meta as LegacyQuizMetadata | undefined,
    }
  }

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

  let legacyMetadata: LegacyQuizMetadata | undefined
  let qArray: any[] = []

  // Handle case where user pasted a whole legacy quiz object instead of just questions
  if (Array.isArray(parsed)) {
    qArray = parsed
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
    qArray = parsed.questions
    logs.push('Detected full legacy quiz JSON: extracted questions array and filled form metadata!')
    legacyMetadata = {
      title: parsed.title,
      id: parsed.id,
      category: parsed.category,
      description: parsed.description,
      difficulty: parsed.difficulty,
      timeLimit: parsed.timeLimit,
      onTimeExpiry: parsed.onTimeExpiry,
    }
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

  return {
    questions: validation.normalizedQuestions,
    legacyMetadata,
  }
}
