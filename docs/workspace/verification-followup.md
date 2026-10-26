# Workspace preservation verification follow-up

Review base: `18368a78a86884ccf4ecae035b4fd41cef66af28`, branch
`review/student-workspace`. All account records used here are disposable fixtures
in `cssvista_briefing_test`, served over loopback HTTPS. Production was untouched.

## Issues found and corrected

The native browser account-switch scenario demonstrated that the existing
device-wide answer timer exposed the previous student's saved question to the next
student. `localStudySession.ts` now partitions single timers, full-paper recovery,
quiz recovery, mock registration names and research bookmarks by account. The
original academic progress sync, sessions, API authorization and schemas remain
unchanged. Timer and quiz components wait for authentication hydration and remount
their in-memory state when account identity changes. Late callbacks retain the
captured original owner.

The first authenticated transition binds old unscoped recovery to the existing
`cssvista:progress-owner`. Unowned legacy recovery remains guest data. Original
legacy keys and record bodies are retained. New device-only keys append
`:owner:v1:<account-id>` (or `guest`) to each affected key; values encode the original
string or an explicit null tombstone. The small
`cssvista:local-study-legacy-owner:v1` marker prevents reassignment of legacy data.
Binding/storage failures fail closed for unowned authenticated recovery. No session
record is uploaded to the cloud by this addition. Audio/wake preferences remain
the existing device preferences.

A second browser failure showed a returning daily quiz without its saved resume
offer. The seeded sampler had assembled its pool in network-completion order.
`data/mcq.ts` now preserves catalogue order across parallel responses. Existing
same-day daily recovery can rebuild its saved question IDs in their original order
through the original access-aware loaders. Questions, grading, marks and assessment
algorithms are unchanged. A regression test reverses shard response timing and
compares the actual generated question IDs.

Reopened MCQs now display their actual saved state, including an accessible pressed
state and an Unsave label; the state refreshes on existing progress/sync events.
Research bookmark writes are read back before showing success and expose a
recoverable error if local persistence fails.

An additional native race test reproduced an old quiz response adding a “Saved
Questions” activity to the next account's history. `GKQuiz` now checks the existing
native account identity before applying resolved questions, recording activity,
accepting answers or finalizing a result. The same delayed-response test then passed.
This leaves trusted API enforcement and grading unchanged.

The populated Performance capture also exposed personal-task completion being
counted as syllabus progress. The original store deliberately uses one status
dictionary for source-topic tasks, personal tasks and imported schedules. The shared
presentation selector now counts completed source-topic identifiers in the existing
`slug:section:item` format, excluding `manual:` and import identifiers. This is a
count of saved source-topic checks across recorded selections, not a percentage of
the current official catalogue or assessed mastery. Task status semantics, stored
identifiers and historical records are untouched. Unit and native populated-page
checks cover the distinction.

## Verification scope

The executable evidence is `tests/browser/account-continuity.mjs`,
`tests/localStudySession.test.ts` and `tests/quizRecovery.test.mjs`, alongside the
existing timer, workspace, route and membership regressions. Final scenario results
and remaining environment limits are recorded below. The first timer isolation run failed
with the previous account’s private question; its correction was then exercised
through A→B→A restoration. The later daily-resume failure was corrected without
clearing its saved answer record.

| ID | Remaining requirement | Location / verification | Status |
|---|---|---|---|
| V01 | Account-isolated single and paper recovery | AnswerTimer / native A→B→A browser journey | Verified with disposable native browser fixtures |
| V02 | Offline local writes and reconnect | Original AccountProvider / native task completion, failed background flush, remote readback | Verified with disposable native browser fixtures |
| V03 | Failed sync save and retry | Original native progress API / intercepted PUT 503, local retention, successful retry | Verified with disposable native browser fixtures |
| V04 | Conflict semantics and record retention | Original hostingerSync merge / independent remote goal and conflicting task status | Verified with disposable native browser fixtures |
| V05 | Late response after account change | Original account-binding checks / native A response delivered after B hydration in same document | Verified with disposable native browser fixtures |
| V06 | Bookmark→library→reopened resource | Existing MCQ and research destinations / save, reopen, refresh and A/B isolation | Verified with disposable native browser fixtures |
| V07 | Daily quiz recovery and isolation | GKQuiz / saved answer resume, account switch; reversed-shard unit regression | Verified with disposable native browser fixtures |
| V08 | Complete mock→record→performance→sync | Existing PMS GK flow / PKT clock fixture, 100 answers, refresh/resume, native remote result | Verified with disposable native browser fixtures |
| V09 | Landscape, touch and reduced viewport | All seven account sections / Chromium emulation at 390×844, 844×390, 768×1024, 1024×768 and 390×420 | Verified with disposable native browser fixtures |
| V10 | Production artifact and regressions | Strict local packaging, original full test suite, lint and timer browser regression | Verified; results below |
| V11 | Latest official FPSC source | Official syllabus page, linked official PDF and alternate canonical host | Blocked: outbound upstream TLS certificate verification failure (HTTP 503) |
| V12 | Physical devices and OS keyboard | Requires actual Android/iOS hardware; unavailable in this executor | Blocked: hardware unavailable |
| V13 | Optional guidance and shortcut discovery with keyboard | workspace-guidance.mjs / Space/Enter, five real destinations, persisted dismissal and pins | Verified with a fresh native fixture; no academic history seeded |
| V14 | Late quiz response and metric separation | quiz-account-race.mjs; completedSourceTopics/shared snapshot | Native late-response regression passed; source-topic selector unit regression passed; populated-page zero-source-progress assertion passed in final continuity run |

Executed local checks:

