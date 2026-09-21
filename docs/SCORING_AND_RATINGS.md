# Brahma Jijñāsā — Scoring, Ratings & Devotee Progression Specification

This document provides a comprehensive reference for the scoring rules, point normalization, negative marking logic, and Codeforces-style 75-quiz gated Devotee Level progression engine.

---

## 1. Architectural Philosophy

1. **Academic & Spiritual Authenticity**: In scriptural study, awarding astronomical point counts (like 3,000 or 20,000 points per quiz) distorts learning. Questions carry grounded, academic points (1, 2, 3, or 4 pts), making a full 20-question quiz realistically total **~50 points**.
2. **Deterministic Engine Authority**: Authors and LLMs (such as NotebookLM) often hallucinate arbitrary points (e.g. 2 pts vs 1,000 pts). The platform automatically standardizes and normalizes points based on **(Question Type × Difficulty)**.
3. **True Spiritual Progression (*Bhakti-rasāmṛta-sindhu* 1.4.15–16)**: Achieving *Prema* (pure love of Godhead) is the summit of spiritual perfection. No student can be crowned a **Premī** on Day 1 from a single quiz. Progression is hard-gated by both sustained rating and the number of unique quizzes completed (scaling up to 75 quizzes).

---

## 2. Question Point System & Normalization

Every question type is classified into one of three cognitive tiers and scaled by difficulty:

| Cognitive Tier | Question Types | Easy | Medium | Hard |
| :--- | :--- | :---: | :---: | :---: |
| **Tier 1: Direct Recognition** *(Single pick / boolean)* | `single-choice`, `true-false`, `who-said-this`, `odd-one-out`, `missing-link` | **1.0 pt** | **2.0 pts** | **3.0 pts** |
| **Tier 2: Analytical Reasoning** *(Multi-statement analysis & scenario)* | `assertion-reason`, `cause-effect`, `spot-the-error`, `two-truths-one-false`, `evidence-based`, `case-study`, `what-would-you-do` | **1.5 pts** | **2.5 pts** | **3.5 pts** |
| **Tier 3: Multi-Element Interactive** *(Matching, sequencing, clues, multi-select)* | `match-pairs` *(e.g. 4 pairs)*<br>`sequence` *(e.g. 4 events)*<br>`multiple-select`<br>`who-am-i` *(3 clues)* | **2.0 pts** *(0.5 / item)* | **3.0 pts** *(0.75 / item)* | **4.0 pts** *(1.0 / item)* |

### Quiz Point Totals:
- **Standard 20-Question Quiz** (5 Easy + 10 Medium + 5 Hard): **~50 points total**
- **Quick 5-Question Quiz**: **~10 points total**

### Load-Time Normalization:
In `src/lib/quizzes.ts`, `normalizeQuiz()` ensures that regardless of what raw number an external JSON contains, points are standardized within safe ranges.

---

## 3. Negative Marking & Partial Scoring Rules

| Question Type | Partial Scoring | Negative Marking | Behavior & Rationale |
| :--- | :---: | :---: | :--- |
| **`multiple-select`** | ✅ Yes | **⚠️ Internal Only** | Correct selections add points ($+\text{ptPerOption}$). Incorrect selections subtract ($-0.5 \times \text{ptPerOption}$). **Floored at 0** so the question score can never be negative. *Prevents students from ticking all 4 checkboxes to game full points.* |
| **`match-pairs`** | ✅ Yes | ❌ None | Earns points proportional to correct pairs matched: $(\text{matched} / \text{totalPairs}) \times \text{max}$. Unmatched pairs award 0. |
| **`sequence`** | ✅ Yes | ❌ None | Earns points proportional to correct relative pairs: $(\text{correctPairs} / \text{maxPairs}) \times \text{max}$. |
| **`who-am-i`** | ✅ Yes | ❌ None | Scaled by clues revealed: 1st clue = 100% max, 2nd clue = 66.7% max, 3rd clue = 33.3% max. Wrong guess = 0. |
| **All Other 12 Types** | ❌ None | ❌ None | Standard binary scoring: Correct awards `max` points; incorrect awards 0 points. |

*Note: Devotional study encourages inquiry without fear of punitive negative marking across quizzes.*

---

## 4. The 9 Devotee Levels & 75-Quiz Gating Table

Levels are anchored strictly in Śrīla Rūpa Gosvāmī’s *Bhakti-rasāmṛta-sindhu* (1.4.15–16):
> *“ādau śraddhā tataḥ sādhu-saṅgo 'tha bhajana-kriyā · tato 'nartha-nivṛttiḥ syāt tato niṣṭhā rucis tataḥ · athāsaktis tato bhāvas tataḥ premābhyudañcati...”*

A user's level is determined by satisfying **all three criteria**: Rating, Minimum Unique Quizzes completed, and Minimum Overall Accuracy.

