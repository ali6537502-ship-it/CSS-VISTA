# MPT 34-paper replacement: release criteria

The scheduled series requires 34 papers (two daily for 17 days), each with 200 questions in the FPSC order: Islamic Studies 20, Urdu 20, English 50, General Abilities 60 and General Knowledge 50. The 50-mark GK section covers Everyday Science, Current Affairs and Pakistan Affairs; FPSC does not specify an internal numerical split. The maths difficulty is SSC level. The 200-minute mock clock and current 3:00 p.m./10:30 p.m. Pakistan-time windows must remain intact.

Run `npm run audit:mpt-34` before publishing a replacement. The baseline fingerprints in `data-archive/mpt-legacy-fingerprints.json` cover all 6,800 questions in the currently deployed series. Release requires **zero reuse of those stems**, zero duplicate questions within the replacement series, a balanced English section with comprehension throughout the series, usable Urdu grammar and translation, and no mechanically repeated maths stem with numbers merely substituted. Each current-affairs question must have a source with its answer checked against the primary publication where possible. Independently solve all numeric answers and review each factual answer and distractor; scripts alone cannot establish correctness.

## Audit of the first candidate, rejected

The first attempt passed a structural 6,800-question uniqueness test, yet reused 4,967 old questions. Twenty arithmetic templates each occurred up to 60 times, and several occurred multiple times in one paper. Thirty-two of 34 English papers had no comprehension and later papers could contain dozens of bare synonym prompts. The first science selection included blackbody radiation, Hardy–Weinberg calculations and RLC circuits rather than everyday science; the new gate excludes those examples. Consequently the candidate **must not be published**. These counts are reproducible by rerunning `npm run audit:mpt-34`.

The draft changes introduce an MPT-only subject gate, 49 manually written Urdu application/translation items, 14 current-affairs items with links to WEF, WHO, IMF and UNFCCC publications, and an audit that rejects legacy overlap, out-of-syllabus science, repeated numeric structures and absent comprehension. They do **not** yet provide a replacement bank for all 34 papers. The candidate remains in a working branch until the editorial and automated criteria both pass.

## Second pass: still blocked

Thirty-six original English passages with two inference questions apiece were added as draft content. Each paper reserves a distinct passage; the October 15 date/slot collision was fixed. Selecting a numeric stem pattern at most once within a paper exposes the actual shortage: only 25 of the 34 papers build in the current audit sequence, and the later papers repeatedly stop at 55 of 60 General Abilities questions. Of those 5,000 questions in the 25 buildable papers, 3,505 still use old IDs and 3,506 match old stems. The 25 papers still include 70 bare arithmetic drills, and some English sections contain more than 15 isolated synonym prompts. These counts are from `npm run audit:mpt-34` after the stricter pattern rule; they are a diagnosis, not a paper release.

Next editorial work requires a substantial bank of independently solved SSC-level ability problems with different reasoning structures, higher-quality English vocabulary and comprehension distractors, usable Urdu translation, and source-checked syllabus facts. An automated uniqueness check cannot certify the answer keys or difficulty. Do not loosen the gate, renumber the legacy entries or swap figures in templates to manufacture 6,800 supposedly new questions. Do not ship this branch or promise that its 34 papers are ready.

## Individually authored ability batch

A subsequent batch adds 47 original ability questions across 15 SSC-level topics, with worked explanations and distinct numeric structures. Its structural test checks IDs, normalized stems and number-substitution patterns against the archived series, along with answer options and explanations. Independent calculations checked representative arithmetic and probability answers, and exhaustive enumeration checked the constrained seating, scheduling and box-location answers. Questions were also reviewed by reading their stems, solutions and distractors. These checks support the 47-item addition; they do not certify the larger legacy bank.

With this batch selected, the release audit builds 26 of 34 papers and then still runs out of acceptable General Abilities questions (45/60 on 2026-10-14 at 3 p.m.). Among the 5,200 questions it can build, 3,589 stems still match the prior series and 72 one-step arithmetic drills remain. English synonym and Urdu translation composition still fails review. The release status remains **blocked**.

## Audit of the central question bank and past papers

The central GK bank contains 36,245 entries in 41 categories. The earlier rebuild did not sufficiently inventory these sources. `npm run audit:mpt-sources` now reads every authored shard, checks the index count, identifies repeated stems from the existing mock series and reports missing explanations, unusable answer choices and malformed entries. Relevant examples from that audit:

| Category | Entries | Stems already served in previous mocks | Missing explanations | Unusable answer choices |
| --- | ---: | ---: | ---: | ---: |
| General Abilities | 900 | 607 | 400 | 0 |
| English Grammar | 2,599 | 1,639 | 2,413 | 124 |
| Urdu Language | 825 | 523 | 825 | 0 |
| Islamic GK | 3,790 | 670 | 2,550 | 0 |
| Science | 4,644 | 0 | 860 | 100 |
| Pakistan Affairs | 3,826 | 824 | 3,826 | 125 |
| Miscellaneous GK | 5,174 | 2 | 3,022 | 439 |
| Recalled MPT Past Papers | 534 | 3 | 534 | 366 |

