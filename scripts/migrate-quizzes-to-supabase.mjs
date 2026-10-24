import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
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
  console.error('Error: Supabase URL or Key not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const QUIZZES_DIR = path.resolve(process.cwd(), 'quizzes')

function getStandardQuestionPoints(type, difficulty) {
  if (['single-choice', 'true-false', 'who-said-this', 'odd-one-out', 'missing-link'].includes(type)) {
    return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
  }
  if (['assertion-reason', 'cause-effect', 'spot-the-error', 'two-truths-one-false', 'evidence-based', 'case-study', 'what-would-you-do'].includes(type)) {
    return difficulty === 'easy' ? 1.5 : difficulty === 'medium' ? 2.5 : 3.5
  }
  return difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return []
  return questions.map((q, idx) => ({
    ...q,
    id: q.id !== undefined && q.id !== null ? q.id : idx + 1,
    difficulty: q.difficulty || 'medium',
    points: (typeof q.points === 'number' && q.points >= 1 && q.points <= 5)
      ? q.points
      : getStandardQuestionPoints(q.type, q.difficulty || 'medium'),
  }))
}

async function migrateAllQuizzes() {
  console.log('🚀 Starting migration of quizzes from filesystem to Supabase `quizzes` table...')

  if (!fs.existsSync(QUIZZES_DIR)) {
    console.error('Directory not found:', QUIZZES_DIR)
    process.exit(1)
  }

  const categories = fs.readdirSync(QUIZZES_DIR).filter(f =>
    fs.statSync(path.join(QUIZZES_DIR, f)).isDirectory()
  )

  const quizMap = new Map()

  for (const cat of categories) {
    const catDir = path.join(QUIZZES_DIR, cat)
    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.json'))

    for (const f of files) {
      const fullPath = path.join(catDir, f)
      try {
        const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
        const isHi = f.endsWith('.hi.json') || f.endsWith('-hi.json')
        const isPt = f.endsWith('.pt.json') || f.endsWith('-pt.json')
        const baseId = raw.id || f.replace(/\.(hi|pt)\.json$/, '').replace(/\.json$/, '')

        if (!quizMap.has(baseId)) {
          quizMap.set(baseId, {
            id: baseId,
            title: raw.title || baseId,
            category: raw.category || cat,
            description: raw.description || null,
            difficulty: raw.difficulty || 'medium',
            time_limit: raw.timeLimit || 720,
            on_time_expiry: raw.onTimeExpiry || 'submit-partial',
            languages: {},
          })
        }

        const entry = quizMap.get(baseId)
        if (isHi) {
          entry.languages.hi = normalizeQuestions(raw.questions)
        } else if (isPt) {
          entry.languages.pt = normalizeQuestions(raw.questions)
        } else {
          entry.title = raw.title || entry.title
          entry.description = raw.description || entry.description
          entry.category = raw.category || entry.category
          entry.difficulty = raw.difficulty || entry.difficulty
          entry.time_limit = raw.timeLimit || entry.time_limit
          entry.on_time_expiry = raw.onTimeExpiry || entry.on_time_expiry
          entry.languages.en = normalizeQuestions(raw.questions)
        }
      } catch (err) {
        console.warn(`Could not parse ${f}:`, err.message)
      }
    }
  }

  console.log(`📦 Discovered ${quizMap.size} unique quizzes to migrate.`)

  let successCount = 0
  let failCount = 0

  for (const [quizId, item] of quizMap.entries()) {
    const payload = {
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      difficulty: item.difficulty,
      time_limit: item.time_limit,
      on_time_expiry: item.on_time_expiry,
      author_name: 'Brahmā-Jijñāsā Editorial',
      is_published: true,
      tags: [item.category],
      questions: {
        en: item.languages.en || [],
        ...(item.languages.hi && item.languages.hi.length > 0 ? { hi: item.languages.hi } : {}),
        ...(item.languages.pt && item.languages.pt.length > 0 ? { pt: item.languages.pt } : {}),
      },
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('quizzes')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Failed to migrate quiz [${quizId}]:`, error.message)
      failCount++
    } else {
      const langKeys = Object.keys(payload.questions).join(', ')
      console.log(`✅ Migrated [${quizId}]: "${item.title}" (${langKeys})`)
      successCount++
    }
  }

  console.log('\n=============================================')
  console.log(`🎉 Migration Completed! Successfully migrated: ${successCount}, Failed: ${failCount}`)
  console.log('=============================================')
}

migrateAllQuizzes().catch(err => {
  console.error('Migration aborted with error:', err)
  process.exit(1)
})
