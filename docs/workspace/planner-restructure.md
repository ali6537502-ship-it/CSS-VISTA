# Complete planner restructure

Base: `7712f780d68264941aed69314b62afcb5e56b6b3` on
`review/student-workspace`. Local implementation only; no remote write or deployment.
The previous planner repeated its schedule in three different components, concealed
settings with the syllabus editor, and linked “Study goals” to an application checklist.

## Implementation and compatibility

One reusable `PlannerWorkspace` serves `/account/tasks`, `/account/plan` and the
existing public `/study-planner`. Six addressable views use `?view=today|week|syllabus|revision|goals|settings`.
The legacy `/account/plan` defaults to Settings; `#plan-management` still opens Settings.
Existing subject/topic/unit deep links open Syllabus. Explicit views take precedence;
other query parameters, hashes, and browser history are retained by the main navigation.
No route was removed, redirected or added to bypass an existing guard.

| ID | Requirement | Implementation | Verification / status |
|---|---|---|---|
| P01 | One complete planner, six usable sections | PlannerWorkspace, StudyPlanner, account/Tasks | Six-view responsive browser journey; verified |
| P02 | Daily agenda, editable tasks, completion and history | PlannerDashboard, PlannerTask | Complete/refresh, failed storage write, reschedule with original ID, archive/restore; verified |
| P03 | Useful weekly planning | model, PlannerDashboard | Monday–Sunday dates, week navigation, selected-day subject/time/duration/status controls; date and workload tests; verified |
| P04 | Schedule creation and import | ScheduledSyllabusBoard | Manual task, parsed preview, original schedule-block contract, exact import deduplication and readback; verified |
| P05 | Full schedule settings and optional selection | PlannerSettings, existing validator | Native save and new-context restoration, valid/invalid selections, blank fresh target; verified |
| P06 | Integrated syllabus planning and coverage | FpscSyllabusPlanner | Original topic IDs, status mutation, linked task creation, duplicate avoidance, query/back, unavailable Punjabi/Essay details, retry; verified |
| P07 | Due/upcoming/reviewed revision and mistakes | PlannerRevision, existing progress selectors | Real review timestamps/intervals, category/status filters and manual reviewed check; verified with fixtures |
| P08 | Actual personal goals and notes | PlannerGoals, existing goalChecklist/quickNotes | Add/check/refresh and native synchronization, retained draft across views, explicit note save; verified |
| P09 | Native preparation plans remain connected | Continuation, preparation/Workspace and Plan, planner.css | Original native planner security and browser plan/partial-work flow; verified; rendered review recorded below |
| P10 | Data, access, release and advertisement boundaries | Existing store/accountSync/guards; scoped presentation only | Native planner security, original paid gate, existing account ad component only at its previous /account/tasks location; verified within executed scenarios |
| P11 | Keyboard, responsive and accessible presentation | planner.css, semantic links/forms, inline editors | Six widths, focus return and controls, automated accessibility review; results below |

Daily and weekly views read the same `activeStudyTasks` and archive state. Workload
is the sum of scheduled minutes, including completed tasks; it is explicitly an
estimate. Availability is the existing saved daily-hours preference. Overlap warnings
compare unfinished tasks with valid explicit times, without creating a new scheduler.
Rescheduling retains identifiers and history. The editor saves only fields changed
by the student and rejects conflicting changes to those fields. Every changed local
write is read back before showing success; failed writes keep draft inputs.

Settings use the established optional-group validator. Unknown saved selections
stay visible with an explicit correction action. The student target is not an FPSC
announcement; a fresh account starts with no assumed date. Native attempt settings
continue to support their existing **preparation shortlist**, which explicitly allows
incomplete choices; that separate contract was not replaced by the personal
schedule's validated examination selection.

The syllabus editor is reused, not copied. Completion joins keep original
`slug:section:item` identifiers. Its catalogue-wide counter is labelled as source
lines across all subjects; it is not an overall preparation percentage. Missing
structured details show unavailable states and legitimate source/guide links.
No subject/topic data or paper classifications were rewritten.

Revision groups come from existing `ReviewSchedule` records: dueAt <= now for Due,
dueAt > now for Upcoming, lastReviewedAt > 0 for Reviewed, ordered by actual dates.
Reviewed is not an assertion of mastery or permanent completion. The mistake
notebook's manual reviewed flag remains separate from successful retries. Existing
practice destinations perform assessment and review scheduling.

Personal goals and notes use existing `goalChecklist`, `setGoalChecklist`,
`quickNotes` and `setQuickNotes`. Optional suggestion checks retain
`planTaskCompletions` and the existing buildDailyPlan algorithm. Native preparation
attempts retain their existing APIs, optimistic versions, request receipts, proposal
review and trusted budget/revision logic. Their records are not destructively merged
with local timetable tasks.

No new dependency, storage key, database schema, authentication mechanism, entitlement
policy or release flag was introduced. No task is archived or removed automatically.
Full-schedule history remains accessible, with small task-list pages to avoid mounting every record at once. Global discovery recognizes the new planner tools.
Task creation is stopped before the existing 3,000-record limit could truncate earlier
records. Goal creation similarly respects the existing 100-goal limit.

## Executed verification

Executed commands and outcomes:

- `npm run lint`: passed with the one pre-existing Current Affairs Introduction
  useMemo warning. Changed planner/prerender/profile files also passed scoped
  ESLint with no warnings. No rule was disabled.
