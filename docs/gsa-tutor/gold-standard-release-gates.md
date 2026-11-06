# General Science Tutor — Gold-standard learning and release gates

**Status:** Educational preview. This checklist is not an approval to deploy.  
**Official scope:** General Science, Part I (60 marks), within the 100-mark General Science & Ability paper. Part II (General Ability, 40 marks) is a separate component.  
**Official reference:** https://www.fpsc.gov.pk/Syllabuses?section=CSS+Syllabi

## 1. Existing asset inventory

- 28 chapters and 141 numbered lessons, based on the General Science manuscript dated 29 October 2026.
- 250 original manuscript MCQs and 31 analytical model answers.
- The current practice-matching algorithm connects at most one chapter MCQ to a lesson. The 5 November code audit matched only 102 of the 141 lessons; 39 had no lesson-level matched question.
- Only two purpose-built interactive visual models are currently installed: seasons and Moon phases.
- **No automated format or build check certifies scientific accuracy.** The 30 October editorial review explicitly withheld publication approval: `docs/gsa-tutor/educational-release-review.md`.

## 2. Non-negotiable content acceptance

Each chapter must receive an editorial record with reviewer, date, manuscript edition, FPSC syllabus mapping, primary references, issues found, corrections applied, and approved revision.

**A chapter passes only when:**

1. Every statement of science, formula, unit, numerical example, date and factual attribution has been checked against suitable authoritative sources; any uncertainty is documented.
2. All relevant FPSC Part-I syllabus topics are mapped to reviewed sections, including topics absent or underdeveloped in the current manuscript.
3. Explanations preserve correct scientific terminology while defining unfamiliar terms in plain language.
4. Each major mechanism includes a logically ordered explanation and a worked or observable example; claims of effectiveness or predicted outcomes have cited sources.
5. Diagrams are pedagogically necessary, scientifically accurate, labelled, accessible and not misleadingly presented as being to scale.
6. Every factual correction is made in the source manuscript before regenerating chapter JSON. No silent divergence between the reference book and the tutor.

## 3. Lesson acceptance

For each of the 141 numbered lessons, reviewers must check:

- Clear learning objective, prerequisite explanation where required, and a plain-language entry point.
- Accurate definition, scientific mechanism, causal explanation, and at least one appropriate example where useful.
- Relevant misconceptions with corrective explanations (not invented distractors).
- Verified, lesson-specific concept checks with plausible choices and one unambiguous answer.
- A closed-book recall task with reviewed success criteria; subjective self-rating must never be labelled independently verified mastery.
- Accessible and responsive reading/diagram layout; equations render legibly on mobile.
- Source provenance, revision date, and an explicit editorial-approved state.

Do not force ornamental animations or artificially long lessons. The unit should be complete **for its learning objective**, not for a fixed word count.

## 4. Question-bank and assessment gates

- Review all 250 imported questions for science, four-option validity, ambiguity, distractor plausibility, question-to-concept mapping, explanation quality and answer correctness.
- Replace unreviewed keyword-only question-to-lesson links with explicit, editorially checked `lessonId`/`conceptId` metadata.
- Provide reviewed lesson checks for the currently uncovered lessons, especially thin chapters 6 and 14. Do not represent generated or manuscript questions as authentic FPSC past-paper questions.
- Preserve each practice attempt with its date, full set of responses, correct count and number attempted; retain earlier attempts and exact missed-question review links.
- Provide distinct diagnostic, recall, applied/scenario and timed chapter-examination modes where meaningful.
- Compare examination practice against authentic FPSC paper patterns before claiming examination alignment.
- Written answers need topic-specific scoring criteria, verified model explanations, and unambiguous human-vs-automated feedback labels.

## 5. Honest learning-progress model

Use separate fields for:
- **Studied:** learner has completed a reading and recall workflow.
- **Self-rated clear:** learner selected understanding after comparing their explanation; this is not scientific mastery certification.
- **Needs revision:** a learner flagged the topic, or a relevant understanding check was missed.
- **Demonstrated mastery:** only after passing appropriate, reviewed, independently scored understanding checks.
- **Practice attempt:** an immutable session for a question set, retaining previous attempts.
- **Missed question:** exact question ID, resolved by a later successful response; never substitute the chapter's first lesson.

Cross-device conflict rules must preserve newer corrections, user-initiated bookmark removals, reset generations and account isolation.

## 6. Personalized timetable and revision

- Accept learning availability and rest days, not just the total number of calendar days.
- Balance the actual lesson and practice burden; word count alone is not a reliable time estimate.
- Create explicit revision sessions using a documented policy rather than merely describing longer plans as having revision time.
- Adjust future sessions after missed lessons, failed checks, absence or timetable changes without deleting historical work.
- Keep dates consistent with the learner's selected timezone and handle rescheduling across devices.
- Show what was scheduled, studied, missed, mastered and still due; never imply that a topic is mastered solely because its page was opened.

## 7. Experience and accessibility

- Responsive checks at 320, 375, 768 and 1440 pixels, including browser zoom and reduced motion.
- Keyboard-only access to controls, focus management in the reference dialog, accessible diagram labels and clearly distinguishable correctness feedback.
- Single logical navigation hierarchy and no horizontal overflow at supported widths.
- Handle missing chapter downloads, blocked storage, interrupted sessions, mixed cached assets and account switches without marking unsaved work as saved.
- Measure first-chapter load, navigation response and mobile scrolling; impose budgets only after recording repeatable baseline measurements.

## 8. Verified testing and release decision

**Automated:** `npm run test:gsa-tutor`, `npm run typecheck`, `npm run build:hostinger`, `npm run audit:routes`, broader account regressions, and browser tests.  
**Manual:** signed-in protected-preview tests for account switch, cross-device sync, reset, reschedule, question retest, offline failure, form/keyboard accessibility, scientific models and mobile layouts.  
**Editorial:** chapter-by-chapter and question-by-question sign-off with source logs.  
**Release:** owner approval after all above gates. A passing build is not sufficient to claim educational reliability.

**Rule:** Never deploy an unreviewed content revision, overwrite learner records, silently change a source answer key, or claim the tutor has been fully verified without supporting evidence.
