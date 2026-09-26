# MPT practice blueprint (generated — do not edit by hand)

Rendered by `node scripts/mpt/render-blueprint-doc.mjs` from `src/data/mpt/blueprint.ts`. The release gate enforces exactly these numbers on every one of the 40 papers.

Each rule is labelled:

- **official** — prescribed by FPSC (MPT Rules and syllabus). Only the paper size, time and the five broad sections are official.
- **observed** — derived from the recorded papers profiled in `src/data/mpt/patternProfile.ts` (2022, 2023 Special, 2024, 2025; see limits there).
- **internal** — CSS Vista’s preparation choice where FPSC is silent or the recorded papers disagree. Never an FPSC quota.

## Broad structure

| Section | Questions | Basis | Note |
|---|---|---|---|
| Islamic Studies | 20 | official | FPSC MPT: Islamic Studies / Civics & Ethics, 20 marks |
| Urdu | 20 | official | FPSC MPT: Urdu, 20 marks |
| English | 50 | official | FPSC MPT: English, 50 marks |
| General Abilities | 60 | official | FPSC MPT: General Abilities, 60 marks |
| General Knowledge | 50 | official | FPSC MPT: General Knowledge (Everyday Science, Current Affairs, Pakistan Affairs), 50 marks |

## Group ranges inside sections

| Area | Group | Range | Basis | Evidence / reason |
|---|---|---|---|---|
| english | vocabulary | 15–22 | observed | Vocabulary items 15–21 per recorded paper (synonyms, antonyms, context, idioms) |
| english | grammar | 18–27 | observed | Grammar items 18–24 per recorded paper |
| abilities | quant | 32–38 | observed | Quantitative 27–39 per recorded paper (2022 also had 14 psychometric-theory items, not used since) |
| abilities | reasoning | 22–28 | observed | Reasoning 9–20 recorded (2023 is partial); raised because the syllabus gives reasoning its own heading |
| generalKnowledge | science | 14–18 | observed | Everyday Science 11–17 per recorded paper (scaled to 50) |
| generalKnowledge | current | 14–18 | observed | Current Affairs 11–18 per recorded paper (scaled to 50) |
| generalKnowledge | pakistan | 14–19 | observed | Pakistan Affairs 13–19 per recorded paper (scaled to 50) |
| generalKnowledge | scienceIt | 2–4 | internal | Syllabus IT heading: computers, networks, AI |
| urdu | translation | 3–6 | observed | Translation incl. office terms: 7 (2022), 2 (2024), 4 (2025) |

## Islamic Studies

| Subtopic | Range per paper | Basis | Evidence / reason |
|---|---|---|---|
| Islamic beliefs and fundamentals (`isl.beliefs`) | 0–3 | internal | Syllabus heading; rarely a separate item in recorded papers |
| The Qur’an: revelation, compilation, themes (`isl.quran`) | 1–4 | observed | Qur’an items 2–7 per recorded paper; capped to stop Qur’an trivia dominating |
| Hadith and Sunnah (`isl.hadith`) | 0–2 | observed | 0–2 per recorded paper |
| Worship and its moral and social impact (`isl.worship`) | 1–3 | observed | 0–2 recorded; syllabus stresses the impact of worship |
| Seerah: Makkan period (`isl.seerah-makkah`) | 1–3 | observed | Seerah is the most frequent Islamiat area (5–7 items across both periods) |
| Seerah: Madinan period, treaties and battles (`isl.seerah-madinah`) | 1–4 | observed | Seerah is the most frequent Islamiat area |
| Prophets, Companions and major personalities (`isl.personalities`) | 1–3 | observed | 1–3 per recorded paper |
| Governance under the Rightly Guided Caliphs (`isl.caliphate`) | 0–3 | observed | 0–2 recorded; syllabus: governance under the Pious Caliphate |
| Sources of Islamic law, Ijma, Ijtihad, Fiqh (`isl.law`) | 1–3 | observed | 0–5 recorded (Ijma, Fiqh terms) |
| Public administration, Shura, accountability (Hisbah) (`isl.governance`) | 1–3 | internal | Syllabus heading under-represented in recalled papers; at least one per paper |
| Human rights, family, social justice and ethics (`isl.social`) | 1–3 | internal | Syllabus: human rights, dignity, social justice; at least one per paper |
| Islamic economic system (`isl.economy`) | 0–2 | observed | 1–2 recorded |
| Islamic civilization, institutions and scholars (`isl.civilization`) | 0–3 | observed | 1–5 recorded; capped |
| Islam and the modern world (`isl.modern`) | 0–2 | internal | Syllabus: Islam and the modern world |

