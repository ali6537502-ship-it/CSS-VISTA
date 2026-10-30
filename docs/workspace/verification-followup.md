# Workspace preservation verification follow-up

## Full workspace verification — 27 October 2026

Starting revision: `9c221f9a642cd2b41f924a22f19e7101f64f3345`, clean
`review/student-workspace` branch. This review covers the complete dashboard,
planner, subjects, practice, performance, library, settings, photo and single-page
signup work. Tests use disposable native PHP/MySQL accounts and Chromium against
compiled loopback HTTPS, with off-origin requests blocked. No production student
account or record was used. No deployment, remote write or workflow dispatch ran.

Two issues were found and corrected during this verification:

- `ProfileGate → accessForm → Current Affairs model` unnecessarily pulled Zod and
  its feature schemas into the initial dashboard bundle. The unchanged
  `safeReturnTo` policy now lives in `src/lib/safeReturnTo.ts`; the Current Affairs
  module re-exports it for compatibility. Existing return-path security tests pass.
- The new whole-workspace native accessibility scan exposed low-contrast subject
  metadata, shortcut badges, performance supporting text and decorative resource
  labels. `workspace.css` now uses opaque/darker text, shared ink for resource
  labels and larger small subject labels. No information, controls or checks were
  removed. Diagnostic scans and the subsequent actual compiled-artifact scans both passed; final results follow.

The added `account-recovery.mjs` exercises successful browser recovery by code and
by reset link using real captured native messages. Both revoke the old session,
retain saved profile/bookmarks/results, preserve return query/hash and reject
replay. Link tokens are removed from the browser fragment. This verifies the
application and local mail handoff, not real external SMTP or inbox delivery.

### Requirement coverage

Existing detailed locations/inventories: [implementation](implementation.md),
[planner restructuring](planner-restructure.md), [visual design](visual-redesign.md)
and [single-page signup](signup-flow.md).

| ID | Requirement and implementation | Executed evidence / status |
|---|---|---|
| F01 | Seven connected sections, routes, navigation and genuine empty/error states; StudentWorkspace, account pages | workspace, workspace-visual, native workspace, routing and strict route/link audits: verified |
| F02 | Daily continuation, saved tasks, actual metrics and date handling; AccountHome, shared selectors | workspace/task fixtures, native task save/refresh, original date/metric tests: verified |
| F03 | Six compulsory slots, explicit alternative, saved optionals and both sample/other valid combinations; catalogue adapter, original validator | workspace/subject unit tests and browser selection/refresh: verified implementation; current official FPSC source recheck blocked |
| F04 | Full planner and existing preparation attempts; PlannerWorkspace, native preparation workspace | Six personal views at six widths; seven native attempt views, partial work and history: verified |
| F05 | Practice, quiz/mock/result/performance and active timers | answer-timer, account-continuity and quiz-account-race; actual native result readback: verified |
| F06 | Saved library, feature search, shortcuts and optional guidance | bookmark reopening/account isolation, keyboard search/pins/dismiss/reopen: verified |
| F07 | Single-page signup, profile, private photo and security | signup, avatar, native account security and successful browser code/link recovery: verified |
| F08 | Native persistence, offline/reconnect, conflicts, failed writes and account switches | Eight account-continuity scenarios, native planner/learning/reading ownership and writing versions: verified |
| F09 | Guest/free/active/expired/paused permissions, trusted API/file guards, MPT and advertising restrictions | pro/security, paid-access, paused browser routes, MPT units/flag and compiled no-ad/noindex routing: verified |
| F10 | Desktop/mobile layouts, readable controls, keyboard and accessible charts | Six-width interactions, touch/landscape/reduced viewport; fourteen populated native page/viewport scans: verified |
| F11 | Build, lint, type safety and existing regression suite | 330 Node + 5 Python tests; 14 focused account/Current Affairs tests; typecheck, lint and strict audits: verified |
| F12 | Comparable performance with preserved loading behavior | Same six-run original/current benchmark; final measurement recorded below |
| F13 | Physical devices, actual inbox delivery and production cross-device certification | Explicit limits below; not claimed as verified |

