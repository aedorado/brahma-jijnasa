# BRAHMA JIJÑĀSĀ — Scoring System Architecture & Specification

## 1. Overview & Core Philosophy

Brahma Jijñāsā's scoring engine is designed for **theological accuracy, analytical discernment, and engaging pedagogical feedback**. It supports:
- **Exact Half-Point Precision** (e.g. `21.5 / 21.5 Points`) to prevent floating-point drift.
- **Granular Partial Credit** for complex question types (Match Pairs, Sequence, Multiple Select).
- **Incentivized Reasoning** (rewarding fewer clues on "Who Am I").
- **Deterrence of Worldly Guesswork** (mild deduction for incorrect selections in Multiple Select).
- **Tie-Breaking Mechanisms** (score first, then response time).

---

## 2. Standard Question Tier & Point Weights

Every question in a quiz is assigned a maximum point value (`max` / `q.points`). 
If a quiz JSON defines an explicit `points` field (between 1 and 5), that value is preserved. If `points` is omitted, `getStandardQuestionPoints(type, difficulty)` dynamically assigns points based on **cognitive depth** and **difficulty tier**:

| Tier | Question Types | Easy | Medium | Hard |
| :--- | :--- | :---: | :---: | :---: |
| **Tier 1: Direct Recognition** *(1 pick / boolean)* | `single-choice`, `true-false`, `who-said-this`, `odd-one-out`, `missing-link` | **1.0 pt** | **2.0 pts** | **3.0 pts** |
| **Tier 2: Analytical Reasoning** *(Multi-statement / scenario)* | `assertion-reason`, `cause-effect`, `spot-the-error`, `two-truths-one-false`, `evidence-based`, `case-study`, `what-would-you-do` | **1.5 pts** | **2.5 pts** | **3.5 pts** |
| **Tier 3: Multi-Element & Interactive** *(Complex matching & sequencing)* | `multiple-select`, `who-am-i`, `match-pairs`, `sequence` | **2.0 pts** | **3.0 pts** | **4.0 pts** |

---

## 3. Detailed Question-Type Scoring Mechanics

Implemented in `src/lib/scoring.ts`:

### 3.1. Single Choice & Binary / Scenario Questions
- **Types**: `single-choice`, `cause-effect`, `odd-one-out`, `spot-the-error`, `two-truths-one-false`, `evidence-based`, `who-said-this`, `case-study`, `what-would-you-do`, `missing-link`, `assertion-reason`.
- **Logic**:
  - `selected === question.correctIndex ? max : 0`
- **True/False**:
  - `selected === question.correct ? max : 0`

### 3.2. Multiple Select (Partial Credit & Guess Penalty)
- **Point per option**: `ptPerOption = max / numCorrectOptions`
- **Calculation**:
  - For each **correct** selection: `+ ptPerOption`
  - For each **incorrect** selection (guess penalty): `- (ptPerOption * 0.5)`
- **Boundaries**:
  - Minimum score is clamped at `0` (never negative).
  - Rounded to nearest half-point: `Math.max(0, Math.round(pts * 2) / 2)`.
  - All correct selections with no wrong selections earns full `max`.

### 3.3. Who Am I (Clue Decay Scoring)
- Personality mystery questions with progressive clue reveals.
- If selected option is wrong: **0 pts**.
- If correct, points scale according to how many clues the devotee needed:
  - **1 Clue revealed**: `100% of max` (Multiplier: `1.0`)
  - **2 Clues revealed**: `66.7% of max` (Multiplier: `2/3`)
  - **3+ Clues revealed**: `33.3% of max` (Multiplier: `1/3`)
- Rounded to nearest half-point: `Math.round(max * ratio * 2) / 2`.

### 3.4. Sequence (Pairwise Relative Order)
- Devotees arrange historical pastimes, philosophical stages, or book chapters.
- Partial credit evaluates all consecutive relative pairs `(A before B)`:
  $$\text{Score} = \text{roundToHalf}\left(\frac{\text{Correct Pairs}}{\text{Total Pairs}} \times \text{max}\right)$$
- If completely in order, awards full `max`.

### 3.5. Match Pairs (Linear Partial Credit)
- Devotees match left-hand terms (e.g. Sanskrit verse/principle) with right-hand explanations.
- Partial credit awards points proportionally to the number of correctly paired items:
  $$\text{Score} = \text{roundToHalf}\left(\frac{\text{Matched Pairs}}{\text{Total Pairs}} \times \text{max}\right)$$
- If all pairs match, awards full `max`.

---

## 4. Total Quiz Aggregation & Floating-Point Protection

$$\text{totalEarned} = \frac{\text{round}\left(\sum \text{earned} \times 10\right)}{10}$$
$$\text{totalMax} = \frac{\text{round}\left(\sum \text{max} \times 10\right)}{10}$$
$$\text{percentage} = \begin{cases} \text{round}\left(\frac{\text{totalEarned}}{\text{totalMax}} \times 100\right), & \text{if } \text{totalMax} > 0 \\ 0, & \text{otherwise} \end{cases}$$

This guarantees exact representations like `21.5 / 21.5` without `21.500000000000004` floating-point issues or accidental rounding to whole integers like `22`.

---

## 5. Performance Honors & Vedic Titles

Based on final percentage achieved:

| Percentage Range | Vedic Honorific | Icon | Description |
| :---: | :--- | :---: | :--- |
| **90% – 100%** | **Brahmajñānī** *(Realized Seeker)* | 🌟 | Flawless shāstric comprehension and philosophical depth. |
| **75% – 89%** | **Vidvān** *(Learned Scholar)* | 🏆 | Strong scriptural grasp and clear discernment. |
| **60% – 74%** | **Jijñāsu** *(Inquisitive Inquirer)* | 🎯 | Good understanding; steadily progressing on the path. |
| **40% – 59%** | **Śiṣya** *(Devoted Student)* | 📖 | Foundational familiarity; benefit from reviewing explanations. |
| **< 40%** | **Abhyāsa** *(Practicing Seeker)* | 🙏 | Encouraged to revisit verses and re-attempt. |

---

## 6. Leaderboard & Competition Tie-Breaking

### 6.1. Live Classroom Sessions
When devotees compete in a synchronized classroom session (with a 4-digit PIN):
1. **Primary Sort**: `score` (Highest score first).
2. **Tie-Breaker**: `time_taken` (Lowest time taken in seconds).
3. If both score and time are identical, both devotees share the position.

### 6.2. 30-Day Campaign & Series Standings
Aggregated in Supabase through `series_leaderboard_view`:
1. **Total Points**: Sum of best attempt scores across all campaign rounds.
2. **Attendance / Consistency**: `days_attended` (Devotees who attended all 30 days rank higher on equal points).
3. **Average Accuracy**: Overall percentage accuracy across attempts.
4. **Speed**: Cumulative seconds taken across rounds.
