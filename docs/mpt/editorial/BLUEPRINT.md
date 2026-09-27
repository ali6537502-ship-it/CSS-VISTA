# MPT paper blueprint (generated — do not edit by hand)

Rendered by `node scripts/mpt/render-blueprint-doc.mjs` from `src/data/mpt/blueprint.ts`.

The paper is partitioned only as FPSC partitions it: 200 MCQs in five sections with their official marks, each built from its official syllabus headings. FPSC prescribes no count for any topic inside a section, and CSS Vista imposes none. The other rules below concern quality (difficulty, a fair opening, no repetition), not content quotas.

- **official** — prescribed by FPSC (MPT Rules and syllabus).
- **observed** — seen in the recorded papers profiled in `src/data/mpt/patternProfile.ts`.
- **internal** — CSS Vista’s quality rule where FPSC is silent. Never an FPSC quota.

## Official structure

| Section | Questions | Official headings (each present in every paper, no count) | Basis |
|---|---|---|---|
| Islamic Studies | 20 | Islamic Studies | official: FPSC MPT syllabus: Islamic Studies (Civics & Ethics for non-Muslim candidates) |
| Urdu | 20 | Urdu | official: FPSC MPT syllabus: grammar usage and translation |
| English | 50 | vocabulary and grammar, comprehension | official: FPSC MPT Rules: vocabulary, grammar usage and comprehension (one unseen passage) |
| General Abilities | 60 | Quantitative Ability, Reasoning | official: FPSC MPT syllabus: quantitative ability; reasoning and mental ability |
| General Knowledge | 50 | Everyday Science, Current Affairs, Pakistan Affairs | official: FPSC MPT Rules: General Knowledge comprises Everyday Science, Current Affairs and Pakistan Affairs |

English comprehension: one unseen passage with 5–10 questions (observed: 6 (2022), 5 (2024 Q86–90), 10 (2025)).

Pile-up guard (internal): no topic takes more than 2× its share of the bank in one paper, plus one.


## Difficulty, order and repetition

| Rule | Value | Basis | Note |
|---|---|---|---|
| difficulty.target | 1: 42%, 2: 46%, 3: 12% | internal | Target share by level (1 accessible, 2 moderate, 3 challenging) |
| difficulty.abilitiesTarget | 1: 45%, 2: 47%, 3: 8% | internal | Target share by level (1 accessible, 2 moderate, 3 challenging) |
| difficulty.accessible | 70–115 | internal | 35–57 % of the paper at difficulty 1 |
| difficulty.moderate | 70–115 | internal | 35–57 % at difficulty 2 |
| difficulty.challenging | 8–30 | internal | 4–15 % at difficulty 3 |
| difficulty.perSectionChallengingShare | 0–20 | internal | No section more than 20 % challenging |
| difficulty.abilitiesChallengingShare | 0–10 | internal | General Abilities at most 10 % challenging (6 of 60) |
| order.openingWindow | 10 | internal | Opening and pacing rule |
| order.openingMaxChallenging | 2 | internal | Opening and pacing rule |
| order.openingFirstFiveMaxChallenging | 0 | internal | Opening and pacing rule |
| order.maxConsecutiveChallenging | 2 | internal | Opening and pacing rule |
| repetition.perPaperFamily | 0–2 | internal | At most two items from one pattern family in a paper (one for GA computation families) |
| repetition.perPaperFamilyGa | 0–1 | internal | A General Ability skeleton appears at most once per paper |
| repetition.perSeriesFamily | 0–20 | internal | A General Ability skeleton family appears in at most 20 papers of the series, never twice in one paper, and its numbers-masked wording never repeats (factual and language sections are governed by concept uniqueness and near-duplicate checks instead) |
| repetition.perSeriesTemplate | 0–1 | internal | The same wording with only numbers or names changed never repeats across the series |
| repetition.nearDuplicateJaccard | 0–0.72 | internal | Stems with token-Jaccard ≥ 0.72 in one subtopic are treated as duplicates across the series |

## Recorded-paper evidence (General Knowledge composition)

| Year | Recorded GK items | Everyday Science | Current Affairs | Pakistan Affairs | Other GK |
|---|---|---|---|---|---|
| 2022 | 53 | 17 | 12 | 16 | 8 |
| 2023 | 44 | 11 | 14 | 17 | 2 |
| 2024 | 49 | 16 | 18 | 13 | 2 |
| 2025 | 74 | 17 | 25 | 23 | 9 |

The recorded papers are evidence of style and level, not quotas. The earlier internal split of 20 Everyday Science / 2 Current Affairs / 28 Pakistan Affairs, and the per-topic practice ranges that followed it, have been withdrawn.

