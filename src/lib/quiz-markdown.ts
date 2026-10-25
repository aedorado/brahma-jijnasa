import type { Question, QuestionType, Difficulty, Quiz, QuizMeta, Category, OnTimeExpiry } from '@/types/quiz'
import { validateQuestion, getStandardQuestionPoints, VALID_QUESTION_TYPES } from './quiz-validator'

export interface ParsedQuizMarkdownResult {
  meta?: {
    id?: string
    title?: string
    category?: Category
    description?: string
    difficulty?: Difficulty
    timeLimit?: number
    onTimeExpiry?: OnTimeExpiry
    authorName?: string
    tags?: string[]
  }
  questions: Question[]
  errors: string[]
  warnings: string[]
}

/**
 * Quick heuristic to check if the input string is a Quiz Markdown format
 * rather than raw JSON.
 */
export function isMarkdownQuiz(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false
  if (trimmed.startsWith('---')) return true
  if (/^##\s+(?:q\d+|\d+|[a-z-]+)/im.test(trimmed)) return true
  if (/\*\*Q:\*\*/i.test(trimmed)) return true
  return false
}

/**
 * Parse frontmatter block from markdown
 */
function parseFrontmatter(markdown: string): { frontmatterText: string; bodyText: string } {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { frontmatterText: '', bodyText: markdown }
  }
  return { frontmatterText: match[1], bodyText: match[2] }
}

/**
 * Parses simple YAML-style frontmatter key-value pairs
 */
function parseYamlProperties(yamlText: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!yamlText) return result

  const lines = yamlText.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim()
      let val = trimmed.slice(colonIdx + 1).trim()
      // Strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      result[key] = val
    }
  }
  return result
}

/**
 * Splits markdown content into individual question blocks based on `## ` or `### ` headers.
 */
function splitQuestionBlocks(bodyText: string): Array<{ header: string; content: string }> {
  const lines = bodyText.split(/\r?\n/)
  const blocks: Array<{ header: string; content: string }> = []
  let currentHeader = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^#{2,3}\s+(.+)$/)
    if (headerMatch) {
      if (currentHeader || currentLines.some(l => l.trim())) {
        blocks.push({
          header: currentHeader,
          content: currentLines.join('\n').trim(),
        })
      }
      currentHeader = headerMatch[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentHeader || currentLines.some(l => l.trim())) {
    blocks.push({
      header: currentHeader,
      content: currentLines.join('\n').trim(),
    })
  }

  return blocks
}

/**
 * Parse question header (e.g. `## q1 | single-choice | easy` or `## 1 | multiple-select` or `## single-choice`)
 */
function parseHeader(headerStr: string, index: number): { id: string; type: QuestionType; difficulty: Difficulty } {
  // Support separators: | , : or whitespace
  const rawParts = headerStr.split(/[|:]/).map(p => p.trim()).filter(Boolean)
  let id = `q${index + 1}`
  let type: QuestionType = 'single-choice'
  let difficulty: Difficulty = 'medium'

  if (rawParts.length === 1) {
    // e.g. "single-choice" or "q1"
    const part = rawParts[0].toLowerCase()
    if (VALID_QUESTION_TYPES.includes(part as QuestionType)) {
      type = part as QuestionType
    } else if (part.startsWith('q') || /^\d+$/.test(part)) {
      id = part
    }
  } else if (rawParts.length === 2) {
    // Could be: "q1 | single-choice" or "single-choice | easy"
    const p0 = rawParts[0].toLowerCase()
    const p1 = rawParts[1].toLowerCase()
    if (VALID_QUESTION_TYPES.includes(p0 as QuestionType)) {
      type = p0 as QuestionType
      if (['easy', 'medium', 'hard'].includes(p1)) difficulty = p1 as Difficulty
    } else {
      id = rawParts[0]
      if (VALID_QUESTION_TYPES.includes(p1 as QuestionType)) {
        type = p1 as QuestionType
      }
    }
  } else if (rawParts.length >= 3) {
    // "q1 | single-choice | easy"
    id = rawParts[0]
    const p1 = rawParts[1].toLowerCase()
    const p2 = rawParts[2].toLowerCase()
    if (VALID_QUESTION_TYPES.includes(p1 as QuestionType)) {
      type = p1 as QuestionType
    }
    if (['easy', 'medium', 'hard'].includes(p2)) {
      difficulty = p2 as Difficulty
    }
  }

  return { id, type, difficulty }
}

/**
 * Extract labeled sections from question markdown body
 */
function extractSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = content.split(/\r?\n/)
  let currentKey = ''
  let currentLines: string[] = []

  const commitSection = () => {
    if (currentKey) {
      sections[currentKey] = currentLines.join('\n').trim()
    }
  }

  // Regex matching `**Label:** rest of line` or `**Label**`
  const labelRegex = /^\*\*(Q|Question|Options|Ref|Reference|Explanation|Exp|Clues|Quote|Context|Items|Left|Right|Assertion|Reason|Passage|Chain|Scenario|Principle|Shloka|Transliteration|Points):\*\*\s*(.*)$/i

  for (const line of lines) {
    const match = line.match(labelRegex)
    if (match) {
      commitSection()
      currentKey = match[1].toLowerCase()
      currentLines = []
      if (match[2].trim()) {
        currentLines.push(match[2].trim())
      }
    } else {
      currentLines.push(line)
    }
  }
  commitSection()

  return sections
}

