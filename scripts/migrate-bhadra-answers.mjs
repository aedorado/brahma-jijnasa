import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { scoreQuiz } from '../src/lib/scoring.ts'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    const val = rest.join('=').trim()
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val
    if ((key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') && !supabaseKey) supabaseKey = val
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Key not found in environment or .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Load canonical bhadra-purnima quiz
const quizRaw = fs.readFileSync(path.resolve(process.cwd(), 'quizzes/puranas/bhadra-purnima.json'), 'utf8')
const quiz = JSON.parse(quizRaw)

function getStandardQuestionPoints(type, difficulty) {
  if (['single-choice', 'true-false', 'who-said-this', 'odd-one-out', 'missing-link'].includes(type)) {
    return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
  }
  if (['assertion-reason', 'cause-effect', 'spot-the-error', 'two-truths-one-false', 'evidence-based', 'case-study', 'what-would-you-do'].includes(type)) {
    return difficulty === 'easy' ? 1.5 : difficulty === 'medium' ? 2.5 : 3.5
  }
  return difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
}

const normalizedQuiz = {
  ...quiz,
  questions: quiz.questions.map(q => ({
    ...q,
    points: (typeof q.points === 'number' && q.points >= 1 && q.points <= 5)
      ? q.points
      : getStandardQuestionPoints(q.type, q.difficulty || 'medium'),
  })),
}

async function migrate() {
  console.log('Fetching bhadra-purnima attempts from Supabase...')
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('id, user_id, quiz_id, score, max_score, answers')
    .eq('quiz_id', 'bhadra-purnima')

  if (error) {
    console.error('Failed to fetch attempts:', error)
    process.exit(1)
  }

  console.log(`Found ${attempts.length} attempts for bhadra-purnima.\n`)

  let updatedCount = 0

  for (const att of attempts) {
    const answers = { ...(att.answers || {}) }
    let rawQ2 = answers['2'] ?? answers['q2']
    let needsUpdate = false

    if (Array.isArray(rawQ2)) {
      // If student selected option 1 ("paramam gatim"), record 1;
      // otherwise, record their first selected wrong answer.
      const normalizedChoice = rawQ2.includes(1) ? 1 : (rawQ2[0] ?? 0)
      console.log(`[Attempt ${att.id.slice(0, 8)}] Migrating Q2: ${JSON.stringify(rawQ2)} -> ${normalizedChoice}`)
      answers['2'] = normalizedChoice
      if ('q2' in answers) delete answers['q2']
      needsUpdate = true
    } else if (typeof rawQ2 === 'number') {
      if ('q2' in answers) {
        answers['2'] = rawQ2
        delete answers['q2']
        needsUpdate = true
      }
    }

    // Rescore with standard scoring engine
    const result = scoreQuiz(normalizedQuiz.questions, answers)
    const scoreDiff = Number(att.score) !== result.totalEarned || Number(att.max_score) !== result.totalMax

    if (needsUpdate || scoreDiff) {
      console.log(`Updating Attempt ${att.id.slice(0, 8)}: Score ${att.score} -> ${result.totalEarned} / ${result.totalMax}`)
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          answers: answers,
          score: result.totalEarned,
          max_score: result.totalMax,
        })
        .eq('id', att.id)

      if (updateError) {
        console.error(`  ❌ Failed to update attempt ${att.id}:`, updateError.message)
      } else {
        console.log(`  ✅ Successfully updated DB.`)
        updatedCount++
      }
    }
  }

  console.log(`\nFinished! Migrated answers in DB for ${updatedCount} attempts.`)
}

migrate().catch(console.error)
