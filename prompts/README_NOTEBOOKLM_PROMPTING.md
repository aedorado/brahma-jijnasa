# NotebookLM Quiz Prompting Guide & Anti-Failure Rules

This guide documents how to prevent common LLM failures when generating 20-question quizzes for **Brahma Jijñāsā** using **Google NotebookLM** (or Claude / Gemini / ChatGPT).

---

## 4 Common LLM Catastrophes and How We Prevent Them

### 1. Lazy Answer Clustering (`correctIndex: 0` or `correctIndices: [0, 1, 2]`)
- **The Problem:** LLMs are trained to place the correct answer as the first option when drafting questions. When lazy, single-choice questions all end up with `correctIndex: 0`, and multiple-select questions all end up with `[0, 1, 2]`.
- **The Solution:** The prompt explicitly mandates:
  - For single-choice: Distribute `correctIndex` evenly across `0, 1, 2, 3` (roughly 5 per index).
  - For multiple-select: Mandate varied combinations: `[1, 3]`, `[0, 2, 3]`, `[1, 2, 3]`, `[0, 1, 3]`, `[0, 3]`.

### 2. Answer-Key Decoupling (Wrong Option Marked Correct)
- **The Problem:** When told "don't make all answers 0", the LLM changes `correctIndex: 1`, but leaves the actual correct statement at position `0`! The quiz ends up with completely false answers.
- **The Solution:** **Truthful Binding Rule**:
  > *"Write the 4 options first. Identify which option is factually correct, and set `correctIndex` to that exact position. The explanation MUST explicitly cite and verify why that specific option is true."*

### 3. Cross-Question Information Leakage
- **The Problem:** Question 4 asks *"Who founded Gita Nagari farm?"* with options, and Question 5 begins: *"In 1974, when Srila Prabhupada established Gita Nagari in Pennsylvania..."*, instantly spoiling Question 4!
- **The Solution:** **Zero Leaks Rule**:
  > *"Each question must be 100% self-contained. No question or explanation may mention facts, names, years, or clues that spoil or reveal the answer to any other question."*

### 4. Invalid Match-Pairs Format
- **The Problem:** LLM outputs objects like `{"left": 0, "right": 2}` or invalid tuples.
- **The Solution:** Strictly enforce canonical 2-number index tuples:
  ```json
  "correctPairs": [[0, 2], [1, 3], [2, 1], [3, 0]]
  ```

---

## Post-Generation Checklist

After copying the JSON from NotebookLM:
1. Paste it into your target file: `quizzes/64-principles/64-day-d2.json`
2. Run the validator:
   ```bash
   node scripts/validate-quiz.mjs quizzes/64-principles/64-day-d2.json
   ```
3. Check the validator output:
   - Does it show all 15 question types?
   - Are options evenly balanced?
   - Does it pass without errors?