- `npm run test:all`: 321 Node tests and 5 Python tests passed, zero failures,
  after the final ownership and metric fixes. The implementation checksum stayed
  unchanged throughout final verification.
- `npm run lint`: zero errors; one pre-existing `Introduction.tsx:116`
  React useMemo dependency warning. Changed files passed scoped ESLint without warnings.
- `node scripts/build-target.mjs hostinger --strict`: passed, including TypeScript,
  MPT release audit, prerender and route/link/content/advertisement audits.
- `npm run test:routes`: 17 passed against the finished delivery artifact.
- `node tests/browser/answer-timer.mjs`: passed signed overtime, pause, original
  paper clock restoration, full-paper allocation, wake-lock fixture, malformed
  recovery and narrow layout checks against that artifact.
- `node --test tests/localStudySession.test.ts tests/quizRecovery.test.mjs`:
  8 focused ownership, preservation, failed-storage and deterministic-sampling
  regressions passed; also included in the full suite's workspace script. The final
  workspace script passed 20 tests, including the personal-task/source-progress distinction.
- `CI=true CSSV_DB_NAME=cssvista_briefing_test CSSV_TEST_PHP_CONTAINER=cssv-workspace-native node tests/browser/account-continuity.mjs`:
  all eight native browser scenarios passed against the final compiled artifact.
  The mock was answered in full, resumed after refresh with its original deadline,
  recorded exactly once, displayed in Performance and confirmed through native sync.
- `CSSV_TEST_AXE=true CSSV_TEST_BROWSER_ORIGIN=https://localhost:3444 node tests/browser/planner-workspace.mjs`:
  passed all six planner views at 320/375/390/768/1024/1440, including task failures,
  editing, archive/restore, imports, goals, notes, revisions, optional settings,
  syllabus tracking, aliases/history and preservation of unrelated records.
  Six populated planner accessibility scans reported zero violations.
- The same disposable native environment, with `CSSV_BROWSER_EXECUTABLE=/usr/bin/chromium`
  and `CSSV_TEST_BROWSER_ORIGIN=https://localhost:3444`, ran `tests/browser/pro-pause.mjs`:
  passed active-entitlement-under-pause behavior, fourteen protected direct routes,
  hidden paid links, unchanged membership expiry and retained free Grammar/Vistagram.
  Its temporary pause is confined to the disposable database and restored by the test.
- `CI=true CSSV_DB_NAME=cssvista_briefing_test CSSV_TEST_PHP_CONTAINER=cssv-workspace-native node tests/browser/quiz-account-race.mjs`:
  the exact late-quiz race that failed before the fix passed against the final
  compiled artifact; no saved-quiz activity appeared in the next account.
- The native environment also ran `tests/browser/workspace-guidance.mjs`: passed
  keyboard dismissal/reopening after refresh, all five real guidance destinations,
  no falsely completed stages or seeded academic records, feature search, persisted
  pin/unpin and keyboard query clearing. Scoped ESLint passed for both new browser tests.

Session-local final logs: `/tmp/cssv-checks-final-delivery-all.log`,
`/tmp/cssv-checks-final-delivery-build.log`, `/tmp/cssv-checks-final-continuity.log`,
`/tmp/cssv-checks-final-quiz-race.log`, `/tmp/cssv-checks-final-repository-lint.log`,
`/tmp/cssv-checks-final-progress-unit.log`. Earlier supplementary evidence:
`/tmp/cssv-checks-repository-lint.log`, `/tmp/cssv-checks-delivery-lint.log`,
`/tmp/cssv-checks-delivery-build.log`, `/tmp/cssv-checks-delivery-routes.log`,
`/tmp/cssv-checks-delivery-timer.log`, `/tmp/cssv-checks-recovery-units.log`,
`/tmp/cssv-checks-delivery-continuity.log`, `/tmp/cssv-checks-delivery-planner.log`,
`/tmp/cssv-checks-delivery-pro-pause.log`, `/tmp/cssv-checks-delivery-guidance.log`.
An earlier full-suite invocation overlapped an in-progress artifact rebuild and
reported missing generated routes. It was discarded, then the complete suite
passed against finished generated files. No route check was weakened or disabled.

Local ignored review artifacts: `test-artifacts/account-continuity/results.json`,
the populated mock Performance capture, settings portrait/landscape captures and
the 390×420 task view. Screens were inspected after real content loading; these
are sanitized fixtures. `test-artifacts/planner-restructure/accessibility.json`
and the six-view planner captures were refreshed against the delivery artifact.
Browser emulation verified actual navigation, touch targets and task submission;
it is not evidence of a physical device or live production workflow.

Offline testing covers an already loaded page and local work followed by
reconnection. The existing application has no offline document cache. A full reload
or a navigation requiring a clean ad-free document needs connectivity; advertising
boundaries were retained. Conflict verification preserves the established local-wins
merge for matching record IDs while retaining independent remote records; no new
conflict-resolution policy is claimed.

Touch, orientation and reduced viewport checks use automated Chromium. They are not
physical-device or real on-screen-keyboard certification. Research publisher URLs
are validated as destinations; external publisher content is not visited by the
isolated browser fixture. Suspended MPT remains suspended; its direct legacy route
is checked without changing a release flag.

## Release and rollback

No remote write, release flag change, payment/AI activation or production deployment.
No dependency or database migration. Original primary progress records remain
readable by earlier revisions. New owner-scoped recovery is additive and is not read
by the older unsafe timer implementation. To roll back visual changes, retain this
account-isolation patch; do not restore the demonstrated shared-device exposure or
clear the new recovery keys. An older unpatched binary cannot be called a lossless
rollback for newly saved in-progress timers. Original legacy recovery remains intact.
