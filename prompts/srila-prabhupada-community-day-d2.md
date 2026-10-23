# Brahma Jijñāsā — Day -1 (D-2): Śrīla Prabhupāda on Community, Devotee Care & Cooperation (20 Questions)

> **NotebookLM Optimized Prompt**
> **Character Count:** ~3,200 characters (Strictly within NotebookLM's 3,500 character limit).
> **Format Tuning:** 20 Questions, 16 distinct question types, all schemas specified, difficulty set to **easy/accessible**.

---

## The Prompt to Copy into NotebookLM

```text
Based STRICTLY on uploaded sources about Srila Prabhupada:
Generate a 20-question interactive quiz on 'Srila Prabhupada on Community, Devotee Care & Cooperation'.
Output pure valid JSON ONLY (no markdown fences, no text before or after). Starts with { and ends with }.

THEME:
- 'Your love for me will be shown by how much you cooperate with each other.'
- ISKCON as a spiritual family, GBC governance, resolving conflicts with compassion.
- Devotee care, protection of disciples, simplicity, cow protection, farm communities (Gita Nagari, New Vrindaban).
- Avoiding Vaishnava-aparadha, cultivating humility, serving together.

CRITICAL QUALITY & JSON RULES:
1. STRICT JSON ESCAPING: NEVER use unescaped double quotes inside strings. Use single quotes ('...') or escape with \".
2. EXPLICIT SUBJECT NAMING: Never use ambiguous pronouns ('he/they'). Name the historical subject clearly in question stems.
3. BALANCED DISTRACTORS: All 4 options must be plausible, authentic peers of similar length. Never make the correct answer obviously longer or distractors silly.
4. ZERO LEAKS: No question, clue, or explanation may spoil or reveal the answer to any other question.
5. SHUFFLE INDICES: Evenly distribute correctIndex across 0, 1, 2, 3 (do NOT default to 0). For multiple-select, vary correctIndices across [0,2], [1,3], [0,2,3], [1,2,3].
6. TRUTHFUL BINDING: Write 4 options first, determine which is factually correct, and set correctIndex to that exact slot.

20 QUESTIONS (Use these exact keys per question):
Q1: {"type":"single-choice","question":"In his final months in Vrindavan (1977)... what was his defining instruction?","options":["A","B","C","D"],"correctIndex":2}
Q2: {"type":"multiple-select","question":"Which qualities are essential for sustaining harmony? (Select all that apply)","options":["A","B","C","D"],"correctIndices":[0,2,3]}
Q3: {"type":"true-false","question":"True or False: Prabhupada taught that a devotee should cultivate the mentality of a honeybee...","options":["True","False"],"correct":true,"correctIndex":0}
Q4: {"type":"who-am-i","question":"Who am I based on these clues?","clues":["Subtle clue (+3pts)","Clearer clue (+2pts)","Direct clue (+1pt)"],"options":["A","B","C","D"],"correctIndex":1}
Q5: {"type":"who-said-this","question":"Identify the speaker of this leadership instruction:","quote":"...","context":"Context...","options":["A","B","C","D"],"correctIndex":3}
Q6: {"type":"sequence","question":"Arrange these foundational milestones in chronological order:","items":["Event 1","Event 2","Event 3","Event 4"],"correctOrder":[2,0,1,3]}
Q7: {"type":"match-pairs","question":"Match each historic community with its spiritual purpose:","left":["L1","L2","L3","L4"],"right":["R1","R2","R3","R4"],"correctPairs":[[0,2],[1,3],[2,1],[3,0]]}
Q8: {"type":"assertion-reason","question":"Analyze the relationship:","assertion":"...","reason":"...","options":["Both A and R true, and R is correct explanation","Both true, but R is NOT correct explanation","A is true, R is false","A is false, R is true"],"correctIndex":0}
Q9: {"type":"spot-the-error","question":"Identify the incorrect policy statement:","passage":"1. ...\n2. ...\n3. ...\n4. ...","options":["Part 1","Part 2","Part 3","Part 4"],"correctIndex":2}
Q10: {"type":"missing-link","question":"Identify the missing link in community expansion:","chain":["Step 1","Step 2","?","Step 4"],"options":["A","B","C","D"],"correctIndex":1}
Q11: {"type":"odd-one-out","question":"Which trait is the odd one out?","options":["A","B","C","D"],"correctIndex":3}
Q12: {"type":"cause-effect","question":"What is the direct spiritual consequence when devotees abandon fault-finding?","options":["A","B","C","D"],"correctIndex":0}
Q13: {"type":"two-truths-one-false","question":"Select the statement that is FALSE:","options":["True stmt 1","False stmt 2","True stmt 3"],"correctIndex":1}
Q14: {"type":"case-study","question":"How did Prabhupada resolve this dispute?","scenario":"Description of case...","options":["A","B","C","D"],"correctIndex":2}
Q15: {"type":"what-would-you-do","question":"What is the proper course of action?","scenario":"Dilemma description...","options":["A","B","C","D"],"correctIndex":1}
Q16: {"type":"evidence-based","question":"What fundamental principle does this letter establish?","options":["A","B","C","D"],"correctIndex":3}
Q17: {"type":"who-am-i","question":"Who am I based on these clues?","clues":["Subtle clue (+3pts)","Clearer clue (+2pts)","Direct clue (+1pt)"],"options":["A","B","C","D"],"correctIndex":0}
Q18: {"type":"who-said-this","question":"Identify the speaker of this plea for unity:","quote":"If we fight among ourselves, how will we preach to the world?","context":"Spoken during meetings in Calcutta and Bombay","options":["A","B","C","D"],"correctIndex":2}
Q19: {"type":"multiple-select","question":"Which instructions ensured the protection of devotees? (Select all that apply)","options":["A","B","C","D"],"correctIndices":[1,3]}
Q20: {"type":"single-choice","question":"In his ultimate vision, how did Prabhupada define the true purpose of ISKCON?","options":["A","B","C","D"],"correctIndex":1}

WRAPPER SCHEMA:
{"id":"64-day-d2","title":"Preparatory Quiz 2: Śrīla Prabhupāda on Community & Devotee Care","category":"64-principles","description":"20 questions on Śrīla Prabhupāda's vision for community, cooperation, and devotee care.","difficulty":"easy","timeLimit":720,"onTimeExpiry":"submit-partial","questions":[/* Every question must include id (1-20), type, difficulty:'easy', explanation, reference */]}
```
