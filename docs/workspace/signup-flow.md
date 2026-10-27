# Single-page signup follow-up

The owner's latest instruction replaces the four-step registration flow from
`d17963c37e430392809e4a333653f1e240baa0f9`: signup must contain everything in one
window. Work remains local on `review/student-workspace`; production is untouched.

## Implementation and preservation

`RegistrationForm.tsx` now displays account credentials, personal/contact details,
study preferences, previous CSS Vista history and the photo together. One
**Create my account** submission validates every section before creating an account.
There are no Next/Back steps or separate photo-save button. Incomplete returning
accounts use the same page with their actual saved details and **Finish account
setup**. Completed-account settings retain their existing editing sections.

The single submission orchestrates the existing register, profile and private-photo
endpoints. These are separate operations, not a new atomic API. If a later save
fails, the account remains created, inputs and prepared photo remain on the page,
and retry resumes without registering another account. Passwords are cleared after
successful registration and never persisted by this interface. Refresh restores
server-saved fields; unsaved drafts and photos are not promised across reload.
Actual server readbacks confirm saved fields, private photo bytes and all twelve
native completion checks before opening the intended destination.

`ProfileFields` and `AccountPassword` reuse existing controls. Shared
`profilePersistence.ts` refreshes untouched fields before the existing full-profile
POST, detects conflicting edits and confirms saved values. Unsupported untouched
list formats block writes and preserve records. The existing endpoint has no
atomic version check: a simultaneous edit between GET and POST remains an existing
limitation. No stronger concurrency guarantee is claimed.

Account-bound requests and ownership checks run before and after asynchronous
operations; stale signup operations cannot continue into a different account.
The native session and twelve-check profile gate remain authoritative. No auth,
database, membership, release-flag, progress, timer, scoring or sync contracts were
changed. No new dependencies, schema, preference keys or academic fixtures were
added to production code. The original StudentProfilePanel import remains a
compatibility re-export.

The profile shortlist retains historical subject names and remains distinct from
the planner's validated 600-mark selection. Signup neither seeds sample subjects
nor creates another combination validator. JPG/PNG/WebP preparation reuses the
existing local compressor, accepts source files up to 20 MB and saves at most
60 KiB through the existing private-photo API. The public compressor and header
avatar remain connected to their original workflows.

## Routes and composition

`/account?mode=create` is the complete form. `/account`, settings, reset-code,
legacy verification and sanitized return links retain their existing behavior.
The destination's query and hash survive signup and required profile recovery.
One main landmark, the authentic logo, website-return link and compact legal
footer remain. No public bottom navigation competes with signup. Desktop uses a
two-column form with section dividers; tablet/mobile stack the same fields without
step navigation or horizontal overflow. Form errors, pending writes and photo
preparation have visible states; validation focuses the first invalid control.

## Requirement checklist

| ID | Requirement / implementation | Evidence | Status |
|---|---|---|---|
| SU-01 | All signup fields together; RegistrationForm, Account | Native whole-form validation; one submit; no step controls | verified |
| SU-02 | One submission and recovery; registrationModel, profilePersistence | Native happy path, double-submit guard, failed profile/photo save and retry | verified |
| SU-03 | Native required profile gate; ProfileGate | Progress denied before twelve requirements, permitted after native completion | verified |
| SU-04 | Existing shortlist and historical values; ProfileFields, ProfileSubjects | Native imported subjects/services retained; incompatible-list write blocked | verified |
| SU-05 | Existing private photo and public compressor | Real large PNG resized, previewed, saved/read back; public file downloaded | verified |
| SU-06 | Existing URLs, signin and recovery; Account, AccessForm | Query/hash return; mode/back history; duplicate email; invalid reset/legacy links | verified |
| SU-07 | Account isolation and safe writes; profilePersistence, RegistrationForm | Held signup write plus account switch; no stale draft/upload or next-account mutation | verified |
| SU-08 | Responsive single-page form and accessibility | Six viewport captures, landscape, keyboard, two zero-violation automated scans | verified |
| SU-09 | Planner, history, sync, timer and membership preservation | Full suite plus native workspace/continuity/paused-access checks | verified |

## Current verification

Executed against this working revision:

- `npm run test:all`: **330 Node tests and 5 Python tests passed**, zero failures.
  Includes 29 workspace tests and nine focused account-setup cases.
- `npm run typecheck`: passed.
- `npm run lint`: zero errors; one pre-existing hook warning at
  `src/features/current-affairs/Introduction.tsx:116`.
