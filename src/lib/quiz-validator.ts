import type { Question, QuestionType, Difficulty } from '@/types/quiz'

export function getStandardQuestionPoints(type: QuestionType, difficulty: Difficulty): number {
  // Tier 1: Direct Recognition (1 pick / boolean)
  if (['single-choice', 'true-false', 'who-said-this', 'odd-one-out', 'missing-link'].includes(type)) {
    return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
  }
  // Tier 2: Analytical Reasoning (Multi-statement / Scenario)
  if (['assertion-reason', 'cause-effect', 'spot-the-error', 'two-truths-one-false', 'evidence-based', 'case-study', 'what-would-you-do'].includes(type)) {
    return difficulty === 'easy' ? 1.5 : difficulty === 'medium' ? 2.5 : 3.5
  }
  // Tier 3: Multi-Element & Interactive (match-pairs, sequence, multiple-select, who-am-i)
  return difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
}

export const VALID_QUESTION_TYPES: readonly QuestionType[] = [
  'single-choice',
  'multiple-select',
  'true-false',
  'who-am-i',
  'who-said-this',
  'sequence',
  'cause-effect',
  'match-pairs',
  'odd-one-out',
  'assertion-reason',
  'case-study',
  'what-would-you-do',
  'missing-link',
  'spot-the-error',
  'two-truths-one-false',
  'evidence-based',
] as const

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  normalizedQuestions: Question[]
}

/**
 * Validates a single question object against the Brahma Jijnasa schema.
 * Returns normalized question and a list of specific errors.
 */
