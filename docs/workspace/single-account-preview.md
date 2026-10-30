# Single-account workspace preview

Prepared 30 October 2026 on `review/single-account-preview`, starting from the
completed workspace branch `3bef0a4e0baf46f6ede3c50b77693a3de8bd64ba`.
Production main `90665d40e1a37acf50253d6fea4c9963c58ed536` was merged without
conflicts as `0dfc80d7397d1882a9524a1e9394fa9def2f8efb`, retaining its newer
published content and Lucky Draw features. Read-only live fingerprint and health
checks confirmed that main revision and a responding PHP runtime before changes.

## Scope and contracts

- Only the approved email's authenticated native account selects the new
  workspace. The backend stores its normalized SHA-256 digest; the public feature
  registry, HTML, client bundle and selector response do not contain the address.
  The existing session determines identity; request parameters, browser storage
  and client-supplied email cannot select a different account.
- Native registration intentionally does not require email confirmation. This
  presentation selector follows that established policy. It does not introduce
  confirmation requirements, grant membership or bypass profile completion.
- Other accounts and guests retain the production account, planner, profile and
  syllabus presentations copied from the inspected main revision. These temporary
  compatibility modules share the same authentication, stores and native APIs.
  There is no second task database or academic state.
- Public signup remains the established production flow during this account-only
  pilot. The single-page registration component remains available to the selected
  signed-in account's incomplete-profile gate; this pilot does not release a new
  signup experience to every guest.
- The client decision exists only in memory, is bound to the current account
  identity, ignores late responses and is discarded at logout/account changes.
  The selector response is GET-only, no-store and bound to `X-CSSV-User` using the
  existing native enforcement. Failed or timed-out selection returns a usable
  classic interface. No academic defaults are written by the selector.
- The classic profile's appearance is preserved while its controller uses the
  shared safe full-profile write adapter. Unedited imported lists, independent
  field updates and drafts survive; conflicting edits require review/retry.
  Required previous-student history is available before the first profile save.
- No schema, password, academic identifier, membership evaluator, timer/scoring
  algorithm, payment configuration, Pro hold or MPT hibernation flag is changed.
  Existing shared account-isolation/session-recovery fixes from the workspace
  branch remain in both versions.

## Requirement map

| ID | Implementation | Verification | Status |
|---|---|---|---|
| P1 Single-account selection | `public/api/_workspace_preview.php`, `auth/workspace-preview.php` | Pure PHP rules; real native guest/selected/other/expired sessions, wrong owner, method, privacy/cache headers and kill switch | Verified locally |
| P2 Existing UI retained | `src/features/workspace-classic/`, `App.tsx`, shared presentation wrappers | Other-account dashboard and legacy routes; direct new-category recovery; guest cannot opt in | Verified locally |
| P3 Seven-section pilot and responsive navigation | Workspace provider/variant, `Layout.tsx`, existing workspace components | Seven sections at 320, 375, 390, 768, 1024 and 1440; no horizontal overflow or duplicate public mobile nav | Verified locally |
| P4 Data continuity | Existing account sync/store/native APIs; classic profile adapter | Task save/refresh/sync, sample optional settings, fresh-context restore, goals, timer navigation/refresh, classic profile merges/conflicts/failure drafts | Verified locally |
| P5 Account isolation and failure | `WorkspacePreviewProvider.tsx` | Real logout/login to another account, late selected-account response, API failure, kill switch, no previous task/bookmark/result exposure | Verified locally |
| P6 Access restrictions | Unchanged native Pro/MPT guards and release controls | Selected and classic active Pro fixtures remain free-only during pause; fourteen direct paid routes blocked; MPT redirect/fixture checks | Verified locally |
| P7 Accessibility | Existing workspace styling, lazy shell | Fourteen populated native page/viewport scans with zero automated violations; keyboard focus and overflow checks | Verified locally; not a formal WCAG certification |
| P8 Global modern signup | Preserved `RegistrationForm` and prior full-release `signup.mjs` | Guest remains classic in pilot; complete future global signup flow not rerun under this deliberately restricted release | Not applicable to account-only activation |
| P9 Live account activation | Reviewed source/build and release procedure below | Requires deployment fingerprint and the owner's own authenticated browser confirmation | Not activated by this local preparation |

