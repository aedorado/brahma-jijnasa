# Śrīmad-Bhāgavatam Generic 25-Question Quiz Prompt
### (12 Easy, 8 Medium, 5 Hard) — NotebookLM Optimized (~2,740 characters)

> **NotebookLM Ready**: This prompt is **2,739 characters** (well within NotebookLM's 3,500-character limit).
> Copy the code block below directly into NotebookLM, Claude, ChatGPT, or Gemini.

---

```markdown
[SCOPE]: "Comprehensive Śrīmad-Bhāgavatam (Cantos 1 to 12)"
// Or specify: [SCOPE]: "Canto 1", "Canto 10 Vraja-līlā", "Prahlāda Caritra", etc.

Based STRICTLY on Śrīmad-Bhāgavatam verses, translations, and purports for [SCOPE]:
Generate a 25-question quiz formatted as a single valid JSON object. Output pure JSON ONLY (no commentary or text outside the JSON code block).

RULES:
1. Difficulty: Exactly 12 easy (Q1-12), 8 med (Q13-20), 5 hard (Q21-25).
2. Integer IDs 1 to 25 (never "q1").
3. Authentic "reference" (e.g. "SB 1.2.18") and "explanation" on all questions.
4. Multi-Select Variety: Disperse distractors so correctIndices is NOT always [0,1,2] (e.g. [0,2], [1,3], [0,2,3]).
5. Assertion-Reason: Do NOT default to 0. Use Option 1 (both true, R does not explain A) or Option 2 (A true, R false) when appropriate.
6. Scrambling: Scramble sequence "items" (correctOrder 0-indexed) & match-pairs "right" items. who-am-i: 3 clues. case-study: 2-3 sentence "scenario".

SEQUENCE (1 to 25):
Q1, Q3, Q5, Q9, Q11: "single-choice" (easy, 1pt, options: 4, correctIndex: 0-3)
Q2, Q6, Q12: "true-false" (easy, 1pt, correct: boolean)
Q4, Q10: "who-said-this" (easy, 1pt, quote: string, context: string, options: 4, correctIndex: 0-3)
Q7: "multiple-select" (easy, 2pts, options: 4, correctIndices: array)
Q8: "who-am-i" (easy, 2pts, clues: 3 strings, options: 4, correctIndex: 0-3)
Q13: "sequence" (medium, 3pts, items: 4 scrambled, correctOrder: [0-3])
Q14: "match-pairs" (medium, 3pts, left: 4, right: 4 scrambled, correctPairs: [[0,x],[1,y],[2,z],[3,w]])
Q15: "cause-effect" (medium, 2.5pts, options: 4, correctIndex: 0-3)
Q16: "odd-one-out" (medium, 2pts, options: 4, correctIndex: 0-3)
Q17: "missing-link" (medium, 2pts, chain: ["A","B","?","D"], options: 4, correctIndex: 0-3)
Q18: "two-truths-one-false" (medium, 2.5pts, options: 3, correctIndex: 0-2 of false statement)
Q19: "who-am-i" (medium, 3pts, clues: 3 strings, options: 4, correctIndex: 0-3)
Q20: "multiple-select" (medium, 3pts, options: 4, correctIndices: array)
Q21: "assertion-reason" (hard, 3.5pts, assertion, reason, options: 4 standard A/R choices, correctIndex: 0-3)
Q22: "spot-the-error" (hard, 3.5pts, passage with 1 error, options: 4, correctIndex: 0-3)
Q23: "case-study" (hard, 3.5pts, scenario, question, options: 4, correctIndex: 0-3)
Q24: "multiple-select" (hard, 4pts, options: 4-5, correctIndices: array)
Q25: "single-choice" (hard, 3pts, options: 4, correctIndex: 0-3)

JSON SCHEMA:
{
  "id": "sb-generic-quiz-25",
  "title": "Śrīmad-Bhāgavatam — [Topic Title]",
  "category": "puranas",
  "description": "Comprehensive 25-question quiz on Śrīmad-Bhāgavatam.",
  "difficulty": "medium",
  "timeLimit": 1500,
  "onTimeExpiry": "submit-partial",
  "questions": [
    // 25 objects: id (1-25 integer), type, question, difficulty ("easy"|"medium"|"hard"), points, reference, explanation, plus type fields
  ]
}
```
