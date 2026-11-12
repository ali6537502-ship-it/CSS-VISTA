# GSA follow-up: syllabus evidence, practice, teaching drafts and remaining gates

12 November 2026. **Development implementation; no production deployment or academic sign-off.** This report supersedes the earlier run's descriptions of the syllabus evidence, equation-rendering gap and assessment software. Earlier dated reports remain historical records.

## Syllabus and the broader course

The owner supplied `GENERAL SCIENCE & ABILITY (1).pdf`. The document was read directly, including the 60-mark General Science / 40-mark General Ability boundary. Its Part-I text has **23 bullets across five domains**. The coverage register splits drinking-water standards from the water-pollution bullet, producing **24 traceability rows**. Extracted text, original filename, document hash and provenance are retained under `docs/gsa-tutor/sources/`. Source wording, including “LED Energy”, is preserved rather than silently repaired. The latter must be interpreted carefully: LED lighting is an efficiency technology, not a primary energy resource.

Live FPSC PDF/category endpoints still returned HTTP 503. The provided document is now the directly inspected syllabus evidence; the latest online revision has not been independently reconfirmed. All 141 lessons have explicit editorial syllabus references and core/enrichment scope labels. These are assistant-authored mappings pending independent curriculum review, not proof that every concept is adequately taught.

The course remains broader than the official syllabus. **Whole course is the default.** Domain, syllabus-focus and enrichment filters help navigation without deleting or replacing any lesson. Enrichment can still be examinable; the labels do not promise that an examiner will restrict questions to a narrow list. The 2025 archived paper itself includes deeper applications such as photosynthesis and deforestation.

## Implemented software

- **Diagnostic practice:** up to 20 source MCQs, sampling all five domains equally when the inventory permits.
- **Cumulative practice:** an explicit selection of chapters; thin chapters honestly produce fewer questions.
- **Timed practice:** 30 minutes for up to 20 source MCQs, with an absolute saved deadline, reload/resume, per-question navigation and post-submission explanations. Timed deadlines continue away from the page. This is a science practice mode, not a complete authenticated 60-mark mock paper.
- Attempts store frozen question/option/key/explanation snapshots, selected responses and separate choice events. Earlier attempts remain. Results are source-key scores, **not verified mastery or readiness**. Missed and unanswered items enter exact-question revision.
- Cross-device merging retains eligible responses and choice history while preventing a stale unfinished copy from reopening a submitted assessment. Responses after an earlier finish/deadline are excluded when merging.
- **Written practice:** all 31 original models can be compared with a response, and the response plus a six-part self-evaluation record is retained as a separate snapshot. It gives no numerical marks or claimed human evaluation. This general writing method does not replace a scientifically approved question-specific rubric.
- **Planner:** starting knowledge, explicitly difficult chapters and previously studied chapters are collected separately from completion/mastery. Reading estimates respond to these preferences and weak recent practice where sufficient chapter evidence exists. Completed sessions with at least two minutes of observed active page time can inform estimates. Time accounting excludes hidden/unfocused periods and long inactivity; it measures approximate active page time, not learning or attention.
- **Equations:** bundled KaTeX generates native MathML without external fonts. Mathematical percent signs are preserved as literal percentages. Unsupported notation remains visible with a warning. The audit typesets **156 expressions** with no parser warnings; this does not scientifically verify the formulas. One HTML import corruption in chapter 25 was repaired against its already-correct canonical text, with an explicit correction record. All 141 canonical lesson texts and all original question keys remain unchanged.
- **Visual learning:** added source-compared particle-count and anaerobic-digestion schematics. They expose isotope/charge changes and biological-stage relationships, clearly distinguishing schematic representations from scaled physical simulations or plant-design guidance. They require independent scientific visual review before release.
- Keyboard focus is retained through dynamic choice/model updates. Browser checks cover actual timed response/resume/submission, mobile equation dialogs, source-reference dialogs and the new model controls alongside prior account/reset checks.

## Teaching drafts and source control

Four complete-stage **drafts** are prepared privately under `content/gsa-tutor/draft-units/`:

