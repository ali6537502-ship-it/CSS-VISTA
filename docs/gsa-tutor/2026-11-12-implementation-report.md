# CSS VISTA General Science — implementation and educational quality report

12 November 2026 · development draft · **not approved for educational publication**

This is a foundational implementation batch, not completion of the requested standalone science course. No production deployment, merge to main, student-data migration or production-account mutation was performed. The existing educational release hold remains in force.

The existing architecture is retained: `GSATutor.tsx` embeds `studio.html`; chapter content loads on demand; all progress stays in the existing `cssvista:tool:gsa-tutor:v1` account/reset partition and native account synchronization. No new database, account system, course route or dependency was introduced.

## Baseline and sources

Verified inventory: **28 chapters, 141 numbered lessons, 250 original MCQs, 31 original written models**. All original lesson fields, MCQ stems/options/keys/explanations and written models are preserved, with per-chapter SHA-256 checks in `content-review-register.json`. Supplemental teaching and assessment use separate fields and a draft content version. Existing question identifiers and learner records remain valid.

Production `/gsa-tutor` was inspected read-only. The FPSC CSS syllabus listing and the official PDF's indexed extracts were located. Direct retrieval of both the old asset URL and the current PDF URL recorded in `public/fpsc-syllabus.json` failed with upstream 503/reset responses. Accordingly, the matrix uses the existing repository transcription corroborated by official indexed extracts, and **does not claim a fresh exact-text verification of the whole PDF**.

Official references:

- https://www.fpsc.gov.pk/Syllabuses?section=CSS+Syllabi
- https://www.fpsc.gov.pk/assets/media/2024-10-22-01-45-26-Syllabus_for_CE-2016_and_onwards.pdf
- https://www.fpsc.gov.pk/uploads/syllabus/1767002683737_Syllabus-for-CE-2016-and-onwards.pdf

## Implemented

1. **Traceability and original-course audit.** `syllabus-coverage.json` and its Markdown companion contain 136 candidate subtopic rows in 23 prescribed topic groups across the five Part-I domains. They identify lesson IDs, source-passage evidence, gaps, references, verification status and the absence of verified past-paper matches. The chapter audit covers all 28 chapters. 107 lessons have direct candidate links; 34 further lessons require contextual mapping/review. An unmapped lesson is not automatically extraneous or unsuitable. General Ability Part II is excluded.
2. **Budgeted scheduling.** A pure learning engine packs lesson work and dated recall into the selected daily budget, accounts for starting level and difficult chapters, respects weekly rest days and extends unrealistic deadlines. It exposes indivisible lessons that exceed the budget. A catch-up action replans remaining reading from today without erasing completion or revision history. Future recall dates remain intact; after the reading programme the engine can jump to a later recall date instead of inserting empty days. Legacy plans retain their original scheduling algorithm until explicitly edited or rebalanced. Editing can now be cancelled without nulling the active plan.
3. **Safer written work.** Recall and written answers save on input. Timestamped draft metadata resolves stale-device conflicts while retaining compatibility with legacy string drafts, including deliberate clearing. New concept and writing attempt collections merge in the same native account record.
4. **Assessment evidence.** Lesson checks append attempts with question/answer snapshots, selected response, lesson/concept links, content version and review status. Chapter attempts also snapshot the administered question. Incorrect explicitly linked questions schedule the actual lesson for revision. Original keys are unchanged. Legacy keyword links remain explicitly labelled provisional; this batch does not claim to have editorially tagged all 250 source questions.
5. **Source-linked pilot teaching.** Lessons 6.4 (wave relationships) and 14.4 (digester outputs) have objectives, beginner prerequisites, additional explanations, applications, revision sheets and source metadata. Every original paragraph remains in the teaching sequence and complete reference. There are four new original practice MCQs, with four options, explicit syllabus/lesson/concept links, difficulty/type and explanations for every option; two original five-mark practice models have topic-specific draft rubrics and common mistakes. None is represented as an authentic FPSC question or independently approved content.
6. **Interactive explanations and accessibility.** A vacuum frequency/wavelength calculator and a two-stream digester walkthrough join the existing visual models. Their assumptions and limits are stated. The calculator uses native MathML for its displayed relation. Model controls retain keyboard focus across redraws. The actual scheduled session count and deadline extension are shown prominently.
7. **Honest answer comparison.** Learners can compare their response with the pilot models and record an immutable rubric-based self-evaluation, including the response and rubric snapshot. The interface labels these as learner assessments and draft pedagogical marks, not human evaluation or official FPSC marks. Existing source models without rubrics say so explicitly.
8. **Verification infrastructure.** Structural audits validate original preservation, syllabus links, new metadata, option sets and five-mark rubric totals. `audit:gsa-release` intentionally fails closed while the documented academic and release gates remain unsatisfied. A pure evidence rule requires two distinct approved concept questions, including application/reasoning, at the approved version; draft content cannot pass it. This is an infrastructure rule, not a completed course-wide mastery or readiness dashboard.

