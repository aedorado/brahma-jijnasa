# Brahma Jijñāsā — Master Quiz Creation & Quality Guidelines

This document establishes the official standards, anti-failure prompting rules, schema contracts, and multi-lingual guidelines for generating high-quality quizzes for the **Brahma Jijñāsā** platform.

---

## 1. Pedagogical & Content Quality Rules (The 6 Commandments)

### 1. Subject Focus Over Meta-References
- ❌ **Incorrect**: *"In Chapter 1 of Black Lotus, what speech difficulty did young John face?"*
- ✅ **Correct**: *"During his childhood in Cleveland, what physical speech difficulty did young John Favors overcome through sincere prayer?"*
- **Rule**: The quiz is about the **spiritual personality and philosophy**, NOT about the book or chapter structure. Citations belong exclusively in `"reference"` and `"explanation"`.

### 2. Explicit Subject Naming (No Ambiguous Pronouns)
- ❌ **Incorrect**: *"Identify the FALSE statement: A) He believed administrative quotas were more important than devotees' feelings..."* *(Who is "he"?)*
- ✅ **Correct**: Always name the subject clearly in the stem and options: *"Regarding Śrīla Prabhupāda's policy on devotee care, identify the INCORRECT statement..."*

### 3. Plausible Distractor Symmetry
- ❌ **Incorrect**: The correct answer is three sentences long and full of rich detail, while the three distractors are one-word or absurd caricatures (e.g. *Allen Ginsberg* managing temple expansions across India).
- ✅ **Correct**: All 4 options must be plausible, authentic peers sharing similar length, tone, and grammatical structure. Distractors should represent real philosophical nuances, alternative historical figures, or genuine misconceptions.

### 4. Zero Cross-Question Leakage (Anti-Spoiler Rule)
- ❌ **Incorrect**: Question 4 asks *"Who founded Gita Nagari farm?"*, and Question 7's match-pairs explicitly says *"Gita Nagari (Pennsylvania) — Model farm founded by Prabhupāda in 1976"*.
- ✅ **Correct**: Every question must be 100% self-contained. No question, clue, or explanation may spoil, hint at, or reveal the answer to any other question in the quiz.

### 5. Truthful Binding & Shuffled Answers
- ❌ **Incorrect**: Placing the correct answer at option A (`correctIndex: 0`) for almost all questions, or changing `correctIndex` without moving the correct text.
- ✅ **Correct**: 
  - Write all 4 options first.
  - Determine which option is factually correct, and set `correctIndex` to that exact slot.
  - Distribute `correctIndex` evenly across `0, 1, 2, 3` (roughly 5 per index in a 20Q quiz).
  - For `multiple-select`, vary combinations (`[0, 2]`, `[1, 3]`, `[0, 2, 3]`, `[1, 2, 3]`, `[0, 1, 3]`).

### 6. Strict JSON String Escaping
- ❌ **Incorrect**: Using raw unescaped double quotes inside strings: `"question": "Prabhupāda wrote: "Our men should not be treated like karmis...""` (causes JSON parse failure).
- ✅ **Correct**: Use single quotes inside strings (`'...'`) or properly escape double quotes with a backslash (`\"...\"`).

---

## 2. Component Schema Contracts

Brahma Jijñāsā features 16 specialized question components. Each component strictly requires specific JSON keys to render properly in the UI engine.

