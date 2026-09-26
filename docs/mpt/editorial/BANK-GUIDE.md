# MPT release bank — contributor guide

This is the contract for every file in `src/data/mpt/bank/**`. The official MPT
papers are built **only** from this bank. Nothing is eligible because it exists
elsewhere in the repository.

## The controlling question

> Would a question of this type, wording, depth and difficulty reasonably
> belong in an actual FPSC CSS MPT paper?

Being technically inside the syllabus is not enough. Priority order:
**MPT authenticity → factual accuracy → relevance → balance → uniqueness → difficulty quality.**
When in doubt, leave the item out. A smaller bank of strong items is the goal.

Reference material in the repository:

- Official syllabus headings: `src/data/mptSyllabus.ts`
- Past papers: `public/past-papers/mpt/` (2022 and 2023-Special are also in
  text form in `data-archive/mpt-past-paper-text/`). 2024 and 2025 are scans.
- Pattern profile (what real papers look like): `src/data/mpt/patternProfile.ts`
- Recalled past-paper items with reviewed answers:
  `data-archive/question-banks/mpt-past-papers.json` (answer basis in `basis`),
  year attribution in `data-archive/question-banks/mpt-past-papers-provenance.json`.

## File format

Each file is a JSON array of question objects (and, for English comprehension,
passage objects). Write UTF-8, no comments, 2-space indent.

```json
{
  "id": "mpt-isl-a-0001",
  "section": "Islamic Studies",
  "subject": "Islamic Studies",
  "subtopic": "isl.law",
  "pattern_family": "isl.law.sources",
  "concept": "ijma-literal-meaning-consensus",
  "difficulty": 1,
  "source_type": "past-paper-reviewed",
  "past_paper_year": 2022,
  "verified": true,
  "q": "What is the literal meaning of ‘Ijma’?",
  "o": ["Consensus", "Analogy", "Struggle", "Interpretation"],
  "a": 0,
  "explanation": "Ijma literally means agreement or consensus; in Islamic law it is the consensus of qualified jurists on a ruling.",
  "source_url": null,
  "time_sensitive": false,
  "event_date": null,
  "last_verified": "2026-09-26",
  "quality_grade": "A",
  "mpt_relevance": "core"
}
```

| Field | Rule |
|---|---|
| `id` | Your assigned prefix + 4-digit serial. Never reuse or renumber. |
| `section`, `subject`, `subtopic` | Must agree with `src/data/mpt/taxonomy.ts`. |
| `pattern_family` | The *skill or template* tested, dotted, e.g. `ga.ages.ratio-then-now`, `eng.preposition.verb-collocation`, `isl.seerah.battles`. Items sharing a skeleton share a family; the selector caps each family per paper and per series. Be honest: same skeleton = same family. |
| `concept` | The *specific fact or item* tested, kebab-case, e.g. `ghazwa-khandaq-alt-name-ahzab`, `synonym-obdurate`. Two questions testing the same fact (even worded differently) must have the same concept — then only one of them is ever used. Concepts must be unique within your file. |
| `difficulty` | 1 accessible · 2 moderate · 3 challenging, for a prepared CSS candidate (see below). |
| `source_type` | `past-paper-reviewed` (recalled MPT item, year known, answer re-verified), `bank-reviewed` (existing repo item you re-verified and corrected), `authored` (new), `generated-verified` (produced by code that computes the answer), `current-verified` (time-sensitive, source-backed). |
| `past_paper_year` | Only with `past-paper-reviewed`, and only where provenance supports the year. Never call a reconstructed item an exact FPSC question. |
| `verified` | Always `true`. If you are not certain of the answer, do not include the item. |
| `o`, `a` | Exactly four distinct options; `a` is the 0-based index of the single correct option. No “None of these”, “All of the above”, “Both A and B”. Replace such options in recalled items with a plausible wrong option. Vary the position of the correct answer. |
| `explanation` | 1–2 sentences stating *why* the answer is right (not just repeating it). Shown to candidates after results. |
| `source_url` | Required (https) for anything time-sensitive; otherwise `null` unless you have a stable authoritative URL. Never invent a URL. If you cite one, you must have fetched it. |
| `time_sensitive` / `event_date` | `true` for any fact that can change (office-holders, member counts, rankings, recent events). Then `source_url` and `event_date` (YYYY-MM-DD) are mandatory. |
| `last_verified` | The date you checked it (today: 2026-09-26). |
| `quality_grade` | `A` = exam-authentic and clean; `B` = acceptable. Anything weaker is simply not included. |
| `mpt_relevance` | `core` = squarely in a syllabus heading and in the observed paper pattern; `supporting` = syllabus-linked but less frequent. |

Validate every file before finishing:

```
node scripts/mpt/validate-bank.mjs src/data/mpt/bank/<your-file>.json
```

It must report `"problems": 0`. It also rejects any question text that was
already served in an earlier MPT series.

## Difficulty model

- **1 — accessible**: a well-prepared candidate should know it or solve it in
  well under a minute (core facts, one-step reasoning, common vocabulary).
- **2 — moderate**: needs solid preparation or two reasoning steps.
- **3 — challenging**: needs deeper preparation, careful reading or up to three
  steps. *Difficult because of understanding, never because of obscurity.*