/**
 * Parse an options block containing `- [ ]` and `- [x]` checkboxes
 */
function parseCheckboxes(optionsText: string): { options: string[]; checkedIndices: number[] } {
  if (!optionsText) return { options: [], checkedIndices: [] }
  const lines = optionsText.split(/\r?\n/)
  const options: string[] = []
  const checkedIndices: number[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    const checkMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/)
    if (checkMatch) {
      const isChecked = checkMatch[1].toLowerCase() === 'x'
      const text = checkMatch[2].trim()
      const idx = options.length
      options.push(text)
      if (isChecked) {
        checkedIndices.push(idx)
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Uncheckboxed option
      options.push(trimmed.slice(2).trim())
    }
  }

  return { options, checkedIndices }
}

/**
 * Parse bullet list of strings (e.g. for clues, chain)
 */
function parseBulletList(listText: string): string[] {
  if (!listText) return []
  return listText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line))
    .map(line => line.replace(/^[-*]\s+|\d+\.\s+/, '').trim())
    .filter(Boolean)
}

/**
 * Parse sequence items and determine the correct order
 */
function parseSequenceItems(itemsText: string): { items: string[]; correctOrder: number[] } {
  if (!itemsText) return { items: [], correctOrder: [] }
  const lines = itemsText.split(/\r?\n/)
  const rawItems: Array<{ text: string; rank?: number }> = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Pattern: - [4] Event text OR - 4. Event text OR - Event text
    const rankMatch = trimmed.match(/^[-*]\s*\[(\d+)\]\s*(.+)$/) || trimmed.match(/^[-*]?\s*(\d+)\.\s*(.+)$/)
    if (rankMatch) {
      rawItems.push({
        rank: parseInt(rankMatch[1], 10),
        text: rankMatch[2].trim(),
      })
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      rawItems.push({
        text: trimmed.slice(2).trim(),
      })
    }
  }

  const items = rawItems.map(i => i.text)
  const hasRanks = rawItems.every(i => typeof i.rank === 'number')

  let correctOrder: number[] = []
  if (hasRanks) {
    // If rank is provided (1-indexed or 0-indexed), sort by rank to find the index order
    // e.g. item 0 has rank 4, item 1 has rank 1, item 2 has rank 2, item 3 has rank 3.
    // Chronological order of item indices: [1, 2, 3, 0]
    const indexed = rawItems.map((item, idx) => ({ idx, rank: item.rank! }))
    indexed.sort((a, b) => a.rank - b.rank)
    correctOrder = indexed.map(i => i.idx)
  } else {
    // Natural order [0, 1, 2, ...]
    correctOrder = items.map((_, idx) => idx)
  }

  return { items, correctOrder }
}

/**
 * Parse match pairs (Left with targets and Right with labels)
 */
