# Bhādra Pūrṇimā — Śrīmad-Bhāgavatam Mahotsava NotebookLM Quiz Prompt

> **Theme:** Appearance of Śrīmad-Bhāgavatam & Gifting on Bhādra Pūrṇimā (SB 12.13.13)  
> **Question Count:** 25 Questions (12 Easy, 8 Medium, 5 Hard)  
> **Character Count:** **2,488 characters** (strictly under the 2,500 limit).

---

```markdown
Generate a 25-question quiz on Bhādra Pūrṇimā & Śrīmad-Bhāgavatam as pure JSON (no markdown or extra text).

THEME: Glories of Śrīmad-Bhāgavatam, Bhādra Pūrṇimā gift on golden throne (SB 12.13.13 hema-siṁha-samanvitam), Vyāsa, Śukadeva-Parīkṣit, amala-purāṇa, nityaṁ bhāgavata-sevayā, 12 cantos. Avoid obscure trivia/dates.

RULES:
1. DISTRACTORS: Plausible śāstric terms—never obvious giveaways.
2. NO CROSS-LEAKS: Isolated questions; none may hint at another answer.
3. MULTIPLE-SELECT: NEVER use [0,1,2]. Vary: Q2:[1,3], Q14:[0,2,3], Q22:[0,1,3].
4. ASSERTION-REASON: Standard choices: [0:Both true & explains, 1:Both true but no explanation, 2:A true R false, 3:A false R true]. Set Q13 index=1, Q21 index=2.
5. SHUFFLE: Distribute single-choice correctIndex evenly (0-3). Scramble sequence & match-pairs.
6. DIFFICULTY: Exactly 12 easy, 8 medium, 5 hard.
7. Include "explanation" & "reference" for each question.

25 QUESTIONS (id: "q1".."q25"):
[EASY - 12]
Q1,Q5,Q9: single-choice (options:4, correctIndex:0-3)
Q2: multiple-select (options:4, correctIndices:[1,3])
Q3: true-false (question, correct:bool)
Q4: who-said-this (quote, context, options:4, correctIndex:0-3)
Q6: match-pairs (left:4, right:4 scrambled, correctPairs)
Q7: cause-effect (question, options:4, correctIndex:0-3)
Q8: who-am-i (clues:3, options:4, correctIndex:0-3)
Q10: two-truths-one-false (options:3, correctIndex:0-2)
Q11: spot-the-error (passage, options:4, correctIndex:0-3)
Q12: sequence (items:4 scrambled, correctOrder)
[MEDIUM - 8]
Q13: assertion-reason (assertion, reason, correctIndex:1)
Q14: multiple-select (options:4, correctIndices:[0,2,3])
Q15: odd-one-out (options:4, correctIndex:0-3)
Q16: who-am-i (clues:3, options:4, correctIndex:0-3)
Q17: missing-link (chain:[A,B,"?",D], options:4, correctIndex:0-3)
Q18: case-study (scenario, question, options:4, correctIndex:0-3)
Q19: single-choice (options:4, correctIndex:0-3)
Q20: what-would-you-do (scenario, question, options:4, correctIndex:0-3)
[HARD - 5]
Q21: assertion-reason (assertion, reason, correctIndex:2)
Q22: multiple-select (options:4, correctIndices:[0,1,3])
Q23: sequence (items:4 scrambled, correctOrder)
Q24: match-pairs (left:4, right:4 scrambled, correctPairs)
Q25: single-choice (options:4, correctIndex:0-3)

ROOT: {"id":"bhadra-purnima","title":"Bhādra Pūrṇimā Quiz","category":"srimad-bhagavatam","description":"Śrīmad-Bhāgavatam quiz","difficulty":"medium","timeLimit":900,"onTimeExpiry":"submit-partial","questions":[...]}
```