## Urdu

| Subtopic | Range per paper | Basis | Evidence / reason |
|---|---|---|---|
| قواعد: اقسامِ کلمہ، اسم، فعل، حروف، زمانے، مرکبات (`urdu.grammar`) | 3–6 | observed | 3–5 grammar-term items per recorded paper |
| واحد جمع (`urdu.plural`) | 1–3 | observed | 1–2 recorded |
| مذکر مونث (`urdu.gender`) | 1–3 | observed | 2 in 2022 |
| مترادف (`urdu.synonym`) | 1–3 | observed | 2 in 2022 |
| متضاد (`urdu.antonym`) | 1–3 | observed | 2 in 2022 |
| درست جملہ / جملے کی ساخت (`urdu.sentence`) | 2–4 | observed | 2–3 recorded |
| درست استعمال، املا، الفاظ کے جوڑے (`urdu.usage`) | 0–2 | observed | 1 recorded |
| محاورہ و روزمرہ (زبان کے استعمال کی حد تک) (`urdu.idiom`) | 0–2 | observed | 1–2 recorded (as language, not literature) |
| ترجمہ: جملہ (`urdu.translation`) | 1–3 | observed | 2–4 recorded |
| ترجمہ: دفتری اصطلاحات (`urdu.office-terms`) | 1–4 | observed | 7 office-term translations in 2022 |

## English

| Subtopic | Range per paper | Basis | Evidence / reason |
|---|---|---|---|
| Unseen passage comprehension (`eng.comprehension`) | 5–10 | observed | 6 (2022), 10 (2024), 10 (2025); one or two unseen passages |
| Synonyms (`eng.synonym`) | 4–6 | observed | 5–6 per recorded paper |
| Antonyms (`eng.antonym`) | 4–6 | observed | 4–6 per recorded paper |
| Vocabulary in context (sentence completion) (`eng.vocab-context`) | 2–6 | observed | 0–9 recorded |
| Idioms and expressions (`eng.idiom`) | 2–5 | observed | 7 (2024), 5 (2025) |
| Phrasal verbs (`eng.phrasal-verb`) | 0–2 | observed | 0–1 recorded; syllabus lists phrasal verbs |
| Commonly confused words (`eng.confused-words`) | 0–2 | internal | Syllabus lists commonly confused pairs |
| Prepositions (`eng.preposition`) | 3–6 | observed | 3–7 recorded |
| Articles and determiners (`eng.article`) | 1–2 | internal | Syllabus lists articles; 0–1 recorded |
| Tenses (`eng.tense`) | 1–3 | internal | Syllabus lists tenses; 0–3 recorded |
| Conjunctions and connectors (`eng.conjunction`) | 0–2 | internal | Syllabus lists conjunctions |
| Subject–verb agreement (`eng.sva`) | 1–3 | observed | Agreement is the commonest error in 2024–25 correction items |
| Pronouns (`eng.pronoun`) | 0–2 | observed | 0–1 recorded |
| Modifiers (misplaced/dangling) (`eng.modifier`) | 0–2 | observed | 1 in 2025 |
| Parts of speech (`eng.parts-of-speech`) | 0–3 | observed | 7 in 2022, none since |
| Punctuation (`eng.punctuation`) | 1–3 | observed | 1–4 recorded |
| Choose the correct sentence (`eng.sentence-correction`) | 4–8 | observed | 4–13 recorded |
| Identify the erroneous sentence (`eng.error-identification`) | 1–4 | observed | 3 (2024), 7 (2025) |
| Sentence structure, clauses, voice and narration (`eng.sentence-structure`) | 0–2 | observed | 0–2 recorded |