export function validateQuestion(raw: any, index: number): { question: Question | null; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const prefix = `Question #${index + 1}`

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      question: null,
      errors: [`${prefix}: Must be a JSON object (found ${Array.isArray(raw) ? 'array' : typeof raw}).`],
      warnings,
    }
  }

  // 1. Question Type validation
  const rawType = raw.type
  if (!rawType || typeof rawType !== 'string') {
    errors.push(`${prefix}: Missing required field "type".`)
  } else if (!VALID_QUESTION_TYPES.includes(rawType as QuestionType)) {
    errors.push(
      `${prefix}: Invalid question type "${rawType}". Allowed types are: ${VALID_QUESTION_TYPES.join(', ')}`
    )
  }

  const type = rawType as QuestionType

  // 2. Question text / prompt validation
  let questionText = typeof raw.question === 'string' ? raw.question.trim() : ''
  if (!questionText) {
    if (type === 'who-am-i') questionText = 'Who am I based on these clues?'
    else if (type === 'who-said-this') questionText = 'Who spoke these words?'
    else if (type === 'sequence') questionText = 'Arrange these events in chronological order:'
    else if (type === 'match-pairs') questionText = 'Match each item with its correct pair:'
    else if (type === 'assertion-reason') questionText = 'Evaluate the Assertion and Reason:'
    else if (type === 'spot-the-error') questionText = 'Identify the factual error in this passage:'
    else if (type === 'missing-link') questionText = 'Identify the missing link in this sequence:'
    else if (type === 'odd-one-out') questionText = 'Identify the item that does not belong with the others:'
    else if (type === 'two-truths-one-false') questionText = 'Which of the following statements is FALSE?'
    else {
      errors.push(`${prefix}: "question" prompt text is required and cannot be empty.`)
    }
  }

  // 3. Explanation validation
  let explanation = typeof raw.explanation === 'string' ? raw.explanation.trim() : ''
  if (!explanation) {
    warnings.push(`${prefix}: Missing explanation. Devotees benefit from an explanation when reviewing answers.`)
    explanation = 'Correct answer according to Vedic scriptures and Gaudiya Vaishnava siddhanta.'
  }

  // 4. Difficulty validation
  let difficulty: Difficulty = 'medium'
  if (['easy', 'medium', 'hard'].includes(raw.difficulty)) {
    difficulty = raw.difficulty as Difficulty
  } else if (raw.difficulty) {
    warnings.push(`${prefix}: Unknown difficulty "${raw.difficulty}". Defaulting to "medium".`)
  }

  // 5. Points validation
  let points: number = typeof raw.points === 'number' && raw.points >= 1 && raw.points <= 5
    ? raw.points
    : getStandardQuestionPoints(type, difficulty)

  const normalized: any = {
    ...raw,
    id: typeof raw.id === 'number' ? raw.id : index + 1,
    type,
    question: questionText,
    explanation,
    difficulty,
    points,
  }

  // 6. Type-specific deep validation & repairs
  if (type === 'single-choice' || type === 'cause-effect' || type === 'odd-one-out' ||
      type === 'what-would-you-do' || type === 'case-study' || type === 'spot-the-error' ||
      type === 'missing-link' || type === 'assertion-reason' || type === 'evidence-based') {
    
    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      errors.push(`${prefix} (${type}): "options" must be an array of at least 2 choices.`)
    } else {
      normalized.options = raw.options.map((opt: any) => String(opt || '').trim())
      if (normalized.options.some((opt: string) => !opt)) {
        errors.push(`${prefix} (${type}): All options must be non-empty strings.`)
      }
    }

    // Check correctIndex
    let cIdx = raw.correctIndex
    if (typeof cIdx !== 'number' && typeof raw.correctAnswer === 'number') {
      cIdx = raw.correctAnswer
    }

    if (typeof cIdx !== 'number' || !Number.isInteger(cIdx)) {
      errors.push(`${prefix} (${type}): Missing or non-integer "correctIndex" (must be 0, 1, 2, ...).`)
    } else if (Array.isArray(raw.options) && (cIdx < 0 || cIdx >= raw.options.length)) {
      errors.push(
        `${prefix} (${type}): "correctIndex" (${cIdx}) is out of bounds for ${raw.options.length} options (valid range: 0 to ${raw.options.length - 1}).`
      )
    } else {
      normalized.correctIndex = cIdx
    }

    if (type === 'assertion-reason') {
      if (!raw.assertion || typeof raw.assertion !== 'string') {
        warnings.push(`${prefix} (assertion-reason): Missing "assertion" text field.`)
      }
      if (!raw.reason || typeof raw.reason !== 'string') {
        warnings.push(`${prefix} (assertion-reason): Missing "reason" text field.`)
      }
    }

    if (type === 'spot-the-error' && !raw.passage) {
      warnings.push(`${prefix} (spot-the-error): Missing "passage" text field.`)
    }

    if (type === 'missing-link' && (!Array.isArray(raw.chain) || raw.chain.length < 2)) {
      warnings.push(`${prefix} (missing-link): "chain" array should contain the sequence with a missing link placeholder like "?".`)
    }
  } else if (type === 'two-truths-one-false') {
    if (!Array.isArray(raw.options) || raw.options.length !== 3) {
      errors.push(`${prefix} (two-truths-one-false): "options" must contain exactly 3 statements (2 truths, 1 false).`)
    } else {
      normalized.options = raw.options.map((opt: any) => String(opt || '').trim())
    }

    const cIdx = typeof raw.correctIndex === 'number' ? raw.correctIndex : raw.correctAnswer
    if (typeof cIdx !== 'number' || cIdx < 0 || cIdx > 2) {
      errors.push(`${prefix} (two-truths-one-false): "correctIndex" must be 0, 1, or 2 indicating which statement is false.`)
    } else {
      normalized.correctIndex = cIdx
    }
  } else if (type === 'multiple-select') {
    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      errors.push(`${prefix} (multiple-select): "options" must be an array of at least 2 choices.`)
    } else {
      normalized.options = raw.options.map((opt: any) => String(opt || '').trim())
    }

    // Accept correctIndices or correctAnswers
    let cIndices = raw.correctIndices || raw.correctAnswers
    if (!Array.isArray(cIndices) || cIndices.length === 0) {
      errors.push(`${prefix} (multiple-select): "correctIndices" must be a non-empty array of choice indices (e.g. [0, 2]).`)
    } else if (Array.isArray(raw.options)) {
      const invalid = cIndices.filter((idx: any) => typeof idx !== 'number' || idx < 0 || idx >= raw.options.length)
      if (invalid.length > 0) {
        errors.push(`${prefix} (multiple-select): Indices [${invalid.join(', ')}] are out of bounds for ${raw.options.length} options.`)
      } else {
        normalized.correctIndices = Array.from(new Set(cIndices.map(Number))).sort((a, b) => a - b)
      }
    }
  } else if (type === 'true-false') {
    let boolVal: boolean | null = null
    if (typeof raw.correct === 'boolean') {
      boolVal = raw.correct
    } else if (typeof raw.correctAnswer === 'boolean') {
      boolVal = raw.correctAnswer
    } else if (raw.correct === 'true' || raw.correctAnswer === 'true') {
      boolVal = true
    } else if (raw.correct === 'false' || raw.correctAnswer === 'false') {
      boolVal = false
    }

    if (boolVal === null) {
      errors.push(`${prefix} (true-false): Missing required boolean "correct": true or "correct": false.`)
    } else {
      normalized.correct = boolVal
    }
  } else if (type === 'who-am-i') {
    if (!Array.isArray(raw.clues) || raw.clues.length < 2) {
      errors.push(`${prefix} (who-am-i): "clues" must be an array of at least 2 progressive clues.`)
    } else {
      normalized.clues = raw.clues.map((c: any) => String(c || '').trim())
    }

    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      errors.push(`${prefix} (who-am-i): "options" must be an array of at least 2 candidates.`)
    } else {
      normalized.options = raw.options.map((opt: any) => String(opt || '').trim())
    }

    const cIdx = typeof raw.correctIndex === 'number' ? raw.correctIndex : raw.correctAnswer
    if (typeof cIdx !== 'number' || (Array.isArray(raw.options) && (cIdx < 0 || cIdx >= raw.options.length))) {
      errors.push(`${prefix} (who-am-i): "correctIndex" is missing or out of bounds.`)
    } else {
      normalized.correctIndex = cIdx
    }
  } else if (type === 'who-said-this') {
    const quote = typeof raw.quote === 'string' ? raw.quote.trim() : questionText
    if (!quote) {
      errors.push(`${prefix} (who-said-this): Missing "quote" field.`)
    } else {
      normalized.quote = quote
    }

    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      errors.push(`${prefix} (who-said-this): "options" must be an array of at least 2 speaker options.`)
    } else {
      normalized.options = raw.options.map((opt: any) => String(opt || '').trim())
    }

    const cIdx = typeof raw.correctIndex === 'number' ? raw.correctIndex : raw.correctAnswer
    if (typeof cIdx !== 'number' || (Array.isArray(raw.options) && (cIdx < 0 || cIdx >= raw.options.length))) {
      errors.push(`${prefix} (who-said-this): "correctIndex" is missing or out of bounds.`)
    } else {
      normalized.correctIndex = cIdx
    }
  } else if (type === 'sequence') {
    if (!Array.isArray(raw.items) || raw.items.length < 3) {
      errors.push(`${prefix} (sequence): "items" must be an array of at least 3 sequence steps.`)
    } else {
      normalized.items = raw.items.map((item: any) => String(item || '').trim())
    }

    if (!Array.isArray(raw.correctOrder) || (Array.isArray(raw.items) && raw.correctOrder.length !== raw.items.length)) {
      errors.push(`${prefix} (sequence): "correctOrder" array length must match "items" length.`)
    } else {
      normalized.correctOrder = raw.correctOrder.map(Number)
    }
  } else if (type === 'match-pairs') {
    // Check if NotebookLM gave pairs: [{left: ..., right: ...}]
    if (Array.isArray(raw.pairs) && raw.pairs.length >= 2 && (!raw.left || !raw.right)) {
      normalized.left = raw.pairs.map((p: any) => String(p.left || '').trim())
      normalized.right = raw.pairs.map((p: any) => String(p.right || '').trim())
      normalized.correctPairs = raw.pairs.map((_: any, i: number) => [i, i])
      warnings.push(`${prefix} (match-pairs): Auto-converted {pairs: [{left, right}]} into left[], right[], and correctPairs[].`)
    } else {
      if (!Array.isArray(raw.left) || raw.left.length < 2) {
        errors.push(`${prefix} (match-pairs): "left" must be an array of at least 2 items.`)
      }
      if (!Array.isArray(raw.right) || raw.right.length < 2) {
        errors.push(`${prefix} (match-pairs): "right" must be an array of at least 2 items.`)
      }
      if (!Array.isArray(raw.correctPairs) || raw.correctPairs.length === 0) {
        errors.push(`${prefix} (match-pairs): "correctPairs" must be an array of [leftIndex, rightIndex] tuples.`)
      } else {
        normalized.correctPairs = raw.correctPairs
      }
    }
  }

  return {
    question: errors.length === 0 ? (normalized as Question) : null,
    errors,
    warnings,
  }
}

/**
 * Validates a list of questions, returning comprehensive error list and normalized questions.
 */
export function validateQuestionsList(questions: any[]): ValidationResult {
  if (!Array.isArray(questions)) {
    return {
      valid: false,
      errors: ['Input must be a JSON array of questions: [ { "type": "...", ... } ]'],
      warnings: [],
      normalizedQuestions: [],
    }
  }

  if (questions.length === 0) {
    return {
      valid: false,
      errors: ['Questions array cannot be empty. At least one question is required.'],
      warnings: [],
      normalizedQuestions: [],
    }
  }

  const allErrors: string[] = []
  const allWarnings: string[] = []
  const normalizedList: Question[] = []

  questions.forEach((raw, idx) => {
    const { question, errors, warnings } = validateQuestion(raw, idx)
    if (errors.length > 0) {
      allErrors.push(...errors)
    }
    if (warnings.length > 0) {
      allWarnings.push(...warnings)
    }
    if (question) {
      normalizedList.push(question)
    }
  })

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    normalizedQuestions: normalizedList,
  }
}