### Executed commands and evidence

- `npm run test:all`: **330 Node + 5 Python passed**, zero failures, repeated after
  the redirect import fix. The subsequent presentation change is CSS only.
- `node --test tests/currentAffairs.test.ts tests/accountSetup.test.ts`: 14 passed.
- `npm run typecheck`, `npm run lint`, scoped ESLint and
  `node scripts/check-profile-contract.mjs`: passed. Full lint retains the one
  existing `Introduction.tsx:116` hook warning. No test or lint rule was disabled.
- `npm run verify:hostinger:strict`: passed again after the final
  contrast/typography fixes. Executed audits cover 115 registry routes,
  1,025 sitemap URLs, 63,953 links, genuine 404s, private/no-ad documents,
  duplicate content and frozen MPT export. Existing build warnings remain.
- PHP units: `tests/pro/unit.php`, `learning/unit.php`, `planner/unit.php` (225
  assertions), `reading/unit.php` (21), `topics/unit.php` (51), `mpt/unit.php`
  (24,920 passed), `mpt/flag.php`, `pro/release-unit.php` and
  `account-native/mail-config.php`: passed in the disposable container.
- Native integration: `tests/account-native/security.mjs`, `tests/pro/security.mjs`,
  `pro/paid-access.mjs`, `planner/security.mjs`, `reading/security.mjs` and
  `learning/security.mjs`: passed. No real provider calls or payment occurred.
- Browser harnesses executed successfully: `workspace.mjs`, `workspace-visual.mjs`,
  `planner-workspace.mjs` (`CSSV_TEST_AXE=true`), `workspace-avatar.mjs`,
  `answer-timer.mjs`, `runtime-routing.mjs`, `signup.mjs`, `account-recovery.mjs`,
  `workspace-native.mjs`, `planner-native.mjs`, `workspace-guidance.mjs`,
  `account-continuity.mjs`, `quiz-account-race.mjs` and `pro-pause.mjs`.
  Account, visual/native workspace and pause/routing journeys were rerun against
  the artifact containing the redirect import fix. The final contrast artifact
  additionally passed the six-width workspace journey, seven-section visual
  review, runtime routing and fourteen populated native accessibility scans.
  These final scans use the actual built stylesheet without diagnostic overrides.
- Automated review includes six populated planner views and two signup states
  with zero reported violations. The broader native scan found the issues above;
  the failing evidence is retained, not relabeled as passing.

All fourteen source-style diagnostics cover populated pages and actual profile
fields at 390/1440. Browser interactions also cover 320/375/390/768/1024/1440,
portrait/landscape and reduced-height 390×420. Rendered screenshots were inspected
for all seven sections and the weekly/native planners, including loading, error,
sanitized records and actual saved-profile controls. No formal WCAG certification
is claimed. Current review artifacts and exact command statuses are under ignored
`test-artifacts/final-verification/`; logs are copied there before delivery.

### Final comparable performance

`CSSV_PERFORMANCE_BEFORE=/workspace/cssv-performance-before/dist node
 tests/browser/workspace-performance.mjs` passed after all other browser work
finished. Three interleaved cold-context runs per build use original
`13091aed6355556a5aceae8d4c9efe774cbee6ad`, the current artifact, identical sanitized
free-account APIs, 390×844, 4× CPU slowdown, 100ms latency, 400KiB/s download,
100KiB/s upload and disabled cache. These are local uncompressed artifacts.

| Median | Original | Final |
|---|---:|---:|
| Initial route JS/CSS body bytes | 966,071 | 895,280 |
| JS/CSS requests | 25 | 21 |
| Observed resource requests | 37 | 32 |
| Useful dashboard heading | 5,142ms | 4,631ms |
| Observed LCP | 1,748ms | 1,956ms |
| Observed CLS | 0.0095 | 0.0194 |