| Level | Sanskrit Stage | Devanāgarī | Devotee Title | English Meaning | Rating Threshold | 🔒 Min Quizzes Gate | 🎯 Min Accuracy Gate |
| :---: | :--- | :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | Śraddhā | श्रद्धा | **Śraddhāvān** | *Faithful Inquirer* | **0 – 499** | **0** | **0%** |
| **2** | Sādhu-saṅga | साधु-सङ्ग | **Saṅgī** | *Sincere Companion* | **500 – 1,299** | **2** | **20%** |
| **3** | Bhajana-kriyā | भजन-क्रिया | **Sādhaka** | *Dedicated Practitioner* | **1,300 – 2,799** | **5** | **40%** |
| **4** | Anartha-nivṛtti | अनर्थ-निवृत्ति | **Vivekī** | *Discerning Seeker* | **2,800 – 5,499** | **10** | **50%** |
| **5** | Niṣṭhā | निष्ठा | **Niṣṭhāvān** | *The Steady & Fixed* | **5,500 – 10,999** | **20** | **60%** |
| **6** | Ruci | रुचि | **Rucimān** | *Relisher of Truth* | **11,000 – 14,999** | **40** | **70%** |
| **7** | Āsakti | आसक्ति | **Āsakta** | *Deeply Absorbed* | **15,000 – 18,999** | **50** | **80%** |
| **8** | Bhāva | भाव | **Bhāvuka** | *Illumined Ecstatic* | **19,000 – 24,999** | **60** | **85%** |
| **9** | Prema | प्रेम | **Premī** | *Transcendental Master* | **25,000+** | **75** | **90%** |

---

## 5. Mathematical Rating Calculation Formula

In `src/lib/levels.ts`, `calculateUserRating(attempts)` executes the following steps:

### Step 1: Deduplication by Unique Quiz
To prevent farming the exact same quiz repeatedly, only the single best accuracy achieved per `quiz_id` is retained.

### Step 2: Normalized Budget per Quiz
Every unique quiz is evaluated on a standardized budget ($\text{Budget} = 300\text{ pts}$), so no external quiz with inflated points can break the platform:
$$\text{Accuracy}_q = \frac{\text{Score Earned}_q}{\max(1, \text{Max Score}_q)} \quad \in [0.0, 1.0]$$

$$\text{Normalized Score}_q = \text{Accuracy}_q \times 300$$

### Step 3: Accuracy Multiplier
Accurate answers earn an additional bonus; erratic guessing receives a slight discount:
$$\text{Multiplier}_q = 0.8 + 0.4 \times \text{Accuracy}_q$$
- $100\%$ accuracy $\implies 1.20\times$ points ($360\text{ pts}$)
- $80\%$ accuracy $\implies 1.12\times$ points ($269\text{ pts}$)
- $50\%$ accuracy $\implies 1.00\times$ points ($150\text{ pts}$)
- $25\%$ accuracy $\implies 0.90\times$ points ($68\text{ pts}$)

### Step 4: Breadth Bonus & Total Rating
Exploring multiple scriptural topics awards a $+10$ points breadth bonus per unique quiz ($N = \text{number of unique quizzes}$):
$$\mathbf{\text{Rating}} = \text{Math.round}\left( \sum_{q} (\text{Normalized Score}_q \times \text{Multiplier}_q) + (N \times 10) \right)$$

---

## 6. Worked Progression Examples

- **Devotee with 1 quiz (100% accuracy on a 50-pt or 300-pt quiz)**:
  - $\text{Rating} = 300 \times 1.2 + 10 = \mathbf{370\text{ pts}}$
  - Level: **Level 1 (Śraddhāvān)**
  - Gate status: *"Rating requirement met for Level 1 • Complete 1 more unique quiz to unlock Level 2 (Saṅgī)"*
- **Student scoring < 100 on first quiz (e.g. 25% accuracy)**:
  - $\text{Rating} = (0.25 \times 300) \times 0.90 + 10 = \mathbf{78\text{ pts}}$
  - Level: **Level 1 (Śraddhāvān)**
- **Dedicated practitioner with 20 unique quizzes (80% accuracy)**:
  - $\text{Rating} \approx \mathbf{5,580\text{ pts}}$
  - Level: **Level 5 (Niṣṭhāvān)** unlocked ($\ge 20$ quizzes, $\ge 60\%$ acc, $\ge 5,500$ pts)
- **Advanced scholar reaching Level 9 (Premī)**:
  - Requires completing $\ge 75$ unique quizzes with $\ge 90\%$ accuracy and $\ge 25,000$ points.

---

## 7. Key Codebase References

- **Single Question Scoring**: [src/lib/scoring.ts](file:///Users/anurag/pworkspace/brahma-jijnasa/src/lib/scoring.ts)
- **Rating Engine & Devotee Levels**: [src/lib/levels.ts](file:///Users/anurag/pworkspace/brahma-jijnasa/src/lib/levels.ts)
- **Quiz Parsing & Point Normalization**: [src/lib/quizzes.ts](file:///Users/anurag/pworkspace/brahma-jijnasa/src/lib/quizzes.ts)
- **Score Card Display**: [src/components/ScoreCard.tsx](file:///Users/anurag/pworkspace/brahma-jijnasa/src/components/ScoreCard.tsx)
- **Global Leaderboard Page**: [src/app/leaderboard/page.tsx](file:///Users/anurag/pworkspace/brahma-jijnasa/src/app/leaderboard/page.tsx)
- **Student Profile & Gate Progress**: [src/app/profile/page.tsx](file:///Users/anurag/pworkspace/brahma-jijnasa/src/app/profile/page.tsx)
- **AI Prompt Specifications**: [prompts/master-quiz-prompt.md](file:///Users/anurag/pworkspace/brahma-jijnasa/prompts/master-quiz-prompt.md) and [prompts/notebooklm-quiz-prompt.md](file:///Users/anurag/pworkspace/brahma-jijnasa/prompts/notebooklm-quiz-prompt.md)
