# Teaching workflow and mock-practice implementation

12 November 2026. **Preparation continues; the complete educational overhaul is unfinished. No deployment or independent academic approval.** This report updates the software and authoring statuses in earlier dated reports; it does not turn those reports into release approval.

## Teaching content prepared

There are now **16 eight-stage teaching drafts**, comprising the five original lessons of chapter 6, the five original lessons of chapter 14, and six targeted lessons across the other official domains:

- Chapter 6: atomic structure/isotopes/ions; bonding; chemical reactions/pH/redox; electromagnetic radiation; radioactive change.
- Chapter 14: biomass and fuel pathways; ethanol; biodiesel; biogas; sustainability and evidence limits.
- Additional lessons: gas exchange/circulation/capillaries; adaptive immunity/vaccines; greenhouse warming; nutrient/mineral bioavailability; thermal food preservation; optical fibre/radar.

The drafts contain **36 original MCQs with explanations for all four options**, and **16 five-mark model answers with question-specific criteria and common mistakes**. Each unit has its own objectives, prerequisites, terminology, mechanisms, application, original exam-style task, active checks, visual explanation/specification, written model and revision/recall tasks. Examples and numerical exercises identify their assumptions; no demonstration is represented as a calibrated simulation or guaranteed industrial/medical outcome.

Sources were retrieved and compared from OpenStax, NASA, US EIA, US DOE/AFDC, US EPA and NOAA. Metadata records source title, publisher, actual URL, retrieval date/hash, supported concept IDs and pending independent review. Unavailable source endpoints were not fabricated into successful retrievals or cited as if inspected. Sources include Chemistry 2e 4.2/6.1/14.2/21.3; Biology 2e 34.2/39.2/40.3/42.2; Anatomy and Physiology 2e 23.7; Microbiology 13.2; College Physics 2e 25.4; and the relevant agency explanations.

These are **drafts**, not completed independent reviews. `teaching-unit-progress.json` now records every one of the 141 stable lesson IDs, draft presence/version/hash, domain, course scope and review state. **125 lessons do not yet have a rebuilt draft.** Original manuscript lessons remain available; the number of authored units is not proof that each unit adequately teaches every objective.

## Actual eight-stage review delivery

The existing studio now renders the authored units through a development-only editorial mode, using the same lesson IDs and original manuscript reference. It provides stage navigation, objective/prerequisite/term foundations, concept explanations, labelled flow relationships, applications, exam tasks, option-by-option question feedback, answer/model comparison, specific rubric tables, revision tasks and source records. Existing relevant scientific models are reused in the visual stage.

Run `npm run dev:gsa-editorial`, then open `http://127.0.0.1:5175/gsa-tutor/studio.html?editorial=1`. See `editorial-preview.md` for the review procedure and boundaries. Preview activity stays in memory; saved learning records and sync notifications are suppressed in this mode, while ownership checks still redact the view after an account change. It is not a separate course, database or progress system. No independent reviewer/approval field is populated by interacting with it.

The editorial JSON endpoint requires the explicit development flag and loopback host/peer. Normal development requests return 404 for that endpoint. Production artifacts contain the reusable renderer but **not the private draft JSON or a functioning editorial endpoint**. The publication-boundary audit checks this. Normal student lessons continue to use the original manuscript pending content approval; do not claim that these drafts are already delivered as approved student teaching.

## Science mock practice

A new practice mode implements the **60-mark layout** of 20 source MCQs (20 marks) plus two selected archived science groups, each containing four five-mark written tasks (40 marks). Only 2025 science groups 2–5 are accepted; General Ability groups are excluded. The source question text/year/page provenance and document hash are frozen with the attempt. The existing archived-copy origin limitation remains visible.

The learner selects an overall science-only practice budget from 60, 90, 120, 150 or 180 minutes. This is explicitly a chosen practice budget, not a fabricated official duration for a separate FPSC science paper. Absolute deadlines survive leaving/reloading. Written text autosaves, resumes, freezes on submission/expiry and survives cross-device merges. A stale device cannot reopen a finished attempt or replace work with a later post-submission response.

Objective responses receive a **source-key score**. The 40 written marks remain **ungraded**, with retained responses and source-study links. No combined score, human evaluation or examination-readiness conclusion is invented. The mode is an operational provisional practice workflow; it is not an academically approved mock examination or a replacement for reviewed written marking.

## Planner improvements

New plans use capacity-aware scheduling by default, retain the selected duration as a **minimum**, and extend it where necessary. Longer chosen durations spread work rather than filling early days and padding the end unnecessarily. Weekly rest days, available time, starting level, difficult/prior-study preferences and observed active-page-time estimates remain in use.

The workload now includes chapter MCQ practice, comparison of all 31 available original written models, and a final chosen-budget science mock block. Chapter practice estimates use question counts; short daily budgets split the questions into manageable blocks. Interrupted chapter practice resumes the first unanswered question within the existing attempt. These are separate from lesson checks/recall. Completion of reading alone cannot satisfy a practice task: retained quiz, written-response or completed-mock records are required. Practice completion still does not imply scientific mastery.

Timetable assignments are saved as stable snapshots. Finishing reading updates remaining workload and completion state without moving unfinished work to different calendar dates. An explicit rebalance archives the earlier complete timetable and settings. Invalid snapshot data falls back to a safe computed view without overwriting the retained record. Older valid plans remain readable without destructive migration.

A continuous 60-minute mock cannot fit a 15- or 30-minute daily budget merely by adding days. Such an indivisible constraint remains explicit; the planner does not pretend that interrupted work is an uninterrupted timed examination. Source reading, original records, all lessons and all pending activities are retained, including when the 120-session horizon cannot meet a requested workload.

## Preservation, QA and remaining acceptance gates

No original lesson text, original question/answer key, model answer or production student record was changed in this pass. Catalogue and chapter downloads now revalidate their HTTP cache so older catalogue metadata cannot silently disable newly installed practice features. Existing account routing, storage key, reset generations and native synchronization remain. New assessment fields and timetable snapshots use the same existing account progress mechanism.

The validation report records software checks. Automated tests and browser journeys do not establish scientific correctness, independent review or learner outcomes.

Remaining work is explicit:

1. Rebuild the **125 remaining lessons** where required; complete/independently assess all eight stages, diagrams, applications and topic-specific success criteria. The 16 drafts also still need scientific and pedagogical review.
2. Independently verify all original 141 lesson texts, 250 MCQs, 31 models and all new drafts/questions/rubrics. Complete explicit source-question mappings and balanced reviewed assessment coverage; no source key is silently corrected here.
3. Establish reviewed assessment evidence and a validated retention/readiness policy. Current self-ratings and source-key practice must not be renamed mastery.
4. Complete approved written-answer models/rubrics and the publication adapter before using the new drafts in normal student delivery. The provisional mock's written work is intentionally ungraded.
5. Validate every scientific visual; some units currently use labelled conceptual flows and visual specifications rather than a dedicated interactive model.
6. Validate planner estimates and performance adaptation with actual learners. Automatic missed-day rescheduling and review policies based on independently reviewed concept assessments remain incomplete; explicit rebalance is available.
7. Complete controlled authenticated preview/cloud/reset trials, full accessibility/real-device testing and sustained-history capacity validation. The existing account payload/local-storage limits still apply; history is not silently truncated.
8. Independently confirm curriculum mappings/paper provenance as appropriate, conduct beginner learner trials and measure actual learning outcomes.
9. Obtain the applicable scientific, educational and owner release approvals. The release hold remains active; no production deployment was performed or requested.