## Executed validation

All native tests used only the disposable `cssvista_briefing_test` database and
invalid-domain fixtures. External browser requests were blocked. No live student
record, production secret or infrastructure setting was used or changed.

- `npm run typecheck`: passed. `npm run lint`: zero errors; the existing
  `Introduction.tsx:116` memo dependency warning remains. Focused lint also passed.
- `npm run test:all`: 314 Node tests and five Python tests passed; none failed or
  were skipped. Existing route/navigation/subject/intelligence/planner/timer
  regression coverage remains enabled.
- `npm run verify:hostinger:strict`: passed, including production build, source
  content gates, exact MPT exported-paper audit, 116-route compatibility audit,
  65,802 internal links and search/duplicate-content audits. The existing chunk
  size warning remains. The backend selector was additionally syntax-checked and
  retested after aligning it with native confirmation-optional sign-in policy.
- `php tests/workspace-preview/unit.php`: seven matching/fixture-isolation checks
  passed. `node tests/workspace-preview/security.mjs`: real native selector cases
  passed. The configurable fixture target is inaccessible outside CI and the
  actual named disposable database.
- Existing PHP planner (225 assertions), reading (21 assertions), learning and
  membership unit commands passed.
- Browser commands passed: `workspace-preview.mjs`, `classic-profile.mjs`,
  `workspace-native.mjs`, `planner-native.mjs`, `workspace-accessibility.mjs`,
  `pro-pause.mjs` and the six-width `workspace.mjs` presentation fixture.
  The selected incomplete-profile case also loaded every setup section in one
  window, rejected academic API access until completion and retained saved work
  after finishing setup. The first classic-profile test run used a modern success-message expectation;
  it was corrected to assert the preserved production message and rerun passing.
- The new selector/security/browser checks are added to the existing isolated
  `pro-foundations.yml` CI job. This document records local execution, not a
  claim that a remote Actions run has occurred.

Local screenshots and machine-readable results are under
`test-artifacts/workspace-preview/`; further native planner, accessibility and
paused-access evidence uses the existing artifact directories. All are synthetic
fixtures and remain outside Git. Comparable selected/classic dashboard screenshots
were inspected. See earlier [workspace verification](verification-followup.md)
for broader redesign evidence and the outstanding official-source, physical-device
and external-mail checks; those are not replaced by this pilot's local tests.

## Release and rollback

Repository workflow triggers were inspected: the Hostinger build/production
fingerprint workflow runs for main pushes; pull requests run validation. The
one-time database bootstrap is manual and must not be dispatched. The external
Hostinger Git integration settings are not accessible in this environment.

The account-specific selector is backend code, so the existing live build cannot
activate it through a browser toggle. Release the tested source through the
existing approved Hostinger code deployment, preserving private configuration and
storage. Check that current main still matches the reviewed base; if it advanced,
merge its changes and rerun relevant checks before release. Confirm the exact
deployed SHA in `/deployment-fingerprint.json`, health, unauthenticated selector
rejection and public/paused routes. The owner must then sign in normally to confirm
the personal dashboard; never request their password or modify their records.

The optional private runtime kill switch `CSSV_WORKSPACE_PREVIEW_ENABLED=0` returns
all accounts to the classic interface after refresh. This is the preferred
rollback: current account-isolated timer/quiz recovery and native synchronization
continue running. No production setting has been edited. The selector adds no
persisted schema or dashboard-selection preference to migrate or erase.

Do not revert only the pilot gate: its local parent is the redesigned workspace,
which would expose the new interface globally. Do not restore an older production
client without retaining the account-isolation compatibility fixes: its timer
reader cannot read the newest owner-scoped device recovery records. Those records
remain preserved, but an older client would offer stale legacy recovery instead.
Returning the presentation to classic via the kill switch avoids that problem.
Never clear browser storage, reset progress or roll back the database. The UI
rollback does not reopen paused Pro/MPT or discard work saved through either UI.
