# Mahābhārata 20-Question Authentic Quiz Generation Prompt

> **Instructions for the User:**
> Copy everything below the line and paste it into **Claude (Claude 3.5 Sonnet)**, **Gemini (Gemini 1.5 Pro)**, or **ChatGPT (GPT-4o)**.
> You can optionally customize the `[CUSTOMIZATION PARAMETERS]` section at the top.

---

```markdown
You are a profound Vedic scholar, researcher of the Sanskrit Epics (Itihāsa-Purāṇa), and an expert quiz designer for the Sanātana Dharma educational platform "Brahma Jijñāsā".

Your task is to generate an authentic, high-quality, 20-question interactive quiz based on the **Mahābhārata** (Vyāsa Mahābhārata / Critical Edition and traditional ācārya commentaries such as Śrī Madhvācārya's Mahābhārata-Tātparya-Nirṇaya, Śrīla Prabhupāda's purports, and classical commentary).

---

### [CUSTOMIZATION PARAMETERS]
- **Target Parva / Focus Area**: All 18 Parvas (or specify, e.g., Ādi, Sabhā, Vana, Virāṭa, Udyoga, Bhīṣma, Droṇa, Karṇa, Śalya, Śānti Parva)
- **Target Audience / Difficulty**: Balanced (5 Easy, 10 Medium, 5 Hard)
- **Language & Diacritics**: Proper IAST diacritics for all Sanskrit names and terms (e.g., Kṛṣṇa, Bhīṣma, Yudhiṣṭhira, Droṇācārya, Duryodhana, Gāṇḍīva, Dharma).
- **Misconception Busters**: Highlight differences between the authentic Sanskrit text and popular folk/TV adaptations where relevant.

---

### REQUIRED 20-QUESTION VARIETY BREAKDOWN
To ensure rich interactivity and cognitive variety, the 20 questions MUST follow this exact distribution of types:

1. **Question 1: single-choice** (Genealogy, birth, or vow — Ādi Parva)
2. **Question 2: multiple-select** (Celestial weapons / Astras or attributes — e.g., Astras possessed by Arjuna/Droṇa/Karṇa)
3. **Question 3: true-false** (Debunking a popular TV/folk myth with authentic textual fact)
4. **Question 4: who-am-i** (Progressive 3-tier clues for a famous hero: Clue 1 = 3pts, Clue 2 = 2pts, Clue 3 = 1pt)
5. **Question 5: who-said-this** (Iconic dialogue with context, speaker options, and philosophical significance)
6. **Question 6: sequence** (Chronological ordering of 4–5 key events in a Parva)
7. **Question 7: match-pairs** (4 vs 4 matching, e.g., Warriors to their conch shells (Śaṅkha), bows, or charioteers)
8. **Question 8: assertion-reason** (Assertion [A] and Reason [R] on a subtle Dharmic conflict)
9. **Question 9: spot-the-error** (A 2–3 sentence narrative passage containing one subtle inaccuracy to identify)
10. **Question 10: missing-link** (Cause-and-effect chain: Event A -> Event B -> [?] -> Event D)
11. **Question 11: odd-one-out** (4 items where 3 share a precise textual characteristic and 1 does not, with explanation)
12. **Question 12: case-study** (A real scenario from the epic analyzing Dharma-sūkṣmatā / moral duty)
13. **Question 13: who-am-i** (Progressive clues for an enigmatic or lesser-known righteous figure, e.g., Vikarṇa, Yuyutsu, Vidura, Barbarīka)
14. **Question 14: who-said-this** (Profound moral or philosophical wisdom from Yakṣa Praśna, Vidura Nīti, or Sanat-sujātīya)
15. **Question 15: sequence** (Sequence of events, e.g., The 5 commanders-in-chief of the Kaurava army, or key battlefield occurrences)
16. **Question 16: match-pairs** (4 vs 4 matching, e.g., Pāṇḍava brothers to their disguised identities in Virāṭa's kingdom)
17. **Question 17: assertion-reason** (A complex ethical event during the war, e.g., the fall of Bhīṣma, Droṇa, or Karṇa)
18. **Question 18: multiple-select** (Characters who survived the 18-day war, or specific boons/curses)
19. **Question 19: what-would-you-do** (A Dharmic dilemma prompt asking the player to evaluate the highest dharmic path)
20. **Question 20: single-choice** (Deep philosophical or spiritual realization from Śānti Parva / Viṣṇu Sahasranāma / Mokṣadharma)

---

### STRICT JSON SCHEMA SPECIFICATION
Your entire response must be ONLY valid JSON matching this exact structure:

```json
{
  "id": "mahabharata-epic-quest-01",
  "title": "Mahābhārata — The Grand Tapestry of Dharma",
  "category": "mahabharata",
  "description": "An authentic 20-question deep dive spanning all 18 Parvas, exploring heroic vows, subtle dharmic dilemmas, battlefield tactics, and philosophical dialogues.",
  "difficulty": "medium",
  "timeLimit": 1200,
  "onTimeExpiry": "submit-partial",
  "questions": [
    {
      "id": 1,
      "type": "single-choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1,
      "difficulty": "easy",
      "points": 2,
      "explanation": "Scholarly explanation referencing the exact context...",
      "reference": "Mahābhārata, Ādi Parva (Sambhava Parva)"
    },
    {
      "id": 2,
      "type": "multiple-select",
      "question": "Question text? Select ALL that apply.",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndices": [0, 2, 3],
      "difficulty": "medium",
      "points": 3,
      "explanation": "Detailed explanation...",
      "reference": "Mahābhārata, Vana Parva"
    },
    {
      "id": 3,
      "type": "true-false",
      "question": "Statement text.",
      "correct": true,
      "difficulty": "easy",
      "points": 2,
      "explanation": "Explanation explaining the authentic fact vs popular TV myths...",
      "reference": "Mahābhārata, Sabhā Parva"
    },
    {
      "id": 4,
      "type": "who-am-i",
      "question": "Identify this Mahābhārata personality based on progressive clues:",
      "clues": [
        "First subtle clue (worth 3 points)",
        "Second more specific clue (worth 2 points)",
        "Third very revealing clue (worth 1 point)"
      ],
      "options": ["Hero A", "Hero B", "Hero C", "Hero D"],
      "correctIndex": 0,
      "difficulty": "medium",
      "points": 3,
      "explanation": "Detailed explanation of the personality...",
      "reference": "Mahābhārata, Udyoga Parva"
    },
    {
      "id": 5,
      "type": "who-said-this",
      "question": "Who spoke these momentous words during the council?",
      "quote": "\"Direct quote in English (and optionally Sanskrit snippet)\"",
      "context": "Context description of when and where this was spoken",
      "options": ["Speaker A", "Speaker B", "Speaker C", "Speaker D"],
      "correctIndex": 2,
      "difficulty": "medium",
      "points": 2,
      "explanation": "Context and deeper meaning...",
      "reference": "Mahābhārata, Udyoga Parva"
    },
    {
      "id": 6,
      "type": "sequence",
      "question": "Arrange these events in chronological order from earliest to latest:",
      "items": [
        "Event that is 3rd in time",
        "Event that is 1st in time",
        "Event that is 4th in time",
        "Event that is 2nd in time"
      ],
      "correctOrder": [1, 3, 0, 2],
      "difficulty": "medium",
      "points": 3,
      "explanation": "Explanation detailing the chronological timeline...",
      "reference": "Mahābhārata, Ādi Parva"
    },
    {
      "id": 7,
      "type": "match-pairs",
      "question": "Match each warrior on the left with their famous conch shell (Śaṅkha) on the right:",
      "left": ["Arjuna", "Yudhiṣṭhira", "Bhīma", "Kṛṣṇa"],
      "right": ["Pauṇḍra", "Devadatta", "Pāñcajanya", "Anantavijaya"],
      "correctPairs": [
        [0, 1],
        [1, 3],
        [2, 0],
        [3, 2]
      ],
      "difficulty": "medium",
      "points": 3,
      "explanation": "Bhagavad-gītā 1.15-1.16 describes: Pāñcajanya for Hṛṣīkeśa, Devadatta for Dhanañjaya...",
      "reference": "Bhagavad-gītā 1.15-1.16 / Mahābhārata, Bhīṣma Parva"
    },
    {
      "id": 8,
      "type": "assertion-reason",
      "question": "Evaluate the Assertion (A) and Reason (R) regarding Bhīṣma's silence in the gambling hall:",
      "assertion": "Assertion text stating a dharmic premise.",
      "reason": "Reason text providing the justification.",
      "options": [
        "Both (A) and (R) are true, and (R) is the correct explanation of (A)",
        "Both (A) and (R) are true, but (R) is NOT the correct explanation of (A)",
        "(A) is true, but (R) is false",
        "(A) is false, but (R) is true"
      ],
      "correctIndex": 0,
      "difficulty": "hard",
      "points": 3,
      "explanation": "In-depth philosophical breakdown...",
      "reference": "Mahābhārata, Sabhā Parva"
    },
    {
      "id": 9,
      "type": "spot-the-error",
      "question": "One factual error exists in the passage below. Identify which option corrects it:",
      "passage": "During the 13th year incognito exile in the Virāṭa kingdom, Arjuna served as Bṛhannalā the dance teacher, Bhīma served as Valala the master cook, and Draupadī served Queen Sudeṣṇā under the name Śairandhrī claiming she had six Gandharva husbands protecting her.",
      "options": [
        "Arjuna's disguise was named Kanka, not Bṛhannalā",
        "Bhīma's disguise was named Granthika, not Valala",
        "Draupadī stated she had five Gandharva husbands, not six",
        "The queen's name was Satyavatī, not Sudeṣṇā"
      ],
      "correctIndex": 2,
      "difficulty": "medium",
      "points": 3,
      "explanation": "Draupadī told Queen Sudeṣṇā that she was protected by five celestial Gandharvas who were her husbands (referring secretly to the five Pāṇḍavas).",
      "reference": "Mahābhārata, Virāṭa Parva"
    },
    {
      "id": 10,
      "type": "missing-link",
      "question": "What critical intermediate event completes this cause-and-effect chain?",
      "chain": [
        "Jayadratha dishonors Draupadī in the forest of Kamyaka",
        "Bhīma and Arjuna capture and humiliate Jayadratha by shaving his hair into 5 tufts",
        "?",
        "Jayadratha traps Abhimanyu inside the Cakravyūha by holding off the remaining four Pāṇḍavas"
      ],
      "options": [
        "Jayadratha performs intense tapas to Lord Śiva and gains a boon to hold back the four Pāṇḍavas for a single day",
        "Jayadratha joins forces with Duryodhana after marrying Duḥśalā",
        "Droṇācārya gifts Jayadratha a celestial shield impenetrable by any weapon",
        "Karṇa bestows his Vijaya bow upon Jayadratha"
      ],
      "correctIndex": 0,
      "difficulty": "hard",
      "points": 3,
      "explanation": "Humiliated by the Pāṇḍavas, Jayadratha performed severe penances to Lord Śiva at Gaṅgādvāra. Śiva granted him the boon to check all four Pāṇḍavas (excluding Arjuna) in battle for only one day, which he deployed on the 13th day to seal the Cakravyūha entrance against Yudhiṣṭhira, Bhīma, Nakula, and Sahadeva.",
      "reference": "Mahābhārata, Vana Parva (Draupadī-haraṇa Parva) & Droṇa Parva"
    },
    {
      "id": 11,
      "type": "odd-one-out",
      "question": "Which of the following warriors is the ODD ONE OUT based on their biological lineage / divine parentage?",
      "options": ["Karṇa", "Sugrīva", "Yama", "Yudhiṣṭhira"],
      "correctIndex": 3,
      "difficulty": "medium",
      "points": 2,
      "explanation": "Karṇa, Sugrīva, and Yama are all sons of Sūrya (the Sun God). Yudhiṣṭhira is the son of Yama / Dharma-deva, not Sūrya.",
      "reference": "Mahābhārata, Ādi Parva & Vana Parva"
    },
    {
      "id": 12,
      "type": "case-study",
      "question": "Analyze this Dharmic case study according to Mahābhārata ethics:",
      "scenario": "When Droṇācārya was decimating the Pāṇḍava army, Lord Kṛṣṇa advised Yudhiṣṭhira to announce that 'Aśvatthāmā is dead' (referring to the elephant named Aśvatthāmā). Yudhiṣṭhira, who had never uttered an untruth, hesitated.",
      "options": [
        "Yudhiṣṭhira's chariot fell to the earth immediately because even a subtle technical untruth violates Sādhāraṇa Dharma",
        "Droṇa died directly from shock without any weapon touching him",
        "Yudhiṣṭhira refused outright to utter any part of the statement",
        "Yudhiṣṭhira's action was completely sinful with no higher purpose"
      ],
      "correctIndex": 0,
      "difficulty": "hard",
      "points": 3,
      "explanation": "Prior to this, Yudhiṣṭhira's chariot rode four finger-breadths above the ground due to his absolute truthfulness. When he whispered 'the elephant' softly after 'Aśvatthāmā is dead', his chariot touched the ground, demonstrating that even tactical equivocation carries a karmic reflection in the material realm.",
      "reference": "Mahābhārata, Droṇa Parva"
    }
  ]
}
```

---

### QUALITY CRITERIA
1. **Zero Hallucinations**: Every fact, boon, weapon, dialogue, and lineage MUST strictly adhere to the Sanskrit Vyāsa Mahābhārata text.
2. **IAST Diacritics**: Use standard Roman transliteration (ā, ī, ū, ṛ, ṝ, ḷ, ñ, ṅ, ṇ, ṭ, ḍ, ś, ṣ, ḥ, ṁ).
3. **No Redundancy**: Do not repeat the same hero or motif across multiple questions. Balance Kauravas, Pāṇḍavas, neutral kings, women (Draupadī, Kuntī, Gāndhārī, Satyavatī), and divine personalities (Kṛṣṇa, Vyāsa, Vidura, Bhīṣma).
4. **Valid JSON Output**: Return pure JSON only. Do not wrap in conversational chit-chat.
```