- `node scripts/check-profile-contract.mjs`: passed; all existing native/API,
  required-history, photo-limit, admin and schema assertions remain.
- `npm run build:hostinger:strict`: passed, including preflight, typecheck,
  content/MPT/advertising/search audits, 115 registry routes, 1,025 sitemap URLs,
  63,953 links and duplicate checks. Existing Rollup annotation/import and chunk
  warnings remain. This is a local build, not a deployment.
- `node tests/browser/signup.mjs`: passed against the finished production artifact
  and real disposable PHP/MySQL APIs. Evidence covers whole-form validation before
  registration, one-click successful creation/profile/photo save, duplicate clicks
  and email, failed profile/photo saves with retained drafts and no duplicate
  account, failed profile load/retry, refresh, actual twelve-check gate, private
  avatar, query/hash destination, legacy values, conflicting edits, unsupported
  lists, signout/signin, invalid recovery links/code and public compressor download.
  A held signup write followed by login as another native account confirms no
  stale draft, stale photo upload or mutation of the next account. Two automated
  accessibility scans reported zero violations; keyboard, password visibility,
  one main landmark, tab order, narrow-width controls and landscape were exercised.
- `node tests/browser/workspace-native.mjs`: passed; actual planner task/goal saves
  and refresh, optional settings, subjects, account sync, fresh-context restoration,
  timer navigation/refresh and sign-out.
- `node tests/browser/account-continuity.mjs`: all eight scenarios passed:
  timer ownership, offline/online recovery, bookmark/library reopening, sync
  conflict preservation, failed-write retry, late account-switch responses,
  mock/result/performance restoration and touch/landscape/reduced-height controls.
- `node tests/browser/pro-pause.mjs`: passed; active entitlement retained while
  paused, fourteen direct protected routes blocked, free Grammar/Vistagram reading
  available, expiry unchanged, 320–1440 reflow and no page errors. Only the guarded
  fixture database's release state was temporarily set and restored.
- An additional read-only browser pass captured fresh empty signup at 320/1440
  and whole-form validation at 320; no account was created.

Logs: `/tmp/cssv-single-signup-{all,types,lint,contract,build,browser,preservation}.log`.
Copies are retained in ignored `test-artifacts/signup/single-window/logs/`.

All native browser runs target guarded disposable `cssvista_briefing_test` accounts
through loopback HTTPS port 3446, Chromium and the existing off-origin blocker.
`tests/account-native/signup-fixture.php` prepares only this harness's TEST ONLY
registration counters; the six-per-hour native limit remains unchanged.

Review artifacts: `test-artifacts/signup/single-window/results.json`,
`single-{320,375,390,768,1024,1440}.png`, `empty-{320,1440}.png`,
`validation-320.png`, `landscape.png` and `save-error.png`. Profile-loading
failure and retry are also asserted by the native signup test.
Screens contain disposable `@example.invalid` records, never live students.

## Historical dashboard benchmark (previous revision)

`CSSV_PERFORMANCE_BEFORE=/workspace/cssv-performance-before/dist node
 tests/browser/workspace-performance.mjs` At revision `d17963c`, this command compared the original
`13091aed6355556a5aceae8d4c9efe774cbee6ad` build in a detached local worktree with
the then-current working artifact. Three interleaved cold-context runs per build use the
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

## Verification limits

Physical iOS/Android devices and real on-screen keyboards are unavailable. No real
SMTP recovery email was sent; invalid-code/confirmation and recovery-link behavior
are exercised with native APIs retained. Fixture/fresh-context synchronization is
not proof of live cross-device delivery. Paused Pro checks do not certify unpaused
paid operation. The prior official FPSC source recheck was unavailable; this change
does not modify examination content. Automated scans supplement keyboard and focus
checks and do not certify WCAG conformance. The benchmark above belongs to the
previous dashboard revision; it was not rerun as a signup performance measurement.

## Release and rollback

Deployment triggers were inspected again; existing workflows include main/PR
builds, manual schema bootstrap and live deployment monitoring. External Hostinger
hooks are not established as safe for a review push. No remote write, workflow
dispatch, production data change or deployment is part of this task.

After separate release authorization and deployment-hook review, use locked npm
installation, `npm run verify:hostinger:strict`, `npm run test:all`, the profile
contract check and the native fixture journeys before the established release
procedure. No bootstrap, secret, payment or release-flag changes are needed.

Revert this follow-up commit to restore the previous interface. Existing saved
fields and photos remain readable by the prior revision; rollback needs no data
migration or storage clearing. Keep earlier account-isolation and timer fixes.
