import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { scoreQuiz } from '../src/lib/scoring.ts'

// 1. Load environment variables from .env.local
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

// 2. Load all canonical quizzes from quizzes/
const QUIZZES_DIR = path.resolve(process.cwd(), 'quizzes')
const quizMap = new Map()

function loadQuizzes(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      loadQuizzes(fullPath)
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf8')
        const quiz = JSON.parse(raw)
        if (quiz.id) {
          quizMap.set(quiz.id, quiz)
        }
      } catch (err) {
        console.warn(`Failed to parse quiz ${entry.name}:`, err.message)
      }
    }
  }
}

loadQuizzes(QUIZZES_DIR)
console.log(`Loaded ${quizMap.size} canonical quizzes from disk:`, Array.from(quizMap.keys()))

// 3. Rescore all quiz_attempts in database
async function main() {
  console.log('\n--- Fetching quiz_attempts from Supabase ---')
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('id, user_id, quiz_id, score, max_score, answers, time_taken, completed_at')
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching quiz_attempts:', error)
    process.exit(1)
  }

  if (!attempts || attempts.length === 0) {
    console.log('No quiz attempts found in database.')
    return
  }

  console.log(`Found ${attempts.length} attempt records. Analyzing and rescoring...\n`)

  let updatedCount = 0
  let unchangedCount = 0
  let skippedCount = 0

  for (const att of attempts) {
    let targetQuizId = att.quiz_id
    // Aliases
    if (targetQuizId === 'sandbox' || targetQuizId?.startsWith('demo-session-')) {
      targetQuizId = 'sandbox-demo'
    }

    const quiz = quizMap.get(targetQuizId)
    if (!quiz) {
      console.log(`⚠️  [Skip] Attempt ${att.id}: Unknown quiz_id "${att.quiz_id}"`)
      skippedCount++
      continue
    }

    const answers = att.answers || {}
    if (Object.keys(answers).length === 0) {
      console.log(`ℹ️  [Skip] Attempt ${att.id}: No answers stored.`)
      skippedCount++
      continue
    }

    const result = scoreQuiz(quiz.questions, answers)
    const oldScore = Number(att.score)
    const oldMax = Number(att.max_score)
    const newScore = result.totalEarned
    const newMax = result.totalMax

    const isDifferent = oldScore !== newScore || oldMax !== newMax

    if (isDifferent) {
      console.log(`🔄 [Rescore] Attempt ${att.id} (${quiz.id} | User: ${att.user_id}):`)
      console.log(`    Old: ${oldScore} / ${oldMax} pts`)
      console.log(`    New: ${newScore} / ${newMax} pts (${result.percentage}%)`)

      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score: newScore,
          max_score: newMax,
        })
        .eq('id', att.id)

      if (updateError) {
        console.error(`    ❌ Failed to update attempt ${att.id}:`, updateError.message)
      } else {
        console.log(`    ✅ Updated in database successfully.`)
        updatedCount++
      }
    } else {
      unchangedCount++
    }
  }

  console.log('\n========================================')
  console.log(`Rescoring Summary:`)
  console.log(`  Total attempts:  ${attempts.length}`)
  console.log(`  Updated:         ${updatedCount}`)
  console.log(`  Already correct: ${unchangedCount}`)
  console.log(`  Skipped:         ${skippedCount}`)
  console.log('========================================\n')
}

main().catch(err => {
  console.error('Unexpected error during rescoring:', err)
  process.exit(1)
})