The 85 mathematics entries in the recalled past-paper category all contained “None of these,” so none could pass the existing four-choice mock gate. Forty-one were individually solved and admitted with checked fourth options and worked explanations; three incorrect or hidden source keys were explicitly corrected. The new review test checks their selected answers, distinct choices and absence from previously served mock stems. The remaining items were not admitted without review.

The candidate now builds **27 of 34** papers; the first later failure has only 31 of 60 distinct General Abilities questions. Of the 5,400 built questions, **3,655 stems still match prior mocks**, and the audit flags 72 bare arithmetic drills, English synonym concentration and Urdu translation shortfalls. These figures describe the draft, which remains **blocked from release**. Raw GK counts cannot be added to English, Urdu or arithmetic quotas: each section has its own FPSC weight and content requirements.

The selection audit confirms that all 47 individually authored ability questions and 40 of the 41 reviewed past-paper mathematics questions enter the 27 buildable papers. The remaining reviewed question is not forced into a paper when selection constraints reject it.

## Section-level replacement from the central bank

The revised MPT selector excludes every archived, previously published question ID from its Islamic Studies and Pakistan Affairs pools. An MPT-only lazy-loaded ID list is generated from the archived 6,800-question series. It is not used by unrelated quiz modes. A further 25 unambiguous English grammar and usage questions were reviewed from the recalled-paper bank, supplied with explanations and tested against the archived mock stems; 23 are selected in the 27 buildable papers.

The latest full audit still builds **27/34** papers, but questions matching prior-paper stems fell from **3,655 to 2,696** across those 27 papers. The unsolved General Abilities shortage (31/60 in a later paper), English concentration, Urdu translation shortfall, repeated number structures and remaining 2,696 old stems keep this candidate **blocked**. Continue editorially sourcing section-specific questions; a raw 36,245-question GK count cannot fix the three language/ability quotas by itself.

FPSC reference: [MPT rules, Appendix III](https://www.fpsc.gov.pk/assets/media/2024-06-13-MPT-rules.pdf) and the [MPT syllabus](https://www.fpsc.gov.pk/uploads/syllabus/1767073666057_MPT-Syllabus.pdf).

## September 2026 source check and full exclusion gate

The [FPSC notice dated 19 August 2026](https://www.fpsc.gov.pk/uploads/content/1787222788872_Public_Notice_-_Re-Scheduling_of_MPT-2027.pdf) rescheduled the examination to **10 October 2026**. The 34-paper release audit now targets 23 September–9 October, two sessions daily, before that examination. The notice supersedes the original 27 September date in the [advance public notice](https://fpsc.gov.pk/uploads/content/1783075774884_Advance_Public_Notice_-_CSS_Competitive_Examination-2027.pdf).

Research located the [FPSC practice-paper answer key](https://www.fpsc.gov.pk/assets/media/2024-06-13-Key_of_200_items_for_Muslim_Candidates_Final-29-11-21.pdf), [FPSC 2025 revised answer key](https://www.fpsc.gov.pk/assets/media/2024-12-10-04-51-17-Revised-Answer-Key-For-Muslims-CSS-2025-Batch-1.pdf), and collections of actual booklets or reconstructions. FPSC answer keys contain letters but no independent explanation or approval of a secondary site's transcription. Some purported 2024 papers openly reconstruct missing questions; generic solved-paper sites have inconsistent question counts. Do not import a secondary collection wholesale or present reconstructions as official questions. The 534 recalled-paper items already in the central bank are a better starting point for individual checking. An additional 16 English questions from it have now received individually checked answers and explanations; one tempting item was caught as previously served and rejected by a test. Twenty-five additional original Urdu translation, grammar and usage items were authored and checked for distinct answers.

The old selector filtered published IDs only from Islamic Studies and Pakistan Affairs. All sections now exclude the 6,800 previously served IDs; a generated manifest also identifies aliases where the same stem has another bank ID. Two hand-curated English entries matching previous stems were caught and added to the manifest. The selector reserves three distinct Urdu translations per paper and caps isolated English synonym prompts at fifteen. A further batch added 116 original Urdu grammar, vocabulary, idiom, spelling and translation items plus 43 independently solved ability questions. The gate is deliberately fail-closed when a subject runs out: the latest full audit builds **7 of 34 papers**, with 1,400 questions, zero old IDs, zero old stems, no absent comprehension, no one-step arithmetic, and zero off-syllabus regex hits in those seven papers. The eighth currently stops in General Abilities. This is **not** an approved replacement series. Rerun the generator and audit when editing any source bank: `npm run build:mpt-legacy-exclusions && npm run audit:mpt-34`.
