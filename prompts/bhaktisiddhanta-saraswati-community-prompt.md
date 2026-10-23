# Brahma Jijñāsā — Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura on Community & Leadership (15 Questions)

> **Optimized for:** Google NotebookLM (Chat Interface limit ≤ 3,500 chars), Claude 3.5 Sonnet, ChatGPT (GPT-4o), Gemini 1.5 Pro.
> **Length:** ~3,360 characters (safely fits NotebookLM's 3,500 character limit).
> **Format:** Exactly 15 questions, community-flavoured, rich variety (11 interactive types), 100% schema-compliant.

---

## The Prompt to Copy into NotebookLM

```text
Based on uploaded sources:
Generate a 15-question quiz on "Srila Bhaktisiddhanta Sarasvati Thakura on Community, Cooperation & Devotee Care".
Output pure valid JSON ONLY (starts with { ends with }). No markdown, no text outside JSON.

THEME: 64 Community Principles; collective leadership (Governing Body 10-12); Brihat Mridanga; yukta-vairagya; radical humility; avoiding factionalism & aparadha.

RULES:
1. ESCAPING: NEVER unescaped double quotes in strings. Use single quotes or \".
2. EXPLICIT NAMING: Name the subject clearly in stems (no ambiguous "he/they").
3. BALANCED DISTRACTORS: All options plausible peers of similar length.
4. ZERO LEAKS: No question or explanation reveals another question.
5. SHUFFLE INDICES: Evenly distribute correctIndex (0,1,2,3). Vary multiple-select correctIndices.
6. TRUTHFUL BINDING: Write options first, then set correctIndex to true answer.

SCHEMAS (all with id:"1"-"15", type, difficulty:"easy", explanation, reference):
- single-choice / odd-one-out / cause-effect / two-truths-one-false: {question, options:[4], correctIndex}
- multiple-select: {question, options:[4], correctIndices:[2-3]}
- true-false: {question, options:["True","False"], correct:boolean, correctIndex:0|1}
- who-am-i: {question, clues:[3], options:[4], correctIndex}
- who-said-this: {question, quote, context, options:[4], correctIndex}
- sequence: {question, items:[4], correctOrder:[0,1,2,3 shuffled]}
- match-pairs: {question, left:[4], right:[4], correctPairs:[[0,X],[1,Y],[2,Z],[3,W]]}
- assertion-reason: {question, assertion, reason, options:[4], correctIndex}
- spot-the-error: {question, passage:"1... 2... 3... 4...", options:[4], correctIndex}
- missing-link: {question, chain:[item1, item2, "?", item4], options:[4], correctIndex}
- case-study / what-would-you-do: {question, scenario, options:[4], correctIndex}

15 QUESTIONS:
Q1 (single-choice): Purpose of establishing 64 community principles
Q2 (multiple-select): Qualities preserving community harmony
Q3 (true-false): Managers as servants of devotees, not masters
Q4 (who-am-i): Srila Prabhupada carrying community ideals & publishing 64 principles
Q5 (who-said-this): Final order: "Do not quarrel... Form Governing Body of 10-12"
Q6 (sequence): Chronology: Ultadanga -> Navadvipa Parikrama -> Bagh Bazar -> Governing Body order
Q7 (match-pairs): Instruments (Brihat Mridanga, Parikrama, Harmonist, 64 Mathas) to functions
Q8 (assertion-reason): Yukta-vairagya (engaging tech vs artificial renunciation)
Q9 (spot-the-error): Devotee care (spot false idea of evicting struggling devotees)
Q10 (missing-link): Chain: Sadhana -> Humility -> [?] -> Transforming society
Q11 (odd-one-out): Attitude destroying community (Sectarian pride vs virtues)
Q12 (cause-effect): Consequence of viewing oneself as servant of all devotees
Q13 (two-truths-one-false): Ashram harmony (spot false statement)
Q14 (case-study): Resolving friction between managers and traveling preachers
Q15 (what-would-you-do): Proper action when devotees face service conflict

WRAPPER:
{"id":"64-bhaktisiddhanta-community","title":"Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura on Community & Leadership","category":"64-principles","description":"15 questions on community blueprint, cooperation, and devotee care.","difficulty":"easy","timeLimit":600,"onTimeExpiry":"submit-partial","questions":[/* 15 questions */]}
```
