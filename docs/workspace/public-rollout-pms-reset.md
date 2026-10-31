# Public workspace, PMS Punjab and preparation reset review

The owner requested the redesigned workspace for everyone, complete hiding of paused Pro discovery, account/preparation reset controls that retain identity, and a topic-based PMS Punjab planner alongside CSS. No student account was reset on production during implementation.

Initial base: `cb92f6aa308c9c93638133a410177b090b69b661`. The isolated branch `feature/workspace-public-reset` integrates `c7733bd475757dc9c570f7adb6e2f912a39ba84e`, preserving free Preci Mentor, English Expression/skills/published subject learning, GSA Tutor, the guided CSS planner and approved publication releases. The later content-only main commits through `450867854440a39afe36e783b78b18ebf7f148b0` were also merged without changing workspace logic; the final CI candidate must include those approved Current Affairs/GK updates. The free-course exceptions in current route/API enforcement take precedence over older documentation describing Précis as Pro. No paid entitlement, Pro pause, MPT hibernation, grading algorithm, payment collection or AI-provider setting is opened by this change.

## Requirement and evidence map

| ID | Requirement / implementation | Verification | Status |
|---|---|---|---|
| W01 | Global workspace and single-window signup: `_workspace_preview.php`, `workspace-release.php`, `WorkspacePreviewProvider.tsx` | Native selector ownership, guest/authenticated release, expired session, kill-switch and failed-selector fallback; seven-section browser matrix | Verified locally |
| W02 | Hide paused discovery: workspace `registry.ts`, `FeatureFinder.tsx`; retain current free-course exceptions | Native anonymous/free/active/expired content access and release-pause checks; directory/navigation browser checks | Verified locally |
| W03 | Official PMS downloads: `public/pms-punjab/`, `content/pms-punjab/source-manifest.json` | 40 PDF signatures and SHA-256 values; individual source download; ZIP originals | Verified |
| W04 | Source-linked outline adapter: `scripts/pms/import-syllabus.py`, `catalogue.json` | Nonempty source-linked units for all 40 documents; unique versioned IDs; source page links; rendered Punjabi/Urdu source review | Verified for imported outline; not certification of the examination scheme |
| W05 | CSS/PMS switch and independent preferences: `PlannerWorkspace.tsx`, `pmsModel.ts`, `PlannerPms.tsx`, Subjects | Native save/sync/refresh, explicit Ethics alternative, no CSS selection replacement; all widths | Verified locally |
| W06 | Topic distribution and editable sessions: `pmsModel.ts`, existing `store.ts` and `PlannerTask.tsx` | Existing shared workload, cross-track time conflicts/over-allocation, rest days, target fit, round-robin subjects, preview edits, duplicate prevention, stable IDs; 3,000-task limit retains existing records | Verified |
| W07 | Revision and performance: `PmsPerformance.tsx`, task activity adapter | Revision sessions do not change prior topic coverage; source outline checks separate from session counts and assessment scores | Verified |
| W08 | Scoped resets: `student/preparation-reset.php`, `_preparation_reset*.php`, `ResetPreparationPanel.tsx` | Signed read-only preview, current password, typed confirmation, CSRF/owner checks, stale preview, exact retry, concurrent retry, date/subject filters, populated native records | Verified locally |
| W09 | Reset sync barriers: `accountSync.ts`, `hostingerSync.ts`, `preparationStorage.ts`, `reconcile.ts` | Old-generation writes rejected; reserved metadata cannot be forged by a normal snapshot; retired root/stash cannot return; other account unchanged | Verified |
| W10 | Timers, grammar, drafts and course compatibility | Full-reset epoch namespaces; partial reset retains sessions; current GSA merge rules retained; iframe storage binding; free Précis course progress reset, writing retained | Verified locally |
| W11 | Identity and protected history | Before/after hashes of semantic profile/identity, membership, native attempts, writing and native MPT records in disposable fixtures | Verified |
| W12 | Build, accessibility, mobile, routes and regressions | TypeScript, lint, production build, route/link audits, focused/full suites, native and browser checks below | Verified locally; applicable environment limits below |

