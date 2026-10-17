# Bhagavad-gītā Chapter 10 (Vibhūti-yoga) 20-Question Quiz Prompt
### (7 Easy, 9 Medium, 4 Hard) — NotebookLM Optimized

> **NotebookLM Ready**: Structured strictly for NotebookLM's source-grounded generation.
> Copy the code block below directly into NotebookLM.

---

```markdown
[SCOPE]: "Bhagavad-gītā Chapter 10 (Vibhūti-yoga — The Opulence of the Absolute)"

Based STRICTLY on the uploaded source material for Bhagavad-gītā Chapter 10:
Generate a 20-question interactive quiz as a single valid JSON object. Output pure JSON ONLY (no markdown fences, commentary, or text outside the JSON code block).

RULES:
1. Difficulty: Exactly 7 easy (Q1-7), 9 medium (Q8-16), 4 hard (Q17-20).
2. Integer IDs 1 to 20 (never "q1").
3. Authentic "reference" (e.g. "BG 10.8", "BG 10.41") and "explanation" on all questions.
4. Balanced Chapter Coverage:
   - Krishna as the supreme uncaused source (10.1–10.7)
   - Catur-śloki Gītā core philosophy (10.8–10.11)
   - Arjuna's acceptance and prayerful inquiry (10.12–10.18)
   - Specific divine opulences / Vibhūtis & all-pervading spark (10.19–10.42)
5. Multi-Select Variety: Disperse distractors so correctIndices is NOT always [0,1,2] (e.g. [0,2], [1,3], [0,2,3]).
6. Scrambling: Thoroughly scramble sequence "items" (correctOrder 0-indexed) & match-pairs "right" items. who-am-i: 3 progressive clues.

SEQUENCE (1 to 20):
[EASY - 7]
Q1: "single-choice" (easy, 1pt, options: 4, correctIndex: 0-3)
Q2: "true-false" (easy, 1pt, question: clear statement, correct: boolean)
Q3: "who-said-this" (easy, 1pt, question: string, quote: string, context: string, options: 4, correctIndex: 0-3)
Q4: "who-am-i" (easy, 2pts, clues: 3 strings, options: 4, correctIndex: 0-3)
Q5: "single-choice" (easy, 1pt, options: 4, correctIndex: 0-3)
Q6: "true-false" (easy, 1pt, question: clear statement, correct: boolean)
Q7: "multiple-select" (easy, 2pts, options: 4, correctIndices: array)

[MEDIUM - 9]
Q8: "sequence" (medium, 3pts, items: 4 scrambled events/manifestations, correctOrder: [0-3])
Q9: "match-pairs" (medium, 3pts, left: 4 vibhūti categories, right: 4 scrambled manifestations, correctPairs: [[0,x],[1,y],[2,z],[3,w]])
Q10: "cause-effect" (medium, 2.5pts, question: cause/action, options: 4, correctIndex: 0-3)
Q11: "odd-one-out" (medium, 2pts, options: 4 items from Chapter 10 where 3 share category and 1 does not, correctIndex: 0-3)
Q12: "missing-link" (medium, 2pts, chain: ["A","B","?","D"], options: 4, correctIndex: 0-3)
Q13: "two-truths-one-false" (medium, 2.5pts, options: 3 statements, correctIndex: 0-2 of FALSE statement)
Q14: "who-am-i" (medium, 3pts, clues: 3 strings, options: 4, correctIndex: 0-3)
Q15: "multiple-select" (medium, 3pts, options: 4, correctIndices: array)
Q16: "what-would-you-do" (medium, 3pts, scenario: 2-3 sentences applying BG 10.8-10.10, question: spiritual action, options: 4, correctIndex: 0-3)

[HARD - 4]
Q17: "evidence-based" (hard, 3.5pts, principle: string, question: string, options: 4, correctIndex: 0-3)
Q18: "match-pairs" (hard, 3.5pts, left: 4 subtle manifestations, right: 4 scrambled categories, correctPairs: [[0,x],[1,y],[2,z],[3,w]])
Q19: "two-truths-one-false" (hard, 3.5pts, options: 3 deep philosophical statements from purports/verses, correctIndex: 0-2 of FALSE statement)
Q20: "multiple-select" (hard, 4pts, options: 4-5, correctIndices: array)

JSON SCHEMA:
{
  "id": "bg-chapter-10-vibhuti-yoga",
  "title": "Bhagavad-gītā Chapter 10 — Vibhūti-yoga",
  "category": "bhagavad-gita",
  "description": "Comprehensive 20-question quiz on the Opulences of the Absolute and Catur-śloki Gītā.",
  "difficulty": "medium",
  "timeLimit": 1200,
  "onTimeExpiry": "submit-partial",
  "questions": [
    // 20 objects: id (1-20 integer), type, question, difficulty ("easy"|"medium"|"hard"), points, reference, explanation, plus type-specific fields
  ]
}
```
