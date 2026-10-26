# Easier native account setup

Local review branch: `review/student-workspace`. Starting revision:
`838258b17bbc053e4c06dfea45104b1142e85785` (clean working tree).
This extends the seven-section workspace and full planner recorded in
[implementation.md](implementation.md), [planner-restructure.md](planner-restructure.md),
[visual-redesign.md](visual-redesign.md) and [verification-followup.md](verification-followup.md).
No production deployment, remote push, new dependency or database migration.

## Flow and preservation

Account creation asks for name, email and one password, with a show/hide control.
The native API already creates a signed-in account without email confirmation;
no new verification requirement or authentication policy was introduced. Password
recovery retains confirmation, existing token links and the six-digit code flow.
The browser validates new passwords against the existing 72-byte native cap;
legacy sign-in does not acquire a new password-length restriction.

Setup uses four short saved sections: Contact, About you, Your studies, Your photo.
The mandatory previous-student question is now in Contact. Before this change, a
real fresh native fixture received HTTP 422 when saving About you because that
required answer was hidden in the next section. Historical reproduction and
sanitized captures: `tests/browser/signup-before.mjs` (requires the original built
artifact and `CSSV_EXPECT_OLD_SIGNUP=true`), `test-artifacts/signup/before/`.

All existing twelve native profile checks still apply. The native profile and
progress services remain the authority; incomplete accounts cannot sync merely
because a step looks complete. The saved progress bar uses the server's checks.
The existing server default country is retained. No academic history is seeded.

Profile subject search edits only the existing profile shortlist. It does not
replace the planner's validated examination combination, require 600 marks at
registration, substitute sample subjects or erase imported subject names. The
existing native profile API accepts partial shortlists. Full combination validation
continues in My Study Plan, using the established shared validator.

Larger JPG/PNG/WebP photos can be resized locally, previewed and explicitly saved.
The original public compressor's algorithm is shared through `photoCompression.ts`;
the server upload remains at most 60 KiB. The public tool's selected-size/download
workflow is retained. Saved photos use the existing private, account-bound avatar.

Writes remain on existing native endpoints. A profile step refreshes untouched
server fields before the full-profile POST and reads back changed fields before
showing success. Conflicting fields retain the draft and require review. Unsupported untouched list formats stop the full-profile write and retain records
and drafts; imported service entries have an explicit removal control. This
reduces stale overwrites; the existing endpoint has no atomic version check, so it
cannot guarantee protection against a simultaneous write between GET and POST.
No new concurrency policy or API contract is claimed. Failed saves retain draft
inputs in memory; drafts/passwords are not written to browser storage. Saved steps
resume from real server requirements after refresh. Unsaved drafts are not promised
to survive a page reload.

No student identifiers, storage keys, serialized progress shapes, authentication
APIs, memberships, assessment algorithms, timers or release flags were changed.
Account-bound requests and stale-response guards remain enforced. The original
StudentProfilePanel import is retained as a compatibility re-export.

## Routes and interface

`/account`, `?mode=create`, `?settings=1`, reset/code-recovery/legacy-verification
links remain supported. A sanitized return destination keeps its query and anchor
through account creation, required profile completion and recovery links. Self
redirects to `/account` recover to the dashboard. Mode switches use router history.

Account entry now has an authentic-logo header and a website return link, without
the public ticker, full navigation, floating shortcuts or public bottom bar. The
existing legal/privacy controls remain available in one compact footer. All public
routes keep their normal website navigation. The public search keyboard handler is
not registered where its dialog is absent, preventing a hidden scroll lock.

## Requirement checklist

| ID | Requirement and implementation | Verification | Status |
|---|---|---|---|
| SU-01 | Three-field account creation; AccessForm, accessForm, Account | Native registration, duplicate click/email, password visibility; accountSetup tests | verified |
| SU-02 | Short saved steps and required history first; profileForm, StudentProfileForm | Native first-step save, history/services, failed save/retry, refresh | verified |
| SU-03 | Existing profile gate and private records | Native progress 403 before twelve checks, 200 after; preservation suites | verified |
| SU-04 | Searchable existing shortlist, retain unknown names; ProfileSubjects | Adapter tests and native saved shortlist; unchanged planner validator | verified |
| SU-05 | Local photo resizing, explicit save and private avatar | Real PNG >60KiB, failed save/retry, native readback <=60KiB; public download | verified |
| SU-06 | Return links, modes and recovery; Account, accessForm, AccessForm | Query/hash destination; browser history; duplicate email; invalid reset and legacy links | verified |
| SU-07 | Recoverable errors, scoped writes and stale-account guards | Failed POST/load/upload; conflict review; fresh untouched fields; isolation regressions | verified |
| SU-08 | Compact responsive entry and profile, no competing mobile navigation | Actual browser interactions/screens at six widths; five panel accessibility scans | verified |
| SU-09 | Preserve planner, progress, assessments, membership and paused MPT | Full suite; native workspace, continuity, quiz race and Pro pause | verified |
| SU-10 | Comparable dashboard performance | Original/current compiled artifacts; same fixture and throttling | verified |