function parseMatchPairs(leftText: string, rightText: string): { left: string[]; right: string[]; correctPairs: [number, number][] } {
  const left: string[] = []
  const right: string[] = []
  const correctPairs: [number, number][] = []

  const targetMapping: Record<number, string> = {}

  // Parse Left: e.g. "- IFAST → D" or "- Hari-Nama Press -> B"
  const leftLines = (leftText || '').split(/\r?\n/)
  for (const line of leftLines) {
    const trimmed = line.trim()
    const arrowMatch = trimmed.match(/^[-*]?\s*(.*?)\s*(?:→|->|=)\s*([A-Za-z0-9]+)$/)
    if (arrowMatch) {
      const idx = left.length
      left.push(arrowMatch[1].trim())
      targetMapping[idx] = arrowMatch[2].trim().toUpperCase()
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      left.push(trimmed.slice(2).trim())
    }
  }

  // Parse Right: e.g. "A. Traveling party..." or "1. Traveling..."
  const rightLines = (rightText || '').split(/\r?\n/)
  const rightLabelToIndex: Record<string, number> = {}

  for (const line of rightLines) {
    const trimmed = line.trim()
    const labelMatch = trimmed.match(/^([A-Za-z0-9]+)[\.\)]\s*(.+)$/)
    if (labelMatch) {
      const idx = right.length
      const label = labelMatch[1].toUpperCase()
      rightLabelToIndex[label] = idx
      right.push(labelMatch[2].trim())
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const idx = right.length
      // default letter: 0 -> A, 1 -> B, etc.
      const charLabel = String.fromCharCode(65 + idx)
      rightLabelToIndex[charLabel] = idx
      right.push(trimmed.slice(2).trim())
    }
  }

  // Build correctPairs: [leftIndex, rightIndex]
  left.forEach((_, leftIdx) => {
    const targetLabel = targetMapping[leftIdx]
    if (targetLabel && rightLabelToIndex[targetLabel] !== undefined) {
      correctPairs.push([leftIdx, rightLabelToIndex[targetLabel]])
    } else {
      // Default identity if unmapped
      correctPairs.push([leftIdx, Math.min(leftIdx, Math.max(0, right.length - 1))])
    }
  })

  return { left, right, correctPairs }
}

/**
 * Main parser: converts a full markdown quiz string into a validated Quiz object and Question[] array.
 */
export function parseQuizMarkdown(markdown: string): ParsedQuizMarkdownResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!markdown || !markdown.trim()) {
    return { questions: [], errors: ['Markdown content is empty.'], warnings: [] }
  }

  const { frontmatterText, bodyText } = parseFrontmatter(markdown)
  const yamlMeta = parseYamlProperties(frontmatterText)

  let meta: ParsedQuizMarkdownResult['meta'] = undefined
  if (Object.keys(yamlMeta).length > 0) {
    const timeLimitVal = parseInt(yamlMeta.timeLimit || yamlMeta.time_limit || '720', 10)
    meta = {
      id: yamlMeta.id,
      title: yamlMeta.title,
      category: yamlMeta.category as Category,
      description: yamlMeta.description,
      difficulty: (yamlMeta.difficulty as Difficulty) || 'medium',
      timeLimit: isNaN(timeLimitVal) ? 720 : timeLimitVal,
      onTimeExpiry: ((yamlMeta.onTimeExpiry || yamlMeta.on_time_expiry) as OnTimeExpiry) || 'submit-partial',
      authorName: yamlMeta.author || yamlMeta.author_name,
      tags: yamlMeta.tags ? yamlMeta.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    }
  }

  const questionBlocks = splitQuestionBlocks(bodyText)
  if (questionBlocks.length === 0) {
    return { meta, questions: [], errors: ['No questions found. Questions must begin with "## q1 | single-choice" headers.'], warnings: [] }
  }

  const rawQuestions: any[] = []

  questionBlocks.forEach((block, idx) => {
    const headerInfo = parseHeader(block.header, idx)
    const sections = extractSections(block.content)

    const raw: any = {
      id: headerInfo.id,
      type: headerInfo.type,
      difficulty: headerInfo.difficulty,
      question: sections.q || sections.question || '',
      reference: sections.ref || sections.reference,
      explanation: sections.explanation || sections.exp,
      shloka: sections.shloka,
      transliteration: sections.transliteration,
    }

    if (sections.points) {
      const p = parseFloat(sections.points)
      if (!isNaN(p)) raw.points = p
    }

    // Type-specific field parsing
    const { options, checkedIndices } = parseCheckboxes(sections.options || '')

    switch (headerInfo.type) {
      case 'single-choice':
      case 'cause-effect':
      case 'odd-one-out':
      case 'evidence-based': {
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        if (headerInfo.type === 'evidence-based') {
          raw.principle = sections.principle || ''
        }
        break
      }

      case 'multiple-select': {
        raw.options = options
        raw.correctIndices = checkedIndices.length > 0 ? checkedIndices : [0]
        break
      }

      case 'true-false': {
        // Look at options or check True/False directly
        if (checkedIndices.length > 0 && options.length > 0) {
          const checkedText = options[checkedIndices[0]].toLowerCase()
          raw.correct = checkedText.includes('true') || checkedText.includes('सत्य') || checkedText.includes('verdadeiro') || (!checkedText.includes('false') && !checkedText.includes('असत्य') && !checkedText.includes('falso') && checkedIndices[0] === 0)
        } else {
          // Fallback check in text
          raw.correct = true
        }
        break
      }

      case 'who-am-i': {
        raw.clues = parseBulletList(sections.clues || '')
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }

      case 'who-said-this': {
        raw.quote = sections.quote || ''
        raw.context = sections.context || undefined
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }

      case 'sequence': {
        const { items, correctOrder } = parseSequenceItems(sections.items || '')
        raw.items = items
        raw.correctOrder = correctOrder
        break
      }

      case 'match-pairs': {
        const { left, right, correctPairs } = parseMatchPairs(sections.left || '', sections.right || '')
        raw.left = left
        raw.right = right
        raw.correctPairs = correctPairs
        break
      }

      case 'assertion-reason': {
        raw.assertion = sections.assertion || ''
        raw.reason = sections.reason || ''
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }

      case 'spot-the-error': {
        raw.passage = sections.passage || ''
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }

      case 'missing-link': {
        raw.chain = parseBulletList(sections.chain || '')
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }

      case 'case-study':
      case 'what-would-you-do': {
        raw.scenario = sections.scenario || ''
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }

      case 'two-truths-one-false': {
        raw.options = options
        raw.correctIndex = checkedIndices.length > 0 ? checkedIndices[0] : 0
        break
      }
    }

    rawQuestions.push(raw)
  })

  // Validate each question against standard schema
  const normalizedQuestions: Question[] = []
  rawQuestions.forEach((raw, idx) => {
    const { question, errors: qErrors, warnings: qWarnings } = validateQuestion(raw, idx)
    if (qErrors.length > 0) errors.push(...qErrors)
    if (qWarnings.length > 0) warnings.push(...qWarnings)
    if (question) normalizedQuestions.push(question)
  })

  return {
    meta,
    questions: normalizedQuestions,
    errors,
    warnings,
  }
}