## General Abilities

| Subtopic | Range per paper | Basis | Evidence / reason |
|---|---|---|---|
| Percentages (`ga.percentage`) | 2–4 | observed | 2 per recorded paper |
| Ratio and proportion (`ga.ratio`) | 1–4 | observed | 0–3 recorded |
| Averages (`ga.average`) | 1–3 | observed | 1–2 recorded |
| Profit, loss and discount (`ga.profit-loss`) | 0–2 | internal | Not recorded; SSC-level rates |
| Rates, speed, time and distance (`ga.speed-time`) | 1–3 | observed | 2 in 2024 |
| Work and time (`ga.work-time`) | 1–3 | observed | 3 in 2024 |
| Fractions, decimals, indices and number operations (`ga.fractions`) | 2–4 | observed | 2–4 recorded |
| Algebraic expressions and identities (`ga.algebra`) | 2–5 | observed | 3–5 recorded |
| Equations and word problems (`ga.equations`) | 3–6 | observed | 2–11 recorded; capped at 6 so word problems do not overwhelm |
| Sets and Venn problems (`ga.sets`) | 1–2 | observed | 2 in 2024 |
| Number properties, remainders, HCF/LCM, rounding (`ga.number-properties`) | 1–3 | observed | SSC syllabus: remainders and rounding |
| Angles, triangles and polygons (`ga.geometry`) | 2–4 | observed | 2–9 recorded |
| Perimeter, area and volume (`ga.mensuration`) | 1–4 | observed | 5 in 2024 |
| Data interpretation and basic statistics (`ga.data`) | 1–3 | observed | 7 statistics items in 2022 |
| Basic probability (`ga.probability`) | 0–2 | observed | 1 recorded per paper |
| Number and letter series (`ga.series`) | 2–4 | observed | 2–4 recorded |
| Direction sense (`ga.directions`) | 1–2 | observed | 1 recorded |
| Family and blood relations (`ga.blood-relations`) | 1–3 | observed | 1–3 recorded |
| Ordering and ranking (`ga.ordering`) | 1–3 | observed | 1–3 recorded |
| Seating and arrangement (`ga.seating`) | 1–2 | observed | 1 recorded |
| Logical deduction and syllogisms (`ga.deduction`) | 1–3 | observed | 4 in 2022 |
| Analytical puzzles with conditions (`ga.analytical`) | 1–2 | observed | 1 in 2024 |
| Coding and decoding (`ga.coding`) | 1–2 | observed | 1 in 2023 |
| Verbal reasoning: classification, analogy, statements (`ga.verbal-reasoning`) | 2–4 | observed | 1–4 recorded |
| Clocks and calendars (`ga.clock-calendar`) | 1–2 | observed | 2 in 2024 |
| Mental, mechanical and numerical ability (`ga.mental-ability`) | 1–3 | observed | 1–3 recorded |

## General Knowledge