## Pilot source comparisons and approval limits

| New content | Supporting reference | Status |
|---|---|---|
| Wave relation, unit conversion, frequency/photon-energy distinction and original numerical examples | OpenStax, Chemistry 2e, 6.1: https://openstax.org/books/chemistry-2e/pages/6-1-electromagnetic-energy | Source comparison performed; independent scientific and pedagogical sign-off pending |
| Anaerobic digester conditions, biogas/digestate distinction and post-treatment limitations | US EPA AgSTAR: https://www.epa.gov/agstar/how-does-anaerobic-digestion-work | Source comparison performed; independent scientific and pedagogical sign-off pending |

These checks support the specific new explanations only. They do not verify every original claim in chapters 6 and 14, every medical/environmental statement, or the full course. New pedagogical rubrics are original drafts and have not been validated against actual FPSC marking decisions.

## Validation

- `npm run test:gsa-tutor`: **35 passing tests**, including budget extension, rest days, shared recall budgets, catch-up retention, legacy plans, input autosave, draft synchronization, full concept evidence and writing self-evaluations.
- `npm run test:workspace`: **78 passing regressions** for account/workspace/planner/reset behavior.
- `npm run typecheck`: passed.
- `npm run audit:gsa-content`: structural checks passed, original hashes unchanged; academic approval remains **NOT APPROVED**.
- `npm run build:hostinger`: passed, including the existing MPT source/exported release safeguards. Existing bundle-size and content-rights/editorial warnings do not constitute GSA academic approval.
- `npm run audit:routes`: 119 registry routes, four redirects, five true 404 checks and 923 sitemap URLs verified against the generated artifact.
- `npm run test:routes`: 21 passing tests after the production build.
- `node tests/browser/gsaTutor.mjs`: passed in Chromium at **320, 375, 768 and 1440 px**, with complete lesson journeys, keyboard model interaction, pilot rubric persistence, 200% zoom, overflow checks and stale-account/reset isolation. This is a local fixture test, not authenticated production or real cross-device testing.
- `npm run audit:gsa-release`: expected nonzero result, preserving the educational release hold.
- `git diff --check`: passed.

Screenshots are available in `test-artifacts/gsa-tutor/` during validation. No passing automated test establishes scientific correctness, independent evaluation or learner readiness.

## Remaining work and release blockers

1. Retrieve the authoritative complete PDF and directly compare every prescribed label/subtopic with the candidate matrix, including unusual official wording such as “LED Energy”; LEDs must be taught as efficient devices rather than primary renewable energy sources. Verify the 34 further lessons' contextual links.
2. Independently review every original scientific claim, formula, unit, numerical example, medical fact, environmental assertion, diagram and source. Record named reviewers, source/claim traceability, correction records and approved versions. Zero chapters or new draft versions received independent approval in this run.
3. Finish the eight-stage teaching redesign for the other 139 lessons. Review the two pilot extensions independently. Expand the flagged topics, provide meaningful objectives/prerequisites, and segment long sections without invalidating historical IDs. This batch does not establish textbook-level instructional completeness.
4. Review all 250 original MCQs, replace provisional keyword matching with explicit editorial mappings throughout, expand weak concepts with balanced reviewed questions and verify genuine past-paper provenance directly. No authentic past-paper matches were certified here.
5. Build complete diagnostic, chapter/cumulative and timed General Science mock assessments with reviewed coverage and scoring. These modes were not implemented in this batch. The new evidence rule alone does not establish operational course-wide mastery or exam readiness.
6. Produce and independently approve topic-specific written models/rubrics across all chapters. There are two new draft practice models; this does not fill the original twelve model-less chapters.
7. Extend source-reviewed diagrams and models across remaining high-impact mechanisms. Review existing models independently. Legacy raw TeX remains flagged; the new MathML relation does not solve equation rendering across the original manuscript.
8. Add observed active-learning durations, diagnostic-informed workload estimates, separate examination workloads and fully automatic missed-day rebalancing. Current time estimates are transparent heuristics, and catch-up is learner initiated. There are no measured learner-duration claims.
9. Validate interrupted storage/network behavior, authenticated account switching, reset and sync against controlled accounts in the established protected preview, including real cross-device trials. No genuine student credentials or records were accessed or changed.
10. Conduct independent beginner learner trials, assessment validation and learning-outcome evaluation before claiming the course can replace textbooks or mentors. Obtain explicit owner release approval after all relevant gates pass. Do not merge this draft into automatically deployed main or publish the unreviewed supplements.

The next academic work should resolve the official-source comparison, then review and iterate the two pilot units before expanding the same workflow across the remaining course. Preserve all stable IDs and account/reset boundaries throughout.