- `npm run typecheck`: passed. The production build repeats TypeScript checking.
- `npm run test:all`: passed, 311 Node tests plus the existing editorial Python
  test. Final search-discovery polish adds one focused test; the resulting
  `npm run test:workspace` passed all 11 tests. No test was disabled.
- `node scripts/build-target.mjs hostinger --strict`: passed production packaging,
  MPT release audit, static prerender, route/link/content/ad-policy audits. The
  final source checksum and delivery artifact are recorded in the logs below.
- `npm run test:routes`: all 17 direct-route/metadata/advertising tests passed.
- `docker --host=unix:///var/run/docker.sock exec cssv-workspace-native php tests/planner/unit.php`:
  225 assertions passed.
- `CI=true CSSV_DB_NAME=cssvista_briefing_test CSSV_TEST_PHP_CONTAINER=cssv-workspace-native node tests/planner/security.mjs`:
  passed ownership, account binding, CSRF, version races, exact receipt recovery,
  revision, histories, non-destructive legacy import, expired membership, owned
  evidence and zero-AI-dispatch checks.
- `CSSV_TEST_AXE=true CSSV_TEST_BROWSER_ORIGIN=https://localhost:3444 node tests/browser/planner-workspace.mjs`:
  passed the six-view scenario at 320/375/390/768/1024/1440, task failure/readback,
  original-ID edits, an independently changed status during a staged date edit,
  archive/restore, manual/import deduplication, goal/note persistence, revision
  filters, selection validation, syllabus status/scheduling, aliases/back/refresh
  and unrelated bookmark/writing/result retention. Automated WCAG-tagged checks
  reported zero violations in the six populated planner views at 390px.
- `CI=true CSSV_DB_NAME=cssvista_briefing_test CSSV_TEST_PHP_CONTAINER=cssv-workspace-native CSSV_TEST_BROWSER_ORIGIN=https://localhost:3444 node tests/browser/planner-native.mjs`:
  passed real native sign-in, an empty personal plan, attempt creation, explicit
  study-track selection, reviewed-plan saving, partial work, refresh and all seven
  native attempt views at 390/1440. Free Current Affairs access correctly stayed
  protected; its existing free Vistagram recovery link was exercised.
- The same environment ran `tests/browser/workspace-native.mjs`: passed personal
  task/goal and optional-setting save/refresh, explicit account sync, restoration
  in a fresh browser context with delayed API responses, existing timer continuity,
  security/profile navigation and sign-out.

The full suite initially exposed an actual regression: adding visible loading text
left the public syllabus prerender in a loading state. This was corrected by passing
its existing public JSON source into the build-only renderer. The browser still
loads it lazily. Public route tests then passed; no test was relaxed. An earlier
suite attempt against an artifact still being rebuilt was discarded and rerun only
after the build finished. Browser captures were also corrected to wait for real
view headings rather than transient loaders.

Rendered review included all six populated planner views on desktop/mobile and
captures at tablet width; native attempt planning, coverage, reading, evidence,
reviews, history and settings; fresh-account, syllabus loading/error/retry and missing
syllabus-detail states. Review caught and corrected supporting-text contrast, a
syllabus search-icon overlap, secondary-link spacing and a missing-photo fallback
in the shared account profile action. The final small profile picture continues to
use the existing private endpoint and account-binding behavior.

The main workflow was checked before final spacing/focus/discovery polish and again
against the final compiled artifact. The 11 focused workspace tests and the strict
build cover that final polish. The expensive unchanged assessment/content suites
are not evidence of live deployment or production-account testing.

Local evidence logs: `/tmp/cssv-planner-delivery-build.log`,
`/tmp/cssv-planner-acceptance-tests.log`, `/tmp/cssv-planner-review-unit.log`,
`/tmp/cssv-planner-review-lint.log`, `/tmp/cssv-planner-security.log`,
`/tmp/cssv-planner-native-units.log`. Final compiled review passed with exit 0:
`/tmp/cssv-planner-delivery-browser.log`,
`/tmp/cssv-planner-delivery-native.log`,
`/tmp/cssv-planner-delivery-routes.log` (17 passed), and
`/tmp/cssv-planner-delivery-unit.log` (11 passed).
`test-artifacts/planner-restructure/accessibility.json` records zero violations in
each of the six populated planner views. The source checksum remained unchanged
through the final build and browser review. No new API or dataset is loaded merely
to display a planner tab; syllabus and revision panels are lazy-loaded on first use. These logs are session-local;
this document and the regression tests are committed review evidence.
Fixtures are disposable and kept outside production source paths. Native records
use the isolated `cssvista_briefing_test` database and localhost runtime only.

Known limits: physical-device keyboards and landscape are not certified. Existing
public timer ownership across logout/account switch and a live offline/reconnect
conflict remain outside this planner presentation change. No production account was
used for testing. Automated accessibility checks are not a formal WCAG certification.

## Review and rollback

Main source: `src/features/planner/`, `PlannerDashboard`, `ScheduledSyllabusBoard`,
`FpscSyllabusPlanner`, the two existing planner route pages and preparation presentation.
Tests: `plannerWorkspace.test.ts`, `browser/planner-workspace.mjs`,
`browser/planner-native.mjs`, and the expanded native workspace journey.

Screenshots live in ignored `test-artifacts/planner-restructure/`. The `before/`
folder preserves the prior populated planner captures. New fixtures contain no
real student history. Native screenshots use clearly labelled disposable accounts.

Rollback: revert the planner interface commit and rebuild the earlier revision
through a separately authorized release. It needs no data clearing or migration;
all writes use record formats already readable by the earlier version. Goals,
notes, schedule edits and syllabus checks remain available to that version.
