import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { invalidateQuizCache } from '@/lib/quizzes'
import { createClient } from '@/lib/supabase/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'
import type { Quiz, Question } from '@/types/quiz'

import { validateQuestionsList } from '@/lib/quiz-validator'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 1. Validate top-level metadata
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : 'general'
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const difficulty = body.difficulty || 'medium'
    const time_limit = Number(body.time_limit || body.timeLimit || 720)
    const on_time_expiry = body.on_time_expiry || body.onTimeExpiry || 'submit-partial'
    const author_name = body.author_name || body.authorName || 'Brahmā-Jijñāsā Editorial'
    const is_published = body.is_published !== undefined ? Boolean(body.is_published) : true
    const tags = Array.isArray(body.tags) ? body.tags : [category]

    if (!id) {
      return NextResponse.json({ error: 'Quiz must have a valid slug "id" (e.g. "64-day-01").' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'Quiz must have a "title".' }, { status: 400 })
    }

    // 2. Normalize and strictly validate questions object: { en: Question[], hi?: Question[], pt?: Question[] }
    let questionsPayload: Record<string, Question[]> = {}

    if (Array.isArray(body.questions)) {
      if (body.questions.length === 0) {
        return NextResponse.json({ error: 'Quiz must have at least one question.' }, { status: 400 })
      }
      const validation = validateQuestionsList(body.questions)
      if (!validation.valid) {
        return NextResponse.json({
          error: `Question validation failed:\n• ${validation.errors.join('\n• ')}`,
          validationErrors: validation.errors,
        }, { status: 400 })
      }
      questionsPayload.en = validation.normalizedQuestions
    } else if (typeof body.questions === 'object' && body.questions !== null) {
      for (const [lang, qList] of Object.entries(body.questions)) {
        if (Array.isArray(qList) && qList.length > 0) {
          const validation = validateQuestionsList(qList)
          if (!validation.valid) {
            return NextResponse.json({
              error: `Validation failed for [${lang.toUpperCase()}] questions:\n• ${validation.errors.join('\n• ')}`,
              validationErrors: validation.errors,
            }, { status: 400 })
          }
          questionsPayload[lang] = validation.normalizedQuestions
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid questions payload. Must be an array or object keyed by language.' }, { status: 400 })
    }

    if (!questionsPayload.en || questionsPayload.en.length === 0) {
      const firstAvailableKey = Object.keys(questionsPayload)[0]
      if (firstAvailableKey && questionsPayload[firstAvailableKey]?.length > 0) {
        questionsPayload.en = questionsPayload[firstAvailableKey]
      } else {
        return NextResponse.json({ error: 'Quiz questions must not be empty.' }, { status: 400 })
      }
    }

    // 3. Authenticate current user via session cookie
    const supabase = await createClient()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const sessionUser = await verifySession(sessionToken)
    if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'teacher' && sessionUser.role !== 'creator')) {
      return NextResponse.json({ error: 'Unauthorized: Admin, Teacher, or Creator role required to save quizzes.' }, { status: 403 })
    }
    const currentUserId = sessionUser.id

    // Check if the quiz already exists to preserve original created_by
    const { data: existingQuiz } = await supabase
      .from('quizzes')
      .select('id, created_by')
      .eq('id', id)
      .maybeSingle()

    const isUpdate = Boolean(existingQuiz)
    const created_by = isUpdate ? (existingQuiz?.created_by || currentUserId) : currentUserId
    const updated_by = currentUserId
    const updated_at = new Date().toISOString()

    const dbPayload: Record<string, any> = {
      id,
      title,
      category,
      description: description || null,
      difficulty,
      time_limit,
      on_time_expiry,
      author_name,
      is_published,
      tags,
      questions: questionsPayload,
      updated_at,
    }

    if (created_by) dbPayload.created_by = created_by
    if (updated_by) dbPayload.updated_by = updated_by

    let { error: dbError } = await supabase
      .from('quizzes')
      .upsert(dbPayload, { onConflict: 'id' })

    // Auto-recovery 1: if updated_by column does not exist yet (before migration 008 is run)
    if (dbError && dbError.message?.toLowerCase().includes('updated_by')) {
      delete dbPayload.updated_by
      const retry = await supabase.from('quizzes').upsert(dbPayload, { onConflict: 'id' })
      dbError = retry.error
    }

    // Auto-recovery 2: if created_by violates legacy auth.users foreign key constraint
    if (dbError && (dbError.message?.includes('quizzes_created_by_fkey') || dbError.message?.includes('foreign key constraint'))) {
      delete dbPayload.created_by
      delete dbPayload.updated_by
      const retry = await supabase.from('quizzes').upsert(dbPayload, { onConflict: 'id' })
      dbError = retry.error
    }

    if (dbError) {
      console.error('[Save Quiz Supabase Error]:', dbError)
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    // Invalidate in-memory cache so subsequent reads immediately reflect latest quiz state
    invalidateQuizCache(id)

    // 3b. If linked to a series day, update quiz_series_rounds
    if (body.series_day_number !== undefined && body.series_day_number !== null) {
      const roundUpdates: Record<string, any> = {
        quiz_id: id,
        title,
      }
      if (body.unlock_at) {
        roundUpdates.unlock_at = body.unlock_at
      }
      const { error: roundErr } = await supabase
        .from('quiz_series_rounds')
        .update(roundUpdates)
        .eq('day_number', body.series_day_number)

      if (roundErr) {
        console.warn('[Save Quiz Series Round Warning]:', roundErr.message)
      }
    }


    return NextResponse.json({
      success: true,
      quizId: id,
      totalQuestions: questionsPayload.en.length,
      languages: Object.keys(questionsPayload),
    })
  } catch (err: any) {
    console.error('[Save Quiz API Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to save quiz' }, { status: 500 })
  }
}
