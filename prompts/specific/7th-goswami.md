# Śrīla Bhaktivinoda Ṭhākura Appearance Day — NotebookLM Quiz Prompt

> **Source Book:** *The Seventh Goswami* (Biography of Śrīla Bhaktivinoda Ṭhākura by Rūpa-vilāsa dāsa)  
> **Target Audience:** Inspiring, accessible celebration quiz (Easy to Medium, faith-building, non-obscure).  
> **Character Count:** **3,288 characters** (comfortably under NotebookLM's 3,500 limit).

---

```markdown
Based STRICTLY on the uploaded book "The Seventh Goswami":
Generate a 20-question celebration quiz on Śrīla Bhaktivinoda Ṭhākura as a single valid JSON object. Output pure JSON ONLY (no markdown fences or extra text).

QUALITY RULES:
1. INSPIRING & ACCESSIBLE: Focus on faith-building, famous milestones. Avoid obscure court dates or minute genealogy.
2. DIFFICULTY: Exactly 10 "easy" and 10 "medium" (0 hard).
3. KEY THEMES:
   - Early life as Kedaranatha Datta & exemplary magistrate service (writing at midnight).
   - Defeating the mystic yogi Bisakisen in Puri.
   - Svananda-sukhada-kunja in Godrumadvipa & preaching via Nāma-haṭṭa.
   - Discovering Yoga-pīṭha & Śrīla Jagannātha dāsa Bābājī dancing in ecstasy.
   - Prayer for a "ray of Viṣṇu" (Bimal Prasad / Śrīla Bhaktisiddhānta).
   - Masterworks: Jaiva-dharma, Caitanya-śikṣāmṛta, Śaraṇāgati, Gītāvalī.
4. SHUFFLE ANSWERS:
   - Single-choice: distribute correctIndex across 0, 1, 2, 3 (do NOT default to 0).
   - Sequence (Q6) & match-pairs (Q7): scramble items, NEVER in original order [0,1,2,3].
   - Multiple-select: vary correctIndices (e.g. [0,2], [1,3]).
5. Provide chapter references and concise explanations for every question.

20 QUESTIONS (Exact Order):
Q1: "single-choice" (options: 4 strings, correctIndex: 0-3)
Q2: "multiple-select" (options: 4 strings, correctIndices: array of 2-3 indices)
Q3: "true-false" (question: clear statement, correct: boolean)
Q4: "who-am-i" (clues: [subtle, clearer, direct], options: 4 strings, correctIndex: 0-3)
Q5: "who-said-this" (quote: string, context: string, options: 4 speakers, correctIndex: 0-3)
Q6: "sequence" (items: 4 scrambled events, correctOrder: [shuffled indices 0-3 in proper order])
Q7: "match-pairs" (left: 4 items, right: 4 scrambled items, correctPairs: [[0,x], [1,y], [2,z], [3,w]])
Q8: "assertion-reason" (assertion: string, reason: string, options: 4 standard A/R choices, correctIndex: 0-3)
Q9: "spot-the-error" (passage: 2 sentences with 1 factual error, options: 4 corrections, correctIndex: 0-3)
Q10: "missing-link" (chain: ["Step 1", "Step 2", "?", "Step 4"], options: 4 choices, correctIndex: 0-3)
Q11: "odd-one-out" (options: 4 strings where 3 share theme and 1 does not, correctIndex: 0-3)
Q12: "cause-effect" (cause/action in question, options: 4 outcomes, correctIndex: 0-3)
Q13: "two-truths-one-false" (options: 3 statements (2 true, 1 false), correctIndex: index of FALSE statement 0-2)
Q14: "case-study" (scenario: 2-3 sentences of dilemma, question: decision, options: 4 choices, correctIndex: 0-3)
Q15: "what-would-you-do" (scenario: 2-3 sentences of situation, question: spiritual action, options: 4 choices, correctIndex: 0-3)
Q16, Q18, Q20: "single-choice" (options: 4 strings, correctIndex: 0-3)
Q17, Q19: "multiple-select" (options: 4 strings, correctIndices: array of 2-3 indices)

SCHEMA:
{"id":"bhaktivinoda-thakura-appearance","title":"Śrīla Bhaktivinoda Ṭhākura — The Seventh Goswami","category":"caitanya","description":"Appearance day celebration quiz on Śrīla Bhaktivinoda Ṭhākura","difficulty":"medium","timeLimit":720,"onTimeExpiry":"submit-partial","questions":[{"id":"q1","type":"single-choice","question":"...","options":["A","B","C","D"],"correctIndex":2,"difficulty":"easy","explanation":"...","reference":"Chapter 1"}]}
```
