#!/usr/bin/env node
// ==============================================================================
// Brahma Jijñāsā — Quiz JSON Validator CLI
// Validates that an AI-generated quiz JSON file strictly adheres to the schema
// and runtime requirements of the platform.
//
// Usage:
//   node scripts/validate-quiz.mjs quizzes/mahabharata/variety-demo.json
// ==============================================================================

import fs from 'fs'
import path from 'path'

const filePath = process.argv[2]
if (!filePath) {
  console.error('\x1b[31mError:\x1b[0m Please provide a path to a quiz JSON file.')
  console.log('Usage: node scripts/validate-quiz.mjs <path-to-quiz.json>')
  process.exit(1)
}

const resolvedPath = path.resolve(filePath)
if (!fs.existsSync(resolvedPath)) {
  console.error(`\x1b[31mError:\x1b[0m File not found: ${resolvedPath}`)
  process.exit(1)
}

let raw
try {
  raw = fs.readFileSync(resolvedPath, 'utf8')
} catch (e) {
  console.error(`\x1b[31mError reading file:\x1b[0m ${e.message}`)
  process.exit(1)
}

let quiz
try {
  quiz = JSON.parse(raw)
} catch (e) {
  console.error(`\x1b[31mJSON Parse Error:\x1b[0m ${e.message}`)
  process.exit(1)
}

const errors = []
const warnings = []

// Top-level validation
if (!quiz.id) errors.push('Missing "id" (string)')
if (!quiz.title) errors.push('Missing "title" (string)')
if (!quiz.category) errors.push('Missing "category" (string)')
if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
  errors.push('Missing or empty "questions" array')
}

const VALID_TYPES = new Set([
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
])

const seenTypes = new Set()

quiz.questions?.forEach((q, idx) => {
  const prefix = `Question #${q.id ?? idx + 1} (${q.type || 'unknown'}):`

  if (!q.id) errors.push(`${prefix} Missing "id"`)
  if (!q.type || !VALID_TYPES.has(q.type)) {
    errors.push(`${prefix} Invalid or missing type "${q.type}". Must be one of: ${[...VALID_TYPES].join(', ')}`)
  } else {
    seenTypes.add(q.type)
  }

  if (!q.question && q.type !== 'who-am-i') {
    errors.push(`${prefix} Missing "question" text`)
  }

  if (!q.explanation) {
    warnings.push(`${prefix} Missing "explanation" (strongly recommended for learning)`)
  }

  if (!q.reference) {
    warnings.push(`${prefix} Missing scriptural "reference"`)
  }

  // Type-specific checks
  switch (q.type) {
    case 'single-choice':
    case 'odd-one-out':
    case 'spot-the-error':
    case 'missing-link':
    case 'case-study':
    case 'what-would-you-do':
    case 'cause-effect':
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${prefix} "options" must be an array of at least 2 items`)
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= (q.options?.length ?? 0)) {
        errors.push(`${prefix} "correctIndex" (${q.correctIndex}) out of bounds for options length ${q.options?.length}`)
      }
      break

    case 'multiple-select':
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${prefix} "options" must be an array of at least 2 items`)
      }
      if (!Array.isArray(q.correctIndices) || q.correctIndices.length === 0) {
        errors.push(`${prefix} "correctIndices" must be a non-empty array of indices`)
      } else {
        q.correctIndices.forEach(ci => {
          if (typeof ci !== 'number' || ci < 0 || ci >= (q.options?.length ?? 0)) {
            errors.push(`${prefix} "correctIndices" contains out-of-bounds index: ${ci}`)
          }
        })
      }
      break

    case 'true-false':
      if (typeof q.correct !== 'boolean') {
        errors.push(`${prefix} "correct" must be a boolean (true or false)`)
      }
      break

    case 'who-am-i':
      if (!Array.isArray(q.clues) || q.clues.length < 2) {
        errors.push(`${prefix} "clues" must be an array of at least 2 progressive clues`)
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${prefix} "options" must be an array of at least 2 items`)
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= (q.options?.length ?? 0)) {
        errors.push(`${prefix} "correctIndex" (${q.correctIndex}) out of bounds`)
      }
      break

    case 'who-said-this':
      if (!q.quote) errors.push(`${prefix} Missing "quote"`)
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${prefix} "options" must be an array of at least 2 items`)
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= (q.options?.length ?? 0)) {
        errors.push(`${prefix} "correctIndex" (${q.correctIndex}) out of bounds`)
      }
      break

    case 'sequence':
      if (!Array.isArray(q.items) || q.items.length < 2) {
        errors.push(`${prefix} "items" must be an array of at least 2 items to sequence`)
      }
      if (!Array.isArray(q.correctOrder) || q.correctOrder.length !== q.items?.length) {
        errors.push(`${prefix} "correctOrder" length must match "items" length (${q.items?.length})`)
      }
      break

    case 'match-pairs':
      if (!Array.isArray(q.left) || !Array.isArray(q.right) || q.left.length !== q.right.length) {
        errors.push(`${prefix} "left" and "right" must be arrays of equal length`)
      }
      if (!Array.isArray(q.correctPairs) || q.correctPairs.length !== q.left?.length) {
        errors.push(`${prefix} "correctPairs" must have one pair per left item`)
      }
      break

    case 'assertion-reason':
      if (!q.assertion) errors.push(`${prefix} Missing "assertion" text`)
      if (!q.reason) errors.push(`${prefix} Missing "reason" text`)
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${prefix} "options" must contain exactly 4 Assertion-Reason choices`)
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
        errors.push(`${prefix} "correctIndex" must be 0, 1, 2, or 3`)
      }
      break
  }
})

console.log('\n========================================')
console.log(` Quiz: \x1b[36m${quiz.title}\x1b[0m`)
console.log(` File: ${path.basename(resolvedPath)}`)
console.log(` Category: ${quiz.category} | Questions: ${quiz.questions?.length ?? 0}`)
console.log(` Distinct Question Types: ${seenTypes.size} (${[...seenTypes].join(', ')})`)
console.log('========================================\n')

if (warnings.length > 0) {
  console.log(`\x1b[33m⚠️  ${warnings.length} Warnings:\x1b[0m`)
  warnings.forEach(w => console.log(`   - ${w}`))
  console.log('')
}

if (errors.length > 0) {
  console.log(`\x1b[31m❌  ${errors.length} Errors Found:\x1b[0m`)
  errors.forEach(e => console.log(`   - ${e}`))
  console.log('')
  process.exit(1)
} else {
  console.log('\x1b[32m✅  All validation checks passed! This quiz is 100% valid for Brahma Jijñāsā.\x1b[0m\n')
  process.exit(0)
}
