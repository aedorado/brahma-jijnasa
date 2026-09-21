# Śrīmad-Bhāgavatam — NotebookLM Master Quiz Prompt

> **Instructions for NotebookLM:**
> 1. In [notebooklm.google.com](https://notebooklm.google.com/), upload your Śrīmad-Bhāgavatam PDFs, Cantos, chapters, or purport notes.
> 2. Set the `[SCOPE]` in the prompt below (either keep it generic or specify a pastime/canto/chapter).
> 3. Copy the prompt block and paste it into NotebookLM.
> 4. Total prompt length: **~2,400 characters** (well within NotebookLM's 3,500 character limit).

---

```markdown
[SCOPE]: "Comprehensive (All Uploaded SB Sources)"
// OR REPLACE ABOVE WITH SPECIFIC PASTIME/SECTION, FOR EXAMPLE:
// [SCOPE]: "Canto 1 Chapters 1-3 (Questions by Sages & Incarnations)"
// [SCOPE]: "Dhruva Mahārāja Pastimes (Canto 4, Chapters 8-12)"
// [SCOPE]: "Prahlāda Mahārāja & Lord Nṛsiṁhadeva (Canto 7, Chapters 1-10)"
// [SCOPE]: "Gajendra Mokṣa & Churning of the Ocean (Canto 8)"
// [SCOPE]: "Ambarīṣa Mahārāja & Durvāsā Muni (Canto 9, Chapters 4-5)"
// [SCOPE]: "Dāmodara-līlā & Vraja Pastimes (Canto 10, Chapters 8-11)"
// [SCOPE]: "Ajamila Deliverance & Yamadūta-Viṣṇudūta Saṁvāda (Canto 6, Ch 1-3)"

Based STRICTLY on the uploaded Śrīmad-Bhāgavatam sources (verses, translations, and purports) focusing on the [SCOPE] declared above:
Generate a 20-question quiz formatted as a single, valid JSON object conforming to the schema below. Output pure JSON ONLY (no commentary or preamble).

RULES:
1. All facts, philosophical purports, and names must come strictly from the text.
2. Provide an authentic "reference" (e.g. "Śrīmad-Bhāgavatam 1.2.18" or "SB Canto 7 Chapter 9") and a clear "explanation" for every question.
3. Include exactly 5 "easy", 10 "medium", and 5 "hard" questions.
4. Each interactive question type must appear EXACTLY ONCE.
5. In Q6 ("sequence"), "items" must be scrambled (NEVER [0,1,2,3]). In Q7 ("match-pairs"), "right" must be scrambled so "correctPairs" is NEVER [[0,0],[1,1],[2,2],[3,3]].
6. For Q14 and Q15: write 2-3 vivid sentences of scriptural narrative context in "scenario" before asking the practical or moral question.

QUESTION SEQUENCE (1 to 20):
Q1: "single-choice" (options: 4 strings, correctIndex: 0-3)
Q2: "multiple-select" (options: 4 strings, correctIndices: array of 0-3 indices)
Q3: "true-false" (statement in question, correct: boolean)
Q4: "who-am-i" (clues: [3pts subtle clue, 2pts clearer clue, 1pt direct clue], options: 4 personalities, correctIndex: 0-3)
Q5: "who-said-this" (quote: string, context: string, options: 4 speakers, correctIndex: 0-3)
Q6: "sequence" (items: 4 scrambled chronological events/stages, correctOrder: [indices 0-3 in correct order])
Q7: "match-pairs" (left: 4 items, right: 4 items, correctPairs: [[0,x],[1,y],[2,z],[3,w]])
Q8: "assertion-reason" (assertion: string, reason: string, options: 4 standard A/R choices, correctIndex: 0-3)
Q9: "spot-the-error" (passage: 2-sentence passage with 1 factual error, options: 4 corrections, correctIndex: 0-3)
Q10: "missing-link" (chain: ["Step 1", "Step 2", "?", "Step 4"], options: 4 choices for "?", correctIndex: 0-3)
Q11: "odd-one-out" (options: 4 items where 3 share a rule and 1 is exception, correctIndex: 0-3)
Q12: "cause-effect" (options: 4 causal outcomes, correctIndex: 0-3)
Q13: "two-truths-one-false" (options: 3 statements, correctIndex: index of FALSE statement 0-2)
Q14: "case-study" (scenario: 2-3 sentences of Bhāgavatam story context, question: real-life application, options: 4 choices, correctIndex: 0-3)
Q15: "what-would-you-do" (scenario: 2-3 sentences of dharmic dilemma, question: highest duty according to Bhāgavatam, options: 4 choices, correctIndex: 0-3)
Q16: "single-choice"
Q17: "multiple-select"
Q18: "single-choice"
Q19: "multiple-select"
Q20: "single-choice"

JSON SCHEMA:
{
  "id": "sb-[scope-slug]-quiz-20",
  "title": "Śrīmad-Bhāgavatam — [Topic / Scope Title]",
  "category": "puranas",
  "description": "Comprehensive quiz on [Topic] based on Śrīmad-Bhāgavatam verses and commentaries.",
  "difficulty": "medium",
  "timeLimit": 1200,
  "onTimeExpiry": "submit-partial",
  "questions": [
    // 20 question objects with id (1-20), type, question, difficulty ("easy"|"medium"|"hard"), points (1 for easy, 2-2.5 for medium, 3-4 for hard/interactive), explanation, reference, and type fields
    // (Note: The engine automatically standardizes points based on type and difficulty if omitted).
  ]
}
```

---

### Tips for Best Output in NotebookLM:
1. **If output cuts off halfway:**
   NotebookLM has an output length limit. Simply type:
   > *"Continue from question 11 in the same JSON format."*
   Then combine the two arrays into one file.
2. **Validate instantly:**
   Save the generated JSON into `quizzes/puranas/<filename>.json` and run:
   ```bash
   npm run validate:quiz quizzes/puranas/<filename>.json
   ```