| Question Type | Mandatory Schema Keys | Common LLM Errors to Avoid |
| :--- | :--- | :--- |
| **`single-choice`**, **`cause-effect`**, **`odd-one-out`** | `options: string[]` (4 items), `correctIndex: number` (0–3) | Do not put the answer directly in the question stem. |
| **`multiple-select`** | `options: string[]` (4 items), `correctIndices: number[]` (2–3 indices) | Never use `correctIndex` (singular) for multiple-select. |
| **`true-false`** | `options: ["True", "False"]`, `correct: boolean`, `correctIndex: number` (0 for True, 1 for False) | Must include `correct: boolean`. |
| **`who-am-i`** | `clues: string[]` (exactly 3 progressive clues: 3pts → 2pts → 1pt), `options: string[]`, `correctIndex: number` | ❌ NEVER put bullet points inside `"question"`. Must use `"clues": [...]`. |
| **`who-said-this`** | `quote: string`, `context: string`, `options: string[]`, `correctIndex: number` | ❌ NEVER merge quote into `"question"`. Put quote inside `"quote": "..."`. |
| **`sequence`** | `items: string[]` (4 scrambled items), `correctOrder: number[]` (scrambled permutation of `[0, 1, 2, 3]`) | `correctOrder` must be a scrambled array (e.g. `[2, 0, 1, 3]`), never `[0, 1, 2, 3]`. |
| **`match-pairs`** | `left: string[]` (4 items), `right: string[]` (4 items), `correctPairs: [number, number][]` | ❌ NEVER use `leftColumn` or `rightColumn`. Use `left` and `right`. Format: `[[0, 2], [1, 3], [2, 1], [3, 0]]`. |
| **`assertion-reason`** | `assertion: string`, `reason: string`, `options: string[]` (standard 4 relationship options), `correctIndex: number` | ❌ NEVER put Assertion and Reason inside `"question"`. Split into `"assertion"` and `"reason"`. |
| **`spot-the-error`** | `passage: string` (passage with 1 error), `options: string[]` (4 parts), `correctIndex: number` | Must have `"passage": "..."`. |
| **`missing-link`** | `chain: string[]` (4 items with one `?`), `options: string[]` (4 choices), `correctIndex: number` | ❌ NEVER put chain in `"question"`. Must use `"chain": ["Step 1", "Step 2", "?", "Step 4"]`. |
| **`two-truths-one-false`** | `options: string[]` (the 3 statements themselves), `correctIndex: number` (index of FALSE statement 0–2) | Options must be the 3 statements themselves, allowing students to directly tap the false statement. |
| **`case-study`**, **`what-would-you-do`** | `scenario: string`, `options: string[]`, `correctIndex: number` | Scenario text must be inside `"scenario": "..."`. |
| **`evidence-based`** | `options: string[]`, `correctIndex: number` | Passage/quote can be in `"question"` or dedicated string. |

---

## 3. Multi-Lingual Quiz Guidelines (`.hi.json` & `.pt.json`)

To provide a seamless trilingual experience (English, Hindi, Portuguese):
1. **Filename Convention**:
   - English: `quizzes/<category>/<quiz-id>.json`
   - Hindi: `quizzes/<category>/<quiz-id>.hi.json`
   - Portuguese: `quizzes/<category>/<quiz-id>.pt.json`
2. **Structural Invariance**:
   - The `id`, question count, question `id`, `type`, and answer indices (`correctIndex`, `correctIndices`, `correctOrder`, `correctPairs`) must remain **100% identical** across all three files.
3. **Devotional Vocabulary Standards**:
   - **Hindi (`hi`)**: Use natural, reverent Vaiṣṇava terminology (उदा. श्रील प्रभुपाद, हरिनाम संकीर्तन, प्रसादम, शरणागति, भगवद्धाम, साधु-संग).
   - **Portuguese (`pt`)**: Use standard Lusophone Vaiṣṇava terminology (Śrīla Prabhupāda, saṅkīrtana, prasādam, Deidades, serviço devocional).

---

## 4. Quality Assurance CLI Workflow

After generating or editing any quiz JSON, run the built-in validator:

```bash
# Validate English Master
node scripts/validate-quiz.mjs quizzes/64-principles/64-day-d2.json

# Validate Translations
node scripts/validate-quiz.mjs quizzes/64-principles/64-day-d2.hi.json
node scripts/validate-quiz.mjs quizzes/64-principles/64-day-d2.pt.json
```

The validator automatically checks:
- JSON syntax and escaping
- Top-level metadata (`id`, `title`, `category`, `timeLimit`, `onTimeExpiry`)
- Required schema fields for all 16 question types
- Array bounds, valid indices, and distractor count
- Multi-select and sequence permutations