| Stable lesson | Draft focus | Supporting sources |
|---|---|---|
| c6-s6-1 | Particle counts, isotope/ion distinctions, worked numerical reasoning | OpenStax Chemistry 2e 2.3 |
| c6-s6-2 | Ionic/covalent bonding, lattice structure and conductivity | OpenStax Chemistry 2e 7.1, 7.2, 10.5 |
| c14-s14-2 | Feedstock preparation, alcoholic fermentation, carrier regeneration and recovery | OpenStax Biology 2e 7.5; US EIA Ethanol explained |
| c14-s14-4 | Anaerobic digestion stages, biogas/digestate and system limitations | US EPA AgSTAR explanation and Operator Guidebook chapter 1 |

Each includes objectives/prerequisites/terminology, concept teaching, a visual specification, application, examination-style task, active checks, a five-mark model with criteria/common mistakes, and revision/recall tasks. Together they contain **12 new original MCQs**, with all four options explained, and **four five-mark model rubrics**. Source records include titles, publishers, URLs, retrieval date/hash, supported concepts and honest review status.

These units are **source-compared drafts, not independently approved teaching**. They are not copied into the public course or counted as approved question-bank additions. The normal structural audit can pass while `audit-units --release` rejects the pending units. No fabricated reviewer or scientific sign-off has been added.

## Archived paper links

Sixteen five-mark Section-A written questions from the 2025 archived paper were transcribed and checked against both extracted text and the page image, with the archived file hash recorded. They are linked to relevant lessons and matrix rows with year, question number, marks and page links. Original wording is retained. Their labels explicitly state that a matching FPSC-hosted copy was unavailable for independent publisher-origin confirmation. No answer key or approved model is inferred from the paper. General Ability Section B is not imported into the science course.

## Preservation and implementation limits

The existing account system, routes, reset generations, sync key and storage infrastructure are retained. There is no database migration, new API, account mutation or production progress operation. All 141 canonical texts, all 250 original question records/keys and all 31 original written models remain unchanged. The single HTML transcription repair is versioned and documented; catalogue changes are additive metadata.

Assessment history is retained rather than silently truncated. Existing local-storage limits and the native account snapshot limit (3 MiB server payload) still apply. Save/sync failures must remain visible, with export/retry available; the system does not promise unlimited retained history or an untested storage migration. No authenticated production cross-device trial was performed.

## What remains before the requested final acceptance claim

1. Independently review scientific claims, numerical examples, medical/environmental statements, formulas and diagrams in **all 141 existing lessons**. The four new drafts also need independent review; they do not mean the other lessons were rebuilt.
2. Complete eight-stage authoring for the remaining lessons where required, with topic-specific success criteria and useful visuals. Avoid generic objectives or arbitrary word quotas.
3. Individually review the existing **250 MCQs / 31 models** and new **12 draft MCQs / four draft rubrics**. Complete explicit question-to-concept mappings and balanced assessment coverage for every prescribed concept, not merely equal domain samples.
4. Establish independently reviewed mastery evidence, transparent performance-based retention policies and a complete 60-mark science mock with appropriate written-answer practice. Current scores are explicitly provisional source practice; the new self-review interface is not approved marking.
5. Add remaining useful scientific models and independently validate every visual's labels, mechanism and stated limitations.
6. Extend the planner to budget scheduled chapter/written/mock exam workloads and reviewed-assessment-derived weak-concept revision. Present inputs and observed-time heuristics do not establish a validated personalized learning model.
7. Independently verify curriculum mapping and archived-paper provenance; confirm any later official syllabus revision when FPSC is reachable.
8. Complete protected-preview controlled-account/cloud/reset tests, full accessibility/real-device trials and storage-capacity validation for sustained usage.
9. Conduct independent beginner learner trials and measure actual learning outcomes. No trial, scientific sign-off or claim that a learner can rely on this course alone has been fabricated.
10. Obtain the applicable educational and owner release approvals. **Do not merge or deploy this draft as an approved educational course.**