## PMS source treatment

The two official PPSC pages were fetched on **30 October 2026**, then rechecked on **31 October**; all 40 downloads still had identical SHA-256 values:

- <https://www.ppsc.gop.pk/PMSCompulsoryPapers.aspx>
- <https://www.ppsc.gop.pk/PMSOptionalPapers.aspx>

They listed **10 compulsory/alternative PDFs and 30 optional PDFs**. Every linked original was downloaded unchanged. The manifest records canonical source URLs, byte counts, hashes and HTTP modification dates. Some originals have modification dates before 30 October; the interface says **checked** on that date and does not claim every document was announced that day.

The planner includes one explicitly selected Islamic Studies/Ethics alternative, separate Pakistan Studies I and II documents, and the actual PMS Political Science parts. CSS paper identities and the CSS 600-mark optional validator remain unchanged. PPSC spelling mistakes in two filenames remain in stable document IDs/URLs, while display names use the PDF headings. English Literature's PDF does not state total marks; the adapter leaves its marks absent.

The catalogue consists of source outline study units, including broad headings and their listed subtopics where present. They are not weighted examination topics. Suggested-reading bibliographies remain in the original PDFs rather than becoming invented study sessions. Punjabi and Urdu use source-verified Unicode transcriptions because the embedded PDF font lacks a usable Unicode map. Agriculture uses the table's left-column headings. Original PDFs remain authoritative for full wording, prescribed works and examination instructions.

**Unverified source boundary:** these subject download pages do not establish a complete applicable advertisement, examination date, full marks scheme or optional-selection/group rules. PMS choices are clearly labelled **planning subjects**, not a validated examination application. No annual exam date, additional missing paper, official weight, eligibility decision or combination validator is manufactured.

## Persistence and reset contract

PMS sessions use existing `studyScheduleTasks`, `syllabusItemStatuses`, update methods and sync events. Their namespaced source IDs begin `pms-punjab:2026-10:`; older CSS identifiers are untouched. A revision activity is an optional additive field on new sessions. Completing a revision records that session without marking an already covered topic incomplete.

PMS preferences use the existing synchronized tool namespace `cssvista:tool:pms-planner:v1`. Its versioned serialized settings value prevents the generic array-union merge from undoing an explicit subject deselection. The interface confirms device saving; it does not claim a write is already synchronized.

Reset scopes:

- **Personal timetable:** all tasks or exact subject/date range; other preparation remains.
- **Timetable and study goals:** personal tasks, suggestion completions, goals/planner notes and native account-linked daily plans. Independent course schedules remain unless preparation itself is reset.
- **One account-linked schedule:** one owned attempt, optionally a date, preserving other plans/coverage.
- **Start preparation again:** local-first preparation records, course state, personal reading, grammar/Précis progress, native study evidence, personal Current Affairs and Factbook records. CSS/PMS preferences may be retained or explicitly cleared.

Identity, password, profile/photo, memberships, payments, security/usage ledgers, account-linked attempt settings, native writing/evaluations and formal native examination records are retained. Shared browser-only public PDF bookmarks and unassigned legacy drafts are retained because their ownership cannot safely be inferred. The confirmation explains these boundaries; this is not account deletion. The optional device backup does not pretend to include native Factbook or reading records.

The reset endpoint is the only writer of reserved `__cssv_reset_v1` metadata in the existing progress blob. It returns generation/revision separately; normal progress GET payloads retain their old logical shape, and normal PUT cannot remove/forge the marker. Owned preparation mutations serialize with the reset and require the current generation **only after an explicit reset**. Unreset accounts retain legacy compatibility.