/**
 * Converts a list of Questions into clean, human-readable markdown format.
 */
export function questionsToMarkdown(questions: Question[]): string {
  if (!questions || !Array.isArray(questions) || questions.length === 0) return ''

  return questions
    .map((q, idx) => {
      const qId = q.id || `q${idx + 1}`
      const lines: string[] = []

      // Header
      lines.push(`## ${qId} | ${q.type} | ${q.difficulty || 'medium'}\n`)

      // Type-specific bodies
      if (q.type === 'who-am-i') {
        const wa = q as any
        if (Array.isArray(wa.clues) && wa.clues.length > 0) {
          lines.push(`**Clues:**`)
          wa.clues.forEach((c: string) => lines.push(`- ${c}`))
          lines.push('')
        }
      } else if (q.type === 'who-said-this') {
        const ws = q as any
        if (ws.quote) lines.push(`**Quote:** ${ws.quote}\n`)
        if (ws.context) lines.push(`**Context:** ${ws.context}\n`)
      } else if (q.type === 'assertion-reason') {
        const ar = q as any
        if (ar.assertion) lines.push(`**Assertion:** ${ar.assertion}\n`)
        if (ar.reason) lines.push(`**Reason:** ${ar.reason}\n`)
      } else if (q.type === 'spot-the-error') {
        const se = q as any
        if (se.passage) lines.push(`**Passage:** ${se.passage}\n`)
      } else if (q.type === 'missing-link') {
        const ml = q as any
        if (Array.isArray(ml.chain) && ml.chain.length > 0) {
          lines.push(`**Chain:**`)
          ml.chain.forEach((c: string) => lines.push(`- ${c}`))
          lines.push('')
        }
      } else if (q.type === 'case-study' || q.type === 'what-would-you-do') {
        const cs = q as any
        if (cs.scenario) lines.push(`**Scenario:** ${cs.scenario}\n`)
      } else if (q.type === 'evidence-based') {
        const eb = q as any
        if (eb.principle) lines.push(`**Principle:** ${eb.principle}\n`)
      }

      // Main question prompt
      lines.push(`**Q:** ${q.question}\n`)

      // Options / items / pairs
      if (q.type === 'sequence') {
        const seq = q as any
        lines.push(`**Items:**`)
        const items = seq.items || []
        const correctOrder = seq.correctOrder || []
        // Rank mapping: what 1-based order does this item have?
        // correctOrder[0] is step 1, correctOrder[1] is step 2...
        items.forEach((item: string, itemIdx: number) => {
          const rank = correctOrder.indexOf(itemIdx) + 1
          const rankLabel = rank > 0 ? `[${rank}] ` : ''
          lines.push(`- ${rankLabel}${item}`)
        })
        lines.push('')
      } else if (q.type === 'match-pairs') {
        const mp = q as any
        lines.push(`**Left:**`)
        const left = mp.left || []
        const right = mp.right || []
        const pairs: [number, number][] = mp.correctPairs || []
        const leftToRight: Record<number, number> = {}
        pairs.forEach(([l, r]) => { leftToRight[l] = r })

        left.forEach((lItem: string, lIdx: number) => {
          const rIdx = leftToRight[lIdx] ?? lIdx
          const targetLetter = String.fromCharCode(65 + rIdx)
          lines.push(`- ${lItem} → ${targetLetter}`)
        })
        lines.push('')

        lines.push(`**Right:**`)
        right.forEach((rItem: string, rIdx: number) => {
          const letter = String.fromCharCode(65 + rIdx)
          lines.push(`${letter}. ${rItem}`)
        })
        lines.push('')
      } else if (q.type === 'true-false') {
        const tf = q as any
        const opt0 = Array.isArray(tf.options) && tf.options[0] ? tf.options[0] : 'True'
        const opt1 = Array.isArray(tf.options) && tf.options[1] ? tf.options[1] : 'False'
        lines.push(`**Options:**`)
        lines.push(`- [${tf.correct ? 'x' : ' '}] ${opt0}`)
        lines.push(`- [${!tf.correct ? 'x' : ' '}] ${opt1}`)
        lines.push('')
      } else if (q.type === 'multiple-select') {
        const ms = q as any
        const correctSet = new Set(ms.correctIndices || [])
        lines.push(`**Options:**`)
        ;(ms.options || []).forEach((opt: string, optIdx: number) => {
          lines.push(`- [${correctSet.has(optIdx) ? 'x' : ' '}] ${opt}`)
        })
        lines.push('')
      } else {
        // Single choice, who-am-i, who-said-this, cause-effect, etc.
        const sc = q as any
        lines.push(`**Options:**`)
        ;(sc.options || []).forEach((opt: string, optIdx: number) => {
          lines.push(`- [${optIdx === sc.correctIndex ? 'x' : ' '}] ${opt}`)
        })
        lines.push('')
      }

      // Shloka & transliteration
      if (q.shloka) lines.push(`**Shloka:** ${q.shloka}\n`)
      if (q.transliteration) lines.push(`**Transliteration:** ${q.transliteration}\n`)

      // Reference & explanation
      if (q.reference) lines.push(`**Ref:** ${q.reference}\n`)
      if (q.explanation) lines.push(`**Explanation:** ${q.explanation}`)

      return lines.join('\n').trim()
    })
    .join('\n\n')
}