Target shape of the bank per subtopic: roughly 30 % / 50 % / 20 %.

## Global writing rules

1. Natural examination English (or natural Urdu). No database phrasing such as
   “Which rule is associated with example…”, “Which description best fits…”,
   “Select the correct association…”, “Which actor-description pair…”.
2. Keep stems short and direct, like the real papers (“Who compiled…?”,
   “The Lahore Resolution was passed in:”, “Choose the correctly punctuated
   sentence.”).
3. Distractors must be plausible, parallel in form and length, and definitely
   wrong. No joke options, no near-synonyms of the right answer that could also
   be right.
4. One identifiable point per question.
5. Do not invent facts, statistics, dates, quotations, hadith, or biographies.
   Include only what you are certain of; mark genuinely disputed facts out.
6. Avoid “Which of the following is NOT…” except occasionally.
7. No two items in your file may test the same concept.

## Section rules

### Islamic Studies (20 per paper)
Test recognisable MPT-level material: beliefs, fundamentals, worship and its
purpose, the Qur’an and Hadith at the level of well-known facts, Seerah and
major events, major Companions and personalities, Rashidun governance, Shura,
accountability/Hisbah, sources of law (Qur’an, Sunnah, Ijma, Qiyas, Ijtihad),
Fiqh terms, human rights, family and social justice, Islamic economics
(Zakat, Riba, Mudarabah…), Islamic civilization and modern challenges.

Forbidden: verse counts, Surah serial numbers, Juz/Ruku counts, Hadith serial
or book numbers, verse citations like `5:3` as answers, “how many times is X
mentioned”, disputed counts, obscure numeric minutiae (exact numbers of
companions at an event, months someone stayed somewhere). A number is fine only
when it is itself a widely taught core fact (e.g. the Hijrah year, Nisab
7½ tola gold, five pillars).

### Urdu (20 per paper)
Language only: قواعد (اقسامِ کلمہ، اسم کی اقسام، فعل، حروف، زمانے، مرکبات)،
واحد جمع، مذکر مونث، مترادف، متضاد، درست جملہ، درست املا و استعمال،
الفاظ کے جوڑے، a few محاورات used as language, and translation (English⇄Urdu
sentences, and دفتری اصطلاحات such as Minutes of the Meeting → روداد، Noting →
کیفیت نویسی — a real 2022 pattern). No poets, authors, books, genres, صنائع
بدائع, عروض, or literary history. Translations must be natural and have one
clearly best answer.

### English (50 per paper)
Subtopics: synonyms, antonyms, vocabulary in context, idioms, phrasal verbs,
confused words, prepositions, articles, tenses, conjunctions, subject–verb
agreement, pronouns, modifiers, parts of speech, punctuation, choose the correct
sentence, identify the erroneous sentence, sentence structure, comprehension.
Sentence-correction items: four natural sentences; exactly one fully correct;
the wrong ones each contain one realistic learner error (agreement, tense,
article, preposition, pronoun case, modifier, parallelism). Vocabulary at CSS
level (e.g. obdurate, sanguine, ephemeral) — not GRE rarities, not school
level. Comprehension: original passages of 180–380 words in the register of
competitive examinations (policy, history, science, society, economics,
literature-in-general), each with 5–6 questions (main idea, detail, inference,
vocabulary in context, tone/purpose, title).

### General Abilities (60 per paper)
SSC-level competitive aptitude. Quantitative: percentages, ratios, averages,
profit/loss/discount, rates/speed, work, fractions/decimals/indices, algebra,
equations/word problems, sets, number properties/remainders, geometry
(angles, triangles, polygons), mensuration, data interpretation (small tables),
basic probability. Reasoning: series, directions, blood relations, ordering
and ranking, seating, syllogisms/deduction, conditional puzzles, coding,
verbal reasoning (odd one out, word analogy, necessary part, statement and
conclusion), clocks/calendars, mental ability. Most items 1–2 steps; at most
three steps; no calculator arithmetic. **Every numerical answer must be
computed by code** and every distractor checked to be wrong. Changing numbers
in one sentence is not a new question: give each item its own wording and
context, and put items sharing a mathematical skeleton in one `pattern_family`.

### General Knowledge (50 per paper)
- **Everyday Science**: recognisable everyday science (human body, health,
  nutrition/vitamins, diseases, cells and genetics basics, plants and ecology,
  environment and pollution, water, climate and atmosphere, energy, basic
  chemistry and physics, units/instruments, earth and space, food science,
  computers/internet/telecom, AI and GIS basics). No university calculations
  or jargon.
- **Pakistan Affairs**: high-yield themes (Pakistan Movement, constitutional
  development and major provisions, political history, geography, economy,
  resources, water and energy, institutions, foreign policy, security,
  society). Plain MCQ wording — not date-location-person matching exercises.
- **Current Affairs**: international and regional organisations, global issues
  and agreements, Pakistan’s external relations, and recent major developments.
  No publication dates, agency names, press-release wording, celebrity or
  sports minutiae. Everything that can change is `time_sensitive` with a
  source URL and event date.