After a confirmed reset, existing logical progress keys map to an account/generation-scoped physical device partition. This narrowly necessary adapter prevents old tabs and legacy stashes from resurrecting removed records. No schema migration or second task database is introduced. Full resets advance timer/draft/course recovery epochs; partial schedule resets preserve them. Workspace display preferences and shortcuts remain account preferences. The shared GSA page remounts its whole study view when the authenticated owner changes, including on its public URL. The browser test holds the next account’s cloud request and verifies that the previous student’s course summary is absent, then restores the first account’s actual records. Whole-view unmounting is reserved for the intentional full reset. Failure to update a device produces an account error and retains its old copy for recovery.

## Verification record

Use only the isolated `cssvista_briefing_test` native environment and `@example.invalid` identities. Browser fixtures block non-loopback services and use sanitized records. No live student login or destructive production test is part of this review.

Executed before final integration: full `npm run test:all`, strict production build, native planner/reading, seven sections at 320/375/390/768/1024/1440, single-window signup entry, task refresh, owner switching, failed-selector/classic fallback, PMS preview/edit/completion/revision, partial/full reset, API failures and keyboard dialog focus. The PMS scan had zero applicable automated axe violations; that alone is not a WCAG conformance claim.

After integration:

| Executed command | Outcome |
|---|---|
| `npm run test:all` | 369 Node and five Python tests passed; no failures/skips. Includes current free-learning rules. |
| `npm run test:workspace` | 41 passed after final registry changes. |
| `npm run test:expression-guide` | Three passed. |
| `npm run typecheck` | Passed, including the registration transition fix. |
| `npm run lint` and focused ESLint on changed files | Zero errors; one existing `Introduction.tsx:116` dependency warning in the full run. |
| `npm run verify:hostinger:strict` | Passed. Subsequent frontend iterations also passed `node scripts/build-target.mjs hostinger --strict`. |
| Build-integrated route/link audits | 118 routes, four redirects, six genuine invalid-route 404s, 1,025 sitemap URLs and 66,934 internal links passed; frozen MPT export unchanged. |
| `node tests/pro/paid-access.mjs`, `node tests/pro/release-pause.mjs` | Anonymous/free/entitled/expired and paused access passed; current free courses retained, paid/AI/payment features held. |
| `node tests/preparation-reset/security.mjs` | Populated native records, identity/membership/writing/MPT retention, owned deletion, concurrent/idempotent retry, stale device and server marker checks passed. |
| `node tests/reading/security.mjs` | Isolated rerun passed with exit zero, including owned reading/bookmarks, revision, expiry/renewal and publication windows. |
| `node tests/browser/workspace-preview.mjs` | Seven sections at 320/375/390/768/1024/1440, task persistence, public signup entry, direct routes, recovery and late-response/account isolation passed. |
| `node tests/browser/pms-reset.mjs` | Nine native journeys passed: 40 PDFs, Punjabi/RTL, independent choices/fresh-context sync, editable sessions, revision/coverage, six widths, source failure/retry, interrupted accepted reset response/receipt recovery, course compatibility and full reset/isolation. |
| `node tests/browser/signup.mjs` | Single-window form, duplicate-submit prevention, failed profile/photo writes, deliberately failed owner-presentation check, private photo, 12-check gate, URL/hash return, profile conflicts, malformed imported lists and held-write account switch passed. |
| `node tests/browser/workspace-native.mjs`, `node tests/browser/planner-native.mjs` | CSS selection → tasks/goals → sync/fresh-context restore, real timer navigation/refresh, native attempt creation/partial work and seven native attempt views passed. |
| `node tests/browser/pro-pause.mjs`, `node tests/browser/classic-profile.mjs` | Paused discovery/direct access, free courses, classic fallback, genuine profile edits/conflicts/failure recovery passed. |
| `node tests/browser/answer-timer.mjs` | Isolated rerun passed signed overtime, pause/resume, paper timing, corrupt recovery, redistribution and mobile width. One combined run timed out scrolling a tab into view; no timer logic was changed to force a pass. Native signed-in continuity also passed. |
| `node tests/browser/expression-guide.mjs` | Eight lessons, save/reload, stale-tab/account/reset isolation, corrupt/blocked storage, downloads and narrow layouts passed; no external/API calls. |
| `node tests/browser/gsaTutor.mjs` | Passed at 375/768/1440 on isolated loopback native static serving; 141 lessons, incremental chapter loading, schedule and recorded recall flow. |

