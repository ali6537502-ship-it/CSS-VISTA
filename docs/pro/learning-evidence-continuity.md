# General Ability and guided-writing preparation continuity

14 October 2026, private candidate only. Production Pro remains paused. This completes a missing connection between existing course work, My Preparation and its evidence report; it does not replace any course or account storage.

## Audit finding and implementation

General Ability already had 25 topics, 75 exercises, 125 quiz questions, server-side deterministic marking, saved positions, compatible-edition recovery and owned history. My Preparation did not use those records to suggest further maths work or show course evidence. Its report also omitted the existing recent guided-writing workspaces. A weekly label described every later writing version as a rewrite, although saving a response at another guided stage also creates a version.

The private implementation now:

- Reads this student's first and latest exercise/quiz submissions, keeping retries separate. A corrected retry does not raise first-answer correctness; a new incorrect response remains a review task even when an earlier best score passed the topic.
- Offers a General Ability study block through existing reviewed daily-plan allocation, with a separate `ability` kind/lane and a 20-minute default block constrained by the existing budget/minimum/task cap. Planner rules are versioned `attempt-planner-v2`. Saved earlier plans, receipts and completed/partial work remain unchanged. New course evidence invalidates a stale proposal hash; reading the report never saves or replaces a plan.
- Adds **Continue General Ability** using the actual saved position (or a suggested next lesson if none exists). Review suggestions use the latest recorded errors and current bounded course order, not AI, invented scores or random question selection.
- Keeps an owned **Return to CSS … preparation** link across course, lesson, quiz, saved-work navigation and history pages. It validates the preparation reference through the existing account-owned API. A foreign/missing reference cannot display another student's attempt. Maths records remain account-wide; no attempt ID is added to old rows or sent to the grading API.
- Shows **General Ability — account-wide practice** with first exercise/quiz answers, retries, existing course completion and latest mistakes. It explicitly distinguishes correct responses from reading, saved positions and reported study minutes. Zero submissions show a useful empty state, not a readiness score.
- Shows up to six **Recent guided writing** workspaces for the selected attempt, with the selected level, recorded/total stages, next activity and a link to the saved workspace. Participation is not presented as AI assessment, mastery or examiner marks.
- Relabels the existing weekly counters **First / later saved writing versions**. Counter/storage compatibility is preserved; the interface no longer claims every later version is an independent rewrite.

## Data and access boundaries

No migration, new learning ledger, question edits, response rewrite or progress reset. `_ability_evidence.php` uses bounded first/latest rows per current-compatible unit/mode/lesson, ordered by server time and ID. Only unchanged units from the existing version mapping inherit older evidence; original earlier results remain in history. Invalid feedback is excluded explicitly and reported as unavailable, never converted into a correct response.

Course evidence and new continuation links require actual active Pro membership and an open release state on the server. They are absent for free/expired accounts and during the Pro hold. Renewal restores the same saved course data. Expired students keep the existing independent saved-history policy; free preparation reports remain available. Overdue Ability candidates are not newly proposed without course availability. Historical reported minutes can still be recorded without granting access or grading a question. Plan completion never writes the Ability response/position tables.

The existing schema initializer prepares Ability tables before any business transaction, following native schema conventions. It does not issue DDL inside an accepted plan save. Existing payload identities remain `attempt-planner-v1` for request recovery; the recommendation rule edition is separately v2. Existing human mentor results, Grammar records and source snapshots are not changed.

## Verification

- `php tests/ability/evidence-unit.php`: saved-position non-credit, first/retry/latest distinctions, restored mistakes, weighted quiz counts, invalid records and account scope.
- `node tests/planner/ability-evidence.mjs`: real native grading/ownership, positions and replay without duplicate credit, stale proposal rejection, immutable grades after reported plan minutes, unchanged compatible prior edition, shared account scope across two owned attempts, private/free/expiry/renewal/hold and no AI.
- `node tests/browser/learning-continuity.mjs`: actual wrong/correct answer controls, saved position, lesson/history/return links, preparation reports and guided response recording, second-device recovery, expiry/renewal, invalid reference, paused Pro and widths320/390/768/1024/1440. Real browser/native persistence; synthetic test accounts only.
- Existing planner, 25-topic Ability and release-pause native regressions; existing standalone Ability and connected-writing browser regressions; TypeScript, touched TSX lint, PHP syntax/pure planner checks and strict Hostinger artifact checks.

The first TypeScript check caught an optional query-parameter object's inferred undefined value; the object was explicitly typed as string parameters and validation rerun. No failed attempt is treated as successful validation. Final command outcomes, commit and CI are recorded separately in the draft PR/private report. A local build fingerprint is not production evidence.

## Remaining external work

The managed environment was rechecked on14 October: current enforced runtime, no provider secret/runtime variable/hosting identity. Real-model academic validation, representative handwriting/confirmed ground truth and actual-host cleanup remain unverified. Existing launch-policy questions are unanswered; PKR1,950/30days remains approved, while new caps/refunds/support/channel/retention proposals are still drafts. The CA/PA collection remains deliberately deferred. No general continuation instruction is treated as policy approval or permission to reopen Pro, collect payments, publish topics or merge into automatically deployed main.

Local final results: TypeScript/touched-component ESLint and changed PHP syntax passed; pure Ability evidence,225 planner assertions and skills checks passed; new native continuity and existing planner/all25-topic Ability/Pro-pause regressions passed; the complete new browser, standalone Ability browser and connected writing browser passed. The final report copy was checked at320–1440 and visually inspected. All seven native helper/endpoint files matched the strict local artifact. No genuine model call, production data or AI quota deduction was involved. Exact-head GitHub CI remains a separate post-commit check.