/**
 * Converts a full Quiz (metadata + questions) into a complete markdown document with YAML frontmatter.
 */
export function quizToMarkdown(quiz: Quiz | { meta: QuizMeta; questions: Question[] }): string {
  const isMetaWrapper = 'meta' in quiz
  const qMeta = isMetaWrapper ? (quiz as any).meta : quiz
  const questions = quiz.questions || []

  const frontmatterLines: string[] = ['---']
  if (qMeta.id) frontmatterLines.push(`id: ${qMeta.id}`)
  if (qMeta.title) frontmatterLines.push(`title: ${qMeta.title}`)
  if (qMeta.category) frontmatterLines.push(`category: ${qMeta.category}`)
  if (qMeta.description) frontmatterLines.push(`description: ${qMeta.description}`)
  if (qMeta.difficulty) frontmatterLines.push(`difficulty: ${qMeta.difficulty}`)
  if (qMeta.timeLimit) frontmatterLines.push(`timeLimit: ${qMeta.timeLimit}`)
  if (qMeta.onTimeExpiry) frontmatterLines.push(`onTimeExpiry: ${qMeta.onTimeExpiry}`)
  frontmatterLines.push('---')

  const questionsMd = questionsToMarkdown(questions)
  return `${frontmatterLines.join('\n')}\n\n${questionsMd}\n`
}