| Subtopic | Range per paper | Basis | Evidence / reason |
|---|---|---|---|
| Human body and physiology (`sci.human-body`) | 0–3 | internal | Per-subtopic cap |
| Health and common diseases (`sci.health`) | 0–2 | internal | Per-subtopic cap |
| Nutrition, vitamins and food science (`sci.nutrition`) | 0–3 | observed | 2–4 recorded; capped |
| Cells, genetics and basic biology (`sci.biology`) | 0–2 | internal | Per-subtopic cap |
| Plants and ecology (`sci.plants-ecology`) | 0–2 | internal | Per-subtopic cap |
| Environment, pollution and water (`sci.environment`) | 0–2 | internal | Per-subtopic cap |
| Atmosphere, weather and climate (`sci.climate`) | 0–2 | internal | Per-subtopic cap |
| Energy resources (`sci.energy`) | 0–2 | internal | Per-subtopic cap |
| Basic chemistry and materials (`sci.chemistry`) | 0–2 | observed | 2 per recorded paper |
| Electricity, sound, light, heat and force (`sci.physics`) | 0–3 | observed | 1–4 recorded |
| Units, measurement and instruments (`sci.units`) | 0–2 | observed | 3 in 2022; capped |
| Earth science, solar system and natural phenomena (`sci.earth-space`) | 0–3 | observed | 1–5 recorded; capped |
| Computers, internet and telecommunications (`sci.it`) | 1–3 | observed | 1–2 recorded; syllabus IT heading |
| AI, GIS/remote sensing and digital technology (`sci.ai-digital`) | 0–2 | observed | 1 per recent paper |
| Recent verified developments (time-sensitive) (`ca.recent`) | 3–7 | observed | 3–6 time-sensitive items in 2022–24 (2025 had 21, mostly minutiae — not followed) |
| International and regional organisations (`ca.organisations`) | 3–6 | observed | 3–4 recorded |
| Global issues, agreements and geopolitics (`ca.global-issues`) | 3–7 | observed | 1–11 recorded |
| Pakistan’s external relations (`ca.pakistan-external`) | 1–4 | observed | 1 recorded; syllabus: Pakistan’s external affairs |
| Muslim rule, reform movements and the Pakistan Movement (`pa.movement`) | 1–3 | observed | 1–3 recorded |
| Constitutional development and provisions (`pa.constitution`) | 1–3 | observed | 2–3 recorded |
| Political history since 1947 (`pa.political-history`) | 1–3 | observed | 1–5 recorded |
| Geography, land and people (`pa.geography`) | 1–3 | observed | 3–4 recorded |
| Economy, agriculture and industry (`pa.economy`) | 0–2 | observed | 1–5 recorded |
| Water, energy and natural resources (`pa.resources`) | 0–2 | observed | 1–2 recorded |
| State institutions and governance (`pa.institutions`) | 0–2 | observed | 0–1 recorded |
| Foreign policy and regional organisations (`pa.foreign-policy`) | 1–3 | observed | 1–7 recorded; capped |
| Security, nuclear programme and defence (`pa.security`) | 0–2 | observed | 2–3 recorded |
| Society, culture, education and demography (`pa.society`) | 0–2 | observed | 1–4 recorded |

## Difficulty, order and repetition

| Rule | Value | Basis | Note |
|---|---|---|---|
| difficulty.accessible | 50–80 | internal | 25–40 % of the paper at difficulty 1 |
| difficulty.moderate | 80–115 | internal | 40–57 % at difficulty 2 |
| difficulty.challenging | 28–60 | internal | 14–30 % at difficulty 3 |
| difficulty.perSectionChallengingShare | 0–40 | internal | No section more than 40 % challenging |
| order.openingWindow | 10 | internal | Opening and pacing rule |
| order.openingMaxChallenging | 2 | internal | Opening and pacing rule |
| order.openingFirstFiveMaxChallenging | 0 | internal | Opening and pacing rule |
| order.maxConsecutiveChallenging | 2 | internal | Opening and pacing rule |
| repetition.perPaperFamily | 0–2 | internal | At most two items from one pattern family in a paper (one for GA computation families) |
| repetition.perPaperFamilyGa | 0–1 | internal | A General Ability skeleton appears at most once per paper |
| repetition.perSeriesFamily | 0–12 | internal | A pattern family appears in at most 12 of the 40 papers |
| repetition.perSeriesTemplate | 0–1 | internal | The same wording with only numbers or names changed never repeats across the series |
| repetition.nearDuplicateJaccard | 0–0.72 | internal | Stems with token-Jaccard ≥ 0.72 in one subtopic are treated as duplicates across the series |

## Recorded-paper evidence (General Knowledge composition)

| Year | Recorded GK items | Everyday Science | Current Affairs | Pakistan Affairs | Other GK |
|---|---|---|---|---|---|
| 2022 | 53 | 17 | 12 | 16 | 8 |
| 2023 | 44 | 11 | 14 | 17 | 2 |
| 2024 | 49 | 16 | 18 | 13 | 2 |
| 2025 | 74 | 17 | 25 | 23 | 9 |

The earlier internal split of 20 Everyday Science / 2 Current Affairs / 28 Pakistan Affairs matched none of the recorded papers and has been withdrawn.

