# GSA Tutor — source-quality audit (6 November 2026)

**Scope:** Development branch, original General Science Part-I manuscript (29 October 2026).  
**Editorial outcome:** NOT APPROVED FOR FINAL EDUCATIONAL RELEASE.  
**Evidence:** Catalog and all 28 chapter JSON files were inspected with repeatable structural checks; these are *not* independent scientific fact-checking.

## Syllabus boundary

Official source: https://www.fpsc.gov.pk/assets/media/2024-10-22-01-45-26-Syllabus_for_CE-2016_and_onwards.pdf (General Science & Ability paper, printed pp. 7–9). The revised syllabus hosted by the FPSC explicitly allocates General Science Part I 60 marks and General Ability Part II 40 marks. The tutor is limited to Part I.

Broad manuscript mapping, **not a certified line-by-line alignment**:

| Official General Science domain | Manuscript chapters | Specific scope checks required |
|---|---|---|
| Physical Sciences | 1–8, with vaccines/antibiotics overlapping chapter 13 | Celestial measurement, eclipses, weather, hazards, renewable/non-renewable energy, atomic/chemical topics, ceramics and agricultural chemicals |
| Biological Sciences | 9–14 | Cells, biomolecules, plant/animal groups, human physiology, named epidemics and biofuels |
| Environmental Science | 15–20 | Earth spheres, ozone and climate, pollutants, water quality, solid waste, GIS/remote sensing and population |
| Food Science | 21–24 | Diet, micronutrients, nutrients' availability, food quality, preservation and adulteration |
| Information Technology | 25–28 | Hardware/software, I/O and storage, Internet standards, satellite/mobile/fibre, AI fundamentals |

## Automated inventory and editorial-risk indicators

- **28 chapters, 141 numbered lessons, 250 source MCQs and 31 analytical model answers.**
- **161 / 250 question explanations contain fewer than 15 words.** This is an editorial expansion *candidate*, not evidence of a scientifically wrong answer.
- **116 / 250 MCQs have at least one answer option containing an absolute word** such as *only*, *always*, *never*, *every* or *exclusively*. These are human review flags, not automatic errors.
- **35 lesson sections contain possible raw dollar-delimited mathematical notation**, requiring a formula-rendering review. This is a heuristic indicator, not a confirmed count of improperly displayed formulas.
- All 250 MCQs in the audit had four existing options, a keyed choice and a non-empty explanation, with no duplicate stems found in the review.
- Strong chapter imbalance remains: Chapter 6 and Chapter 14 have only one MCQ each, versus Chapter 17's 36. Twelve chapters lack analytical model answers. The question-to-lesson matching code remains a provisional, keyword-based matching mechanism, not editorial tagging.
- The scientific accuracy of all source claims, units, numbers, explanations and model answers **remains unverified** apart from the explicitly limited primary-source spot checks already documented in `educational-release-review.md`.

| Ch. | Subject | MCQs | Written models | MCQ explanations under 15 words | Options with absolute wording | Sections with possible raw math |
|---|---|---:|---:|---:|---:|---:|
| 01 | Universe and Cosmic Evolution | 4 | 0 | 1 | 0 | 2 |
| 02 | Galaxies, Stars and the Sun | 3 | 0 | 1 | 1 | 2 |
| 03 | Solar System and Earth's Motions | 6 | 0 | 2 | 4 | 1 |
| 04 | Weather and Circulation | 4 | 1 | 1 | 1 | 3 |
| 05 | Natural Hazards | 6 | 1 | 3 | 4 | 0 |
| 06 | Atomic Structure and Radiation | 1 | 0 | 0 | 0 | 4 |
| 07 | Energy Resources | 3 | 1 | 0 | 1 | 2 |
| 08 | Modern Materials and Chemicals | 3 | 0 | 2 | 1 | 0 |
| 09 | Cells and Genetic Information | 9 | 1 | 4 | 3 | 0 |
| 10 | Enzymes and Cellular Energy | 4 | 0 | 1 | 1 | 2 |
| 11 | Diversity of Life | 3 | 0 | 0 | 1 | 0 |
| 12 | Human Physiology | 8 | 0 | 5 | 4 | 0 |
| 13 | Infectious Diseases and Vaccines | 5 | 2 | 2 | 1 | 0 |
| 14 | Biofuels | 1 | 0 | 1 | 1 | 1 |
| 15 | Earth Systems | 6 | 0 | 2 | 5 | 0 |
| 16 | Atmospheric Pollution and Climate | 7 | 1 | 3 | 4 | 1 |
| 17 | Water Quality | 36 | 4 | 31 | 20 | 1 |
| 18 | Water Treatment and Solid Waste | 23 | 4 | 21 | 10 | 3 |
| 19 | Remote Sensing and GIS | 6 | 1 | 4 | 1 | 2 |
| 20 | Conservation and Population | 3 | 1 | 0 | 2 | 1 |
| 21 | Food Composition | 5 | 0 | 2 | 1 | 1 |
| 22 | Diet and Micronutrients | 6 | 0 | 2 | 2 | 0 |
| 23 | Food Quality and Security | 3 | 1 | 1 | 1 | 0 |
| 24 | Food Preservation | 10 | 1 | 6 | 4 | 2 |
| 25 | Computer Fundamentals | 26 | 2 | 18 | 13 | 2 |
| 26 | Networks and Telecoms | 25 | 4 | 18 | 12 | 3 |
| 27 | Databases and Cybersecurity | 19 | 3 | 16 | 10 | 0 |
| 28 | Artificial Intelligence | 15 | 3 | 14 | 8 | 2 |
| **Total** | | **250** | **31** | **161** | **116** | **35** |

## Risks that block full sign-off

1. Scientifically check every statement, calculation, formula, unit, case study and source attribution against suitable primary/academic sources; record specific reviewer and date. Source review cannot be inferred from a build passing.
2. Review all 250 MCQs individually for scientific key validity, distractor plausibility, reasoning and topic specificity. For every weak/missing topic, author additional questions with independent checking; never call them actual past questions.
3. Verify all mathematical expressions render faithfully and legibly on desktop and mobile; never silently convert unsupported TeX into incorrect formulas.
4. Provide every important scientific mechanism with a useful, tested explanation and appropriate labelled visual; avoid decorative or misleading graphics.
5. Establish official-syllabus subtopic mapping and document any missing or excessive emphasis. Chapter titles alone are not proof of full coverage.
6. Build an approved answer-writing rubric for every chapter and every important scientific question type.
7. Verify authenticated production previews on actual devices and retain account and reset safety guarantees.

## Automation

`npm run audit:gsa-content` generates a machine-readable quality snapshot; its structural failures block CI, while pedagogical flags remain visible warnings. This is deliberately **not** a scientific approval gate.

**Maintaining the draft release hold is mandatory until the content, experience, tests and owner sign-off all pass.**