The global signup test caught an actual pre-release defect: registering changed the authenticated owner and remounted the public form before profile saving. Public entry presentation now stays stable through that transition; protected workspace selection remains independently owner-bound. The expanded signup regression deliberately fails the presentation lookup and verifies the fields/photo survive. The dashboard keeps the daily action ahead of the course card and names Daily Briefing distinctly from Daily PDFs without rewriting saved pin IDs. The shared planner reuses `dayWorkload` over all active timetable records for time conflicts and over-allocation warnings. Track cards retain their own counts; the combined estimate explicitly includes completed tasks and uses the availability saved in the current view. This is planned time, not measured study time.

Rendered desktop/mobile review includes the daily dashboard, planner/settings, source cards, Punjabi text and reset confirmation. The mobile source action now wraps beneath long subject descriptions without splitting its label. The seven-section matrix checks all required widths; screenshot fixtures are sanitized. PMS and reset-dialog automated accessibility scans recorded zero applicable violations; English-guide scans recorded no serious/critical issues. These are limited automated checks, not a formal WCAG conformance claim. Public preparation reset was never exercised on a live account.

Local artifacts: `test-artifacts/public-release/`, `test-artifacts/workspace-preview/`, `test-artifacts/pms-reset/`. The managed execution environment restarted during work; earlier `/tmp` logs were lost, while these workspace artifacts and their results survived. An early reading test hit a Node 24 Undici shutdown assertion after its assertions; the isolated rerun completed successfully. The local disposable PHP image lacks GD, blocking the unchanged handwriting image unit check; paused upload enforcement was independently exercised. CI provisions GD and must pass its existing handwriting checks before rollout.

## Comparable local performance

`CSSV_PERFORMANCE_BEFORE=/workspace/cssv-performance-before/dist node tests/browser/workspace-performance.mjs` passed three alternating cold-context runs per version, using the same sanitized account/API records, 390×844 viewport, 4× CPU slowdown, 100 ms latency and 400 KiB/s download. Assets are uncompressed loopback responses, not production transfer figures. The earlier artifact is `13091aed6355556a5aceae8d4c9efe774cbee6ad`.

| Median | Earlier interface | Candidate |
|---|---:|---:|
| Useful dashboard heading | 5,708 ms | 4,968 ms |
| Largest contentful paint | 2,024 ms | 1,804 ms |
| Cumulative layout shift | 0.0095 | 0.0194 |
| Initial JS/CSS body bytes | 966,071 | 975,610 (+1.0%) |
| Initial code requests | 25 | 33 |

The first comparison exposed a 0.149 shift caused by the legal footer appearing below a short loading boundary and moving as the workspace loaded. Reserving viewport height in that boundary reduced it to 0.0194 on the repeated comparison. The residual small shift includes topic-coverage loading. No whole PMS/MCQ bank or protected document is fetched to render dashboard links. These measurements are lab evidence; production field Core Web Vitals remain a separate check.

## Routes, release and rollback

No URL is removed. PMS uses query parameters on existing planner/subject routes (`exam=pms-punjab`, `view`, `pmsSubject`). The initial `view=pms` entry remains compatible. Existing parameters and calendar dates stay in browser history.

Review-branch pushes/PRs run validation. Existing production release is attached to `main`; the dated PDF publisher is also restricted to its own paths on `main` or manual dispatch. No publication workflow is dispatched by this work. Recheck triggers and current main before remote writes. Only a tested owner-authorized rollout may be merged.

A UI rollback must retain the reset endpoint, generation enforcement and device adapters. The existing classic presentation fallback can restore the preceding interface while retaining new records. **Do not revert the entire application to a pre-reset client/server after students have reset:** old clients lack the generation barrier. Never clear storage or restore broad account snapshots as a UI rollback.

Deployment status: not yet deployed by this branch; final release evidence pending.