## Verification

Executed checks:

- `npm run test:all`: **329 Node tests + 5 Python tests passed**. After the
  final compatibility safeguards, `npm run test:workspace` passed all 28 tests
  (including eight account-setup cases). No tests were disabled.
- `npm run typecheck`: passed. The final strict production build also type-checked.
- `npm run lint`: passed with one pre-existing `Introduction.tsx:116` hook warning;
  scoped ESLint passed for changed components, helpers and browser tests.
- `npm run build:hostinger:strict`: passed, including Hostinger preflight, content,
  MPT export, advertising, search, route, link and duplicate-content audits:
  115 registry routes, 1,025 sitemap URLs and 63,953 internal links checked.
  Existing Rollup annotation/import warnings and large-chunk notices remain.
  `verify:hostinger:strict` was not separately repeated; its preflight and strict
  build operations were executed by the actual build target. No deployment ran.
- `node scripts/check-profile-contract.mjs`: passed. Source ownership checks now
  follow the extracted real form and retain all native/server/admin assertions.
- Disposable Docker PHP checks: `tests/planner/unit.php` (225 assertions),
  `tests/pro/unit.php`, `tests/learning/unit.php`, `tests/mpt/unit.php`
  (24,905 passed) and `tests/mpt/flag.php`: all passed.
- `tests/browser/signup.mjs`: actual native registration, all four profile steps,
  hidden-history regression, duplicate submission/email, failed load/save/upload,
  saved-step refresh, retained drafts, fresh untouched fields, conflict review,
  imported subject containing a comma, incompatible-list write prevention, explicit
  imported-service removal, real >60KiB image compression/private
  upload, actual twelve-check gate, query/hash return, sign-out/sign-in,
  recovery errors/links, legacy verification and public compressor download passed.
  Five panel accessibility scans reported zero violations. Actual screens were
  captured at 320/375/390/768/1024/1440; landscape and keyboard controls were
  exercised. First profile input visibility and absence of public bottom navigation
  are asserted at the narrow widths. One main landmark is asserted throughout
  signup and profile setup, alongside validation focus, tab order and Space controls. Empty, validation, API-failure and retry
  states are represented; screenshots contain sanitized fixtures only.
- `tests/browser/workspace-native.mjs`: passed again against the final artifact:
  existing sign-in, planner tasks/goals, selected optional subjects, refresh,
  sync and fresh-context restoration, timer navigation/refresh and sign-out.
- `tests/browser/account-continuity.mjs`, `quiz-account-race.mjs` and
  `pro-pause.mjs`: passed during this follow-up. Evidence covers account isolation,
  offline local work/reconnection, bookmarks, sync conflicts and failed-write retry,
  late responses, mock/result/performance restoration, active timer ownership,
  fourteen paused protected routes, retained free features and membership expiry.
  These services and their business logic were not rewritten.

Native browser runs use `CI=true CSSV_DB_NAME=cssvista_briefing_test
CSSV_TEST_PHP_CONTAINER=cssv-workspace-native`, loopback HTTPS port 3444, Chromium
and the existing off-origin network blocker. Repeated signup runs correctly hit
the six-per-hour native limit. `tests/account-native/signup-fixture.php` checks
both environment and actual database name and prepares only this harness's
`signup-…@example.invalid` TEST ONLY registration counters. It never changes the
limiter, accounts, sessions or academic records. Other initial harness failures
were corrected fixture expectations (the existing default country and blank phone,
label matching and preserved sign-in return destination); one run overlapped an
artifact rebuild and was discarded. Final native results use a finished build.

