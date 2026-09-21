# Brahma Jijñāsā — NotebookLM Compact Quiz Prompt (<3500 chars)

> **Instructions for NotebookLM:**
> 1. Upload your source books/PDFs into your notebook at [notebooklm.google.com](https://notebooklm.google.com/).
> 2. Copy the prompt block below and paste it directly into the NotebookLM chat.
> 3. Total character count: **~2,200 characters** (well within NotebookLM's 3,500-character prompt limit).

---

```markdown
Based STRICTLY on the uploaded sources in this notebook (verses, translations, and commentaries):
Generate a 20-question quiz formatted as a single, valid JSON object conforming to the schema below. Output pure JSON ONLY (no preamble or conversational text).

RULES:
1. Ground every question, option, and explanation directly in the uploaded sources.
2. In each question, provide an authentic "reference" (Book, Canto/Parva, Chapter, Verse, or Section) and a clear "explanation" citing the source.
3. Every interactive type appears ONLY ONCE.
4. Difficulty: exactly 5 "easy", 10 "medium", and 5 "hard".
5. In Q6 ("sequence"), "items" must be scrambled (NEVER [0,1,2,3]). In Q7 ("match-pairs"), "right" must be scrambled so "correctPairs" is NEVER [[0,0],[1,1],[2,2],[3,3]].
6. For Q14 and Q15: in "scenario", provide 2-3 vivid sentences explaining the scriptural story and context before posing the question.

QUESTION TYPES (20 questions in this exact order):
Q1: "single-choice" (options: 4 strings, correctIndex: 0-3)
Q2: "multiple-select" (options: 4 strings, correctIndices: array of 0-3 indices)
Q3: "true-false" (statement in question, correct: boolean)
Q4: "who-am-i" (clues: [3pts subtle clue, 2pts clearer clue, 1pt direct clue], options: 4 strings, correctIndex: 0-3)
Q5: "who-said-this" (quote: string, context: string, options: 4 speakers, correctIndex: 0-3)
Q6: "sequence" (items: 4 scrambled events/stages, correctOrder: [indices 0-3 in chronological order])
Q7: "match-pairs" (left: 4 items, right: 4 items, correctPairs: [[0,x],[1,y],[2,z],[3,w]])
Q8: "assertion-reason" (assertion: string, reason: string, options: 4 standard A/R choices, correctIndex: 0-3)
Q9: "spot-the-error" (passage: 2-sentence passage with 1 factual error, options: 4 corrections, correctIndex: 0-3)
Q10: "missing-link" (chain: ["Step 1", "Step 2", "?", "Step 4"], options: 4 choices for "?", correctIndex: 0-3)
Q11: "odd-one-out" (options: 4 strings where 3 share a rule and 1 is exception, correctIndex: 0-3)
Q12: "cause-effect" (options: 4 causal outcomes, correctIndex: 0-3)
Q13: "two-truths-one-false" (options: 3 statements, correctIndex: index of the FALSE statement 0-2)
Q14: "case-study" (scenario: 2-3 sentences of scriptural story & context, question: practical dilemma/decision, options: 4 choices, correctIndex: 0-3)
Q15: "what-would-you-do" (scenario: 2-3 sentences of moral dilemma & teaching, question: what should be done according to dharma?, options: 4 choices, correctIndex: 0-3)
Q16: "single-choice"
Q17: "multiple-select"
Q18: "single-choice"
Q19: "multiple-select"
Q20: "single-choice"

JSON SCHEMA:
{
  "id": "quiz-slug",
  "title": "Descriptive Quiz Title",
  "category": "mahabharata",
  "description": "Summary of quiz topic and sources covered",
  "difficulty": "medium",
  "timeLimit": 1200,
  "onTimeExpiry": "submit-partial",
  "questions": [
    // 20 question objects. Each MUST have:
    // id (1-20), type, question, difficulty ("easy"|"medium"|"hard"),
    // points: 1 (easy), 2-2.5 (medium), 3-4 (hard/interactive), explanation, reference, plus type-specific fields.
    // (Note: The engine automatically standardizes points based on type and difficulty if omitted).
  ]
}
```

---

### Pro-Tip:
If NotebookLM's response truncates due to output length limits, simply ask:
> *"Output questions 1 to 10 first in JSON."*
Then follow up with:
> *"Now output questions 11 to 20 in the same JSON format."*
