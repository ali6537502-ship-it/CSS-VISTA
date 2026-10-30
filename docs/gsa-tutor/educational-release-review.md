# GSA Tutor — educational release review

**Reviewed:** 30 October 2026  
**Status:** NOT APPROVED for final educational publication. Draft development may continue.  
**Source:** CSS VISTA General Science Part-I textbook (29 October 2026), the manuscript imported into `public/gsa-tutor/studio.html`.

## 1. Structural inventory

- **28 chapters, 141 numbered sections, 250 source MCQs, 31 model analytical answers.**
- Every one of the 250 MCQs has four answer choices and an answer key; automated extraction detected **no duplicate question stems**. This is a **format** check, not a scientific correctness certification.
- The existing stage-based lesson flow is interactive. Custom topic diagrams and models are currently authored for **seasons** and **Moon phases**. Other chapters require purpose-built visual interactions and sectional questions rather than reusing chapter-level MCQs.
- The timetable includes all 141 sections at every duration from 5–120 days. Longer duration redistributes daily load and adds scheduled recall; the minute estimates are provisional calculations from text length, not measured human study time.
- Distinguish the 60-mark General Science Part I from the separate General Ability Part II; the present course contains only Part I.

## 2. Chapter-by-chapter inventory

“Links” counts direct http(s) links inside the chapter, not bibliography entries elsewhere in the manuscript.

| Chapter | Source MCQs | Analytical model answers | Direct source links |
|---|---:|---:|---:|
| 01 | 4 | 0 | 1 |
| 02 | 3 | 0 | 1 |
| 03 | 6 | 0 | 0 |
| 04 | 4 | 1 | 1 |
| 05 | 6 | 1 | 1 |
| 06 | 1 | 0 | 1 |
| 07 | 3 | 1 | 2 |
| 08 | 3 | 0 | 0 |
| 09 | 9 | 1 | 3 |
| 10 | 4 | 0 | 3 |
| 11 | 3 | 0 | 0 |
| 12 | 8 | 0 | 0 |
| 13 | 5 | 2 | 10 |
| 14 | 1 | 0 | 0 |
| 15 | 6 | 0 | 0 |
| 16 | 7 | 1 | 5 |
| 17 | 36 | 4 | 9 |
| 18 | 23 | 4 | 2 |
| 19 | 6 | 1 | 2 |
| 20 | 3 | 1 | 0 |
| 21 | 5 | 0 | 0 |
| 22 | 6 | 0 | 1 |
| 23 | 3 | 1 | 3 |
| 24 | 10 | 1 | 1 |
| 25 | 26 | 2 | 0 |
| 26 | 25 | 4 | 3 |
| 27 | 19 | 3 | 5 |
| 28 | 15 | 3 | 57 |
| **Total** | **250** | **31** | **111** |

**Assessment gaps:** Chapters 2, 6, 7, 8, 11, 14, 20 and 23 have fewer than four source MCQs; Chapters 1, 2, 3, 6, 8, 10, 11, 12, 14, 15, 21 and 22 have no analytical model answer. Chapters 3, 8, 11, 12, 14, 15, 20, 21 and 25 have no direct in-chapter source link. This alone does not establish that the underlying science is incorrect; it means verification and assessment material are insufficiently documented.

## 3. Independently verified illustrative source checks

The following **limited spot checks** match primary sources. This is explicitly not a statement that every paragraph, formula, numerical figure or answer has been verified.

- Chapter 1: The book's approximate 13.8-billion-year age and its explanation of cosmological redshift agree with NASA's universe and Hubble resources: https://science.nasa.gov/exoplanets/what-is-the-universe/ and https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-cosmological-redshift/
- Chapter 3: The explanation of lunar phases as a changing perspective on the Moon's sunlit half matches NASA: https://science.nasa.gov/moon/moon-phases/
- Chapter 5: The distinction between earthquake *early warning* after an earthquake starts and prediction beforehand matches the USGS: https://www.usgs.gov/faqs/what-difference-between-earthquake-early-warning-earthquake-forecasts-earthquake-probabilities
- Chapter 17: BOD as microbial oxygen use during decomposition, typically measured over five days at 20°C, matches US EPA descriptions: https://cdxapps.epa.gov/oms-substance-registry-services/substance-details/1640606 and https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=9100NX8X.TXT
- Chapter 13: The discussion correctly distinguishes antimicrobial resistance as a pathogen-level public-health threat, consistent with the WHO's 16 July 2026 fact sheet: https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance

## 4. QA work completed on the development branch

- Timetable coverage, rescheduling preservation and basic account isolation unit tests.
- Dedicated **pull-request-only** GitHub workflow (no automatic deployment) for GSA unit tests, TypeScript checks, Hostinger build and route integrity.
- Fixed iframe hydration when an account switch remounts the tutor.
- Added conflict resolution so the latest plan reschedule wins across devices, completion timestamps merge, later successful recall resolves earlier revision, and explicit bookmark removal survives synchronization.
- Added targeted regression tests for these cross-device merge cases.

## 5. Required release gates

1. Review every one of the 250 MCQs for scientific correctness, plausibility of incorrect choices, explanation quality and relevant section placement. Some existing distractors are conspicuously unrelated to the question's subject.
2. Check every factual statement, dated statistic, scientific formula, unit, numerical example and attribution in all 28 chapters against traceable authoritative sources. Record a reviewed-by/date/source log for each chapter. Correct the manuscript first, then regenerate the tutor data.
3. Fill the thin chapter practices with **independently checked** lesson-specific questions, including applied, diagram-based and reasoning formats; prepare analytical answer-writing for currently missing chapters.
4. Add tested visual experiences where an actual model helps (e.g., heat transfer, eclipses, tectonics, atmospheric phenomena, osmosis, food processing, networks), without decorative filler.
5. Verify sign-in, log-out, account switch, course edits, bookmark removal and revision decisions against a **real protected deployment preview** with controlled test accounts; use browser tests, not only mocks. Preserve old account/student records. Never request actual passwords in a chat.
6. Verify current official FPSC Part-I topic-by-topic coverage against the original syllabus and mark every section mapped; do not assume that 28 chapters alone prove complete alignment.
7. Pass `npm run test:gsa-tutor`, `npm run typecheck`, `npm run build:hostinger`, `npm run audit:routes` and relevant existing account regressions.
8. Owner review and **explicit production release instruction**. The repository's existing release hold remains in force for this feature.

**Do not represent this prototype as a fully scientifically verified, live, or account-end-to-end-tested release until all applicable gates actually pass.**
