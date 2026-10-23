# Brahma Jijñāsā — Universal High-Quality NotebookLM Quiz Prompt

> **Character Count:** ~3,150 characters (Strictly under NotebookLM's 3,500 characters limit).
> **Target:** Copy-paste directly into Google NotebookLM with uploaded sources.

---

```text
Based STRICTLY on the uploaded source material:
Generate a 20-question interactive quiz as a single valid JSON object. Output pure JSON ONLY (no markdown fences, no text before or after). Starts with { and ends with }.

CORE PEDAGOGICAL & QUALITY RULES:
1. FOCUS ON SPIRITUAL TOPIC (NO META-REFERENCES): Focus on the persons, pastimes, and philosophy. Never write 'In Chapter X of [Book]...' in the question stem. Citations belong in 'reference' and 'explanation'.
2. EXPLICIT SUBJECT NAMING: Never use ambiguous pronouns ('he/they'). Name the historical or scriptural subject clearly in the question stem.
3. BALANCED DISTRACTORS: All 4 options must be plausible, authentic peers of similar length and tone. Never make the correct answer obviously longer or distractors silly.
4. NO CROSS-QUESTION LEAKS: Questions must be 100% self-contained. No question or explanation may spoil or reveal the answer to any other question.
5. SHUFFLE INDICES: Evenly distribute correctIndex across 0, 1, 2, 3 (do NOT default to 0). For multiple-select, vary correctIndices across [0,2], [1,3], [0,2,3], [1,2,3].
6. STRICT JSON ESCAPING: NEVER use unescaped double quotes inside strings. Use single quotes ('...') or escape with \".

20 QUESTIONS (Use these exact keys per question):
Q1: {"type":"single-choice","question":"...","options":["A","B","C","D"],"correctIndex":2}
Q2: {"type":"multiple-select","question":"... (Select all that apply)","options":["A","B","C","D"],"correctIndices":[0,2,3]}
Q3: {"type":"true-false","question":"True or False: ...","options":["True","False"],"correct":true,"correctIndex":0}
Q4: {"type":"who-am-i","question":"Who am I based on these clues?","clues":["Subtle clue (+3pts)","Clearer clue (+2pts)","Direct clue (+1pt)"],"options":["A","B","C","D"],"correctIndex":1}
Q5: {"type":"who-said-this","question":"Identify the speaker:","quote":"Exact quote...","context":"Context/recipient...","options":["A","B","C","D"],"correctIndex":3}
Q6: {"type":"sequence","question":"Arrange in chronological order:","items":["Event 1","Event 2","Event 3","Event 4"],"correctOrder":[2,0,1,3]}
Q7: {"type":"match-pairs","question":"Match items:","left":["L1","L2","L3","L4"],"right":["R1","R2","R3","R4"],"correctPairs":[[0,2],[1,3],[2,1],[3,0]]}
Q8: {"type":"assertion-reason","question":"Analyze:","assertion":"...","reason":"...","options":["Both A and R true, and R is correct explanation","Both true, but R is NOT correct explanation","A is true, R is false","A is false, R is true"],"correctIndex":0}
Q9: {"type":"spot-the-error","question":"Identify the incorrect statement:","passage":"1. ...\n2. ...\n3. ...\n4. ...","options":["Part 1","Part 2","Part 3","Part 4"],"correctIndex":2}
Q10: {"type":"missing-link","question":"What completes the chain?","chain":["Step 1","Step 2","?","Step 4"],"options":["A","B","C","D"],"correctIndex":1}
Q11: {"type":"odd-one-out","question":"Which is the odd one out?","options":["A","B","C","D"],"correctIndex":3}
Q12: {"type":"cause-effect","question":"What is the spiritual consequence?","options":["A","B","C","D"],"correctIndex":0}
Q13: {"type":"two-truths-one-false","question":"Select the statement that is FALSE:","options":["True statement 1","False statement 2","True statement 3"],"correctIndex":1}
Q14: {"type":"case-study","question":"How was this resolved?","scenario":"Description of case...","options":["A","B","C","D"],"correctIndex":2}
Q15: {"type":"what-would-you-do","question":"What is the proper course of action?","scenario":"Description of situation...","options":["A","B","C","D"],"correctIndex":1}
Q16, Q18, Q20: {"type":"single-choice","question":"...","options":["A","B","C","D"],"correctIndex":1}
Q17, Q19: {"type":"multiple-select","question":"...","options":["A","B","C","D"],"correctIndices":[1,3]}

WRAPPER SCHEMA:
{"id":"quiz-slug","title":"Descriptive Quiz Title","category":"64-principles","description":"Summary of quiz","difficulty":"easy","timeLimit":720,"onTimeExpiry":"submit-partial","questions":[/* Every question must include "id", "type", "difficulty":"easy", "explanation":"...", "reference":"..." */]}
```