Initial route code is **7.33% smaller** than the original.
The diagnostic artifact before the redirect-import correction transferred 985,968
JS/CSS bytes; the final artifact transfers 895,280. Current main JS/CSS remains
41,806 bytes larger than the original main entry, while the route needs fewer
subsequent modules/requests. Observed LCP was 208ms later, while useful dashboard
content appeared 512ms earlier. LCP ranges were 1,744–1,792ms before and
1,896–2,000ms after; heading ranges were 5,108–5,344ms and 4,532–4,716ms.
The richer interface's critical entry remains a refinement opportunity; these
three-run fixture observations do not establish production timings or a general
speed guarantee. No protected datasets or unexpected APIs loaded in the benchmark.

Raw per-request/shift data: `test-artifacts/workspace-performance/results.json`.
The actual pre-correction artifact is retained in
`test-artifacts/final-verification/performance-before-helper-fix.json`.
All 813 source-file hashes matched the final build input after browser validation.

### Fixture corrections and safety

An initial native request raced the disposable server restart. A later native
account test correctly reported that the local Pro fixture's private configuration
was writable, whereas this existing account harness expects environment-only,
non-writable configuration. Its original assertion remains intact: it passed using
an additional loopback PHP runtime on port 4178 with environment-only test mail.
`CSSV_TEST_ACCOUNT_API_ORIGIN` is loopback-only and defaults to the original URL.
Fixture accounts now have unique emails; no prior account was deleted to rerun it.
A repeated recovery run also hit the genuine native rate limit. Only guarded
fixture counters were prepared; no limiter was disabled. The signup preparation
helper now supports narrowly scoped prior `recovery-browser-…@example.invalid`
TEST ONLY reset-request counters, checks CLI/CI and the actual database, and retains
all accounts, academic records and unrelated security events.

Local mail uses the existing invalid-domain-only `mail-capture.php`; the new
read helper additionally checks the actual test database and mailbox prefix.
Temporary test mail/config settings were restored after the final runs; the
original native session API returned HTTP 200 and the fixture mail transport
returned to its original unconfigured state. The additional mail runtime stopped. They
were never applied to production. Avatar fixtures now trust the loopback runtime's
self-signed test certificate; no production TLS verification changed.

### Verification boundaries

- Official FPSC page, alternate canonical host and both repository-linked PDF URLs
  all returned HTTP 503 with upstream TLS certificate verification failures. No
  TLS check was bypassed and no examination source was rewritten. Current official
  re-verification needs a working authoritative source connection or official PDF.
- No physical iOS/Android device or actual on-screen keyboard is attached. Chromium
  touch/orientation/reduced-height checks are emulation, not hardware certification.
- No configured real test mailbox/SMTP service is available. Captured-message
  recovery passed; external delivery, spam routing and inbox receipt remain unverified.
- Native cross-session restore and synchronization passed using separate contexts
  and actual disposable records. Live production cross-device write tests were not
  run because this assignment prohibits modifying production student data.
- Read-only production checks returned account-page HTTP 200 and deployment SHA
  `815e3fcefd61c62bffc7a5d7858593621757d215`; that is a different revision from this
  review branch. These checks are not live verification of the new interface.

The final diff contains no data schema, authentication/session, entitlement,
payment/provider configuration, release-flag or persisted academic-format changes.
Revert this verification follow-up to restore prior styling/imports; all saved
records remain compatible and require no clearing or migration. Keep the earlier
account-isolation fixes described below. Deployment still requires separate
explicit authorization and the established release procedure.

## Earlier preservation investigation

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

## Subsequent account-entry follow-up

The single-page native signup (superseding the four-step form), private photo
preparation, fixture checks and historical original/current dashboard benchmark
are recorded in [signup-flow.md](signup-flow.md). The benchmark supersedes the
earlier absence of a comparable performance baseline; physical-device and
official-source limitations remain explicit.
