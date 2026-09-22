# Brahma Jijñāsā — Universal High-Quality NotebookLM Quiz Prompt

> **Character Count:** ~3,300 characters (Strictly under 3,500 characters limit).

---

```markdown
Based STRICTLY on the uploaded source material:
Generate a 20-question interactive quiz as a single valid JSON object. Output pure JSON ONLY (no markdown fences or commentary).

QUALITY RULES:
1. FOCUS ON CORE INSPIRING THEMES: Essential, faith-building, memorable events and teachings. Avoid obscure footnote trivia or administrative dates.
2. NO CROSS-QUESTION LEAKS: Questions must be isolated. Never reveal an answer inside another question.
3. SHUFFLE ANSWERS:
   - For single-choice: Distribute correctIndex across 0, 1, 2, 3 (do NOT default to 0).
   - For multiple-select: Vary correctIndices (e.g. [1, 3], [0, 2, 3], [0, 3]). Never always use [0, 1, 2].
   - In sequence & match-pairs: Scramble items thoroughly so order is never [0, 1, 2, 3].
4. AUTHENTIC REFERENCES: Provide clear chapter references and concise explanations.
5. DIFFICULTY BALANCE: 6 Easy, 10 Medium, 4 Hard. (Do NOT include points).

20 QUESTIONS (Exact Order):
Q1: "single-choice" (options: 4 strings, correctIndex: 0-3)
Q2: "multiple-select" (options: 4 strings, correctIndices: array of 2-3 indices)
Q3: "true-false" (question: clear statement, correct: boolean)
Q4: "who-am-i" (clues: [subtle clue, clearer clue, direct clue], options: 4 strings, correctIndex: 0-3)
Q5: "who-said-this" (quote: string, context: string, options: 4 speakers, correctIndex: 0-3)
Q6: "sequence" (items: 4 scrambled events, correctOrder: [shuffled indices 0-3 in proper order])
Q7: "match-pairs" (left: 4 items, right: 4 scrambled items, correctPairs: [[0,x], [1,y], [2,z], [3,w]])
Q8: "assertion-reason" (assertion: string, reason: string, options: ["Both Assertion and Reason are true, and Reason is the correct explanation of Assertion", "Both Assertion and Reason are true, but Reason is NOT the correct explanation of Assertion", "Assertion is true, but Reason is false", "Assertion is false, but Reason is true"], correctIndex: 0-3)
Q9: "spot-the-error" (passage: 2-sentence passage with 1 factual error, options: 4 corrections, correctIndex: 0-3)
Q10: "missing-link" (chain: ["Step 1", "Step 2", "?", "Step 4"], options: 4 choices for "?", correctIndex: 0-3)
Q11: "odd-one-out" (options: 4 strings where 3 share theme and 1 does not, correctIndex: 0-3)
Q12: "cause-effect" (cause/action in question, options: 4 outcomes, correctIndex: 0-3)
Q13: "two-truths-one-false" (options: 3 statements (2 true, 1 false), correctIndex: index of FALSE statement 0-2)
Q14: "case-study" (scenario: 2-3 sentences of dilemma, question: decision, options: 4 choices, correctIndex: 0-3)
Q15: "what-would-you-do" (scenario: 2-3 sentences of situation, question: spiritual action, options: 4 choices, correctIndex: 0-3)
Q16, Q18, Q20: "single-choice" (options: 4 strings, correctIndex: 0-3)
Q17, Q19: "multiple-select" (options: 4 strings, correctIndices: array of 2-3 indices)

SCHEMA:
{"id":"64-day-01","title":"Day 1: The Life & Legacy of HH Bhakti Tirtha Swami","category":"64-principles","description":"Life, surrender, preaching & teachings of HH Bhakti Tirtha Swami from Black Lotus","difficulty":"medium","timeLimit":720,"onTimeExpiry":"submit-partial","questions":[{"id":"q1","type":"single-choice","question":"...","options":["A","B","C","D"],"correctIndex":2,"difficulty":"easy","explanation":"...","reference":"Chapter 1"}]}
```
