import type {
  Question,
  Answer,
  AnswerMap,
  ScoreResult,
  QuestionResult,
  WhoAmIAnswer,
  PairsAnswer,
  SequenceAnswer,
} from '@/types/quiz'

// ——— Score a single question ———
export function scoreQuestion(question: Question, answer: Answer): QuestionResult {
  const max = question.points
  let earned = 0
  let correct = false

  switch (question.type) {
    case 'single-choice':
    case 'cause-effect':
    case 'odd-one-out':
    case 'spot-the-error':
    case 'two-truths-one-false':
    case 'evidence-based':
    case 'who-said-this':
    case 'case-study':
    case 'what-would-you-do':
    case 'missing-link':
    case 'assertion-reason': {
      const selected = answer as number | null
      correct = selected === question.correctIndex
      earned = correct ? max : 0
      break
    }

    case 'true-false': {
      const selected = answer as boolean | null
      correct = selected === question.correct
      earned = correct ? max : 0
      break
    }

    case 'multiple-select': {
      const selected = (answer as number[]) || []
      const correctSet = new Set(question.correctIndices)
      let pts = 0
      selected.forEach(idx => {
        if (correctSet.has(idx)) pts += 1
        else pts -= 0.5
      })
      earned = Math.max(0, pts)
      correct = (
        selected.length === question.correctIndices.length &&
        selected.every(i => correctSet.has(i))
      )
      break
    }

    case 'who-am-i': {
      const wa = answer as WhoAmIAnswer | null
      if (!wa || wa.selectedIndex === null) {
        earned = 0; correct = false; break
      }
      if (wa.selectedIndex !== question.correctIndex) {
        earned = 0; correct = false; break
      }
      correct = true
      const cluesUsed = wa.cluesRevealed
      if (cluesUsed <= 1) earned = 3
      else if (cluesUsed === 2) earned = 2
      else earned = 1
      earned = Math.min(earned, max) // cap at question.points
      break
    }

    case 'sequence': {
      const userOrder = (answer as SequenceAnswer) || []
      const correctOrder = question.correctOrder
      // Partial: 0.5pt per item in correct relative position
      let correct_pairs = 0
      for (let i = 0; i < correctOrder.length - 1; i++) {
        const a = userOrder.indexOf(correctOrder[i])
        const b = userOrder.indexOf(correctOrder[i + 1])
        if (a < b) correct_pairs++
      }
      const maxPairs = correctOrder.length - 1
      earned = maxPairs > 0 ? Math.round((correct_pairs / maxPairs) * max * 2) / 2 : 0
      correct = correct_pairs === maxPairs
      break
    }

    case 'match-pairs': {
      const userPairs = (answer as PairsAnswer) || []
      let matched = 0
      for (const [l, r] of userPairs) {
        if (question.correctPairs.some(([cl, cr]) => cl === l && cr === r)) matched++
      }
      earned = matched
      correct = matched === question.correctPairs.length
      break
    }

    default:
      earned = 0; correct = false
  }

  return { questionId: question.id, earned, max, correct }
}

// ——— Score full quiz ———
export function scoreQuiz(questions: Question[], answers: AnswerMap): ScoreResult {
  const questionResults = questions.map(q => scoreQuestion(q, answers[q.id] ?? null))
  const totalEarned = questionResults.reduce((sum, r) => sum + r.earned, 0)
  const totalMax    = questionResults.reduce((sum, r) => sum + r.max, 0)
  const percentage  = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0

  return { totalEarned, totalMax, percentage, questionResults }
}

// ——— Format time ———
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ——— Performance label ———
export function getPerformanceLabel(percentage: number): { label: string; emoji: string } {
  if (percentage >= 90) return { label: 'Exceptional — Brahmajñānī!',  emoji: '🌟' }
  if (percentage >= 75) return { label: 'Excellent — Vidvān!',          emoji: '🏆' }
  if (percentage >= 60) return { label: 'Good — Jijñāsu!',              emoji: '🎯' }
  if (percentage >= 40) return { label: 'Keep Learning — Śiṣya!',       emoji: '📖' }
  return                       { label: 'Seek Guidance — Abhyāsa!',     emoji: '🙏' }
}