Final session logs: `/tmp/cssv-signup-final-build.log`,
`/tmp/cssv-signup-all.log`, `/tmp/cssv-signup-compatibility-unit.log`,
`/tmp/cssv-signup-delivery-types.log`, `/tmp/cssv-signup-delivery-lint.log`,
`/tmp/cssv-signup-final-lint.log`, `/tmp/cssv-signup-final-browser.log`,
`/tmp/cssv-signup-final-contract.log`, `/tmp/cssv-signup-final-preservation.log`,
`/tmp/cssv-signup-preservation.log`, `/tmp/cssv-signup-native-units.log` and
`/tmp/cssv-signup-final-performance.log`.

Review artifacts: `test-artifacts/signup/after/results.json`, the five-panel
six-width captures in that directory, `test-artifacts/signup/before/`,
`test-artifacts/signup/source.sha256` and `test-artifacts/workspace-performance/`.
The final source hashes were checked after browser verification. Main changes:
`src/features/account/` (presentation, adapters and validations), compatibility
`StudentProfilePanel`, `Account`, `ProfileGate`, `Layout`, `TrustFooter`, shared
`photoCompression`, public `PhotoCompressor`, contract script and focused tests.
No generated editorial changes are included.

### Comparable dashboard benchmark

`CSSV_PERFORMANCE_BEFORE=/workspace/cssv-performance-before/dist node
 tests/browser/workspace-performance.mjs` compares the original
`13091aed6355556a5aceae8d4c9efe774cbee6ad` build in a detached local worktree with
the final working artifact. Three interleaved cold-context runs per build use the
same Chromium, 390×844 viewport, 4× CPU slowdown, 100ms latency, 400KiB/s download,
100KiB/s upload, disabled cache and identical sanitized free-account API responses.
MPT is disabled and Pro paused in both fixtures. All other network origins are
blocked. These are local uncompressed artifact measurements, not live production,
mobile-hardware or Lighthouse scores.

| Median measurement | Original | Revised |
|---|---:|---:|
| JS/CSS encoded body bytes | 966,071 | 893,985 |
| JS/CSS requests | 25 | 21 |
| Observed resource requests | 37 | 32 |
| Dashboard heading visible | 5,286ms | 4,499ms |
| Observed LCP | 1,824ms | 1,872ms |
| Observed CLS | 0.0095 | 0.0194 |

Initial JS/CSS body bytes fell 7.5%. Heading visibility ranged 5,228–6,435ms
before and 4,440–4,522ms after; observed LCP ranged 1,796–2,608ms and
1,820–2,024ms respectively. Do not infer production speed guarantees from three
local runs. Diagnostics initially found CLS 0.149 in the redesigned artifact:
the legal footer shifted out of the viewport when authentication resolved.
Reserving screen height in ProfileGate reduced it to 0.019. The remaining small
shift includes the existing synchronization message disappearing. Raw timings,
request lists, asset sizes and shift sources are retained in `results.json`;
`diagnostic-before-loading-fix.json` preserves the actual diagnosis.

### Explicit verification limits

Physical iOS/Android devices and real on-screen keyboards were unavailable. The
new flow did not send real recovery email or execute a successful SMTP-delivered
reset; recovery links, confirmation validation and native invalid-code rejection
were exercised, and the native reset APIs remain unchanged. Live cross-device
services are not certified by fresh-context fixture sync. Successful unpaused Pro
operation is not a claim of this paused-release test. The earlier official FPSC
source recheck remains unavailable (upstream TLS verification failure/HTTP 503);
no examination material was changed in this follow-up. Prior workspace limitations
remain documented in verification-followup.md. These limits do not authorize
production deployment or weakening existing account gates.
Review images/results are local ignored artifacts using disposable `@example.invalid`
accounts, never live students. Automated accessibility scans supplement keyboard
and focus checks; they do not certify WCAG conformance.

## Release and rollback

AGENTS.md retains the product release hold. Repository workflows include main/PR
build checks, manual schema bootstrap and production monitoring; external Hostinger
hooks cannot be established as safe for a review push. Deliver locally. Do not
push main, merge, dispatch a workflow or deploy under this assignment.

After separate release authorization and confirmation of deployment hooks, use the
repository's locked npm installation, `npm run verify:hostinger:strict`, full suite,
profile contract and native fixture checks. Review the generated fingerprint and
private/ad-disabled routes before the existing release procedure. No bootstrap,
secrets, payment changes or flags are required for this frontend change.

Reverting the signup change restores the prior interface without clearing any
student data. All saved values/photos use existing contracts and remain readable
by the previous revision. Keep the prior account-isolation and timer recovery fixes;
do not roll back those preservation patches or clear browser storage.
