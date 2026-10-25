# Student workspace review

## Revision and release boundary

Base: `13091aed6355556a5aceae8d4c9efe774cbee6ad`; branch: `review/student-workspace`.
Fresh clone, initially clean. npm/package-lock.json, Node 24.19.0 (repository supports 22–24), React 19, React Router 7, Vite, Tailwind and existing Lucide icons. Read root AGENTS.md and paid-feature-policy.md. No supplied visual mockups. Official existing `public/images/logo.webp` reused unchanged.

No remote writes, production operations, schema migrations, dependency changes or release-flag changes. AGENTS.md identifies main as automatically deployed to Hostinger. `.github/workflows` contains push-to-main and PR checks, manual bootstrap and scheduled production monitoring. External Hostinger hooks cannot be fully established here; deliver locally. Do not push main, merge or dispatch deployment workflows. A review push requires separately confirming Hostinger branch hooks cannot publish production.

## Architecture, routes and inventory

`App.tsx` retains all old routes and gates. `Layout.tsx` chooses the shared account shell for `/account/*`, excluding focused MPT examination paths. ProfileGate remains closed until account/profile checks resolve. ProReleaseOutlet remains outside page content. Existing MPT focus behavior is unchanged. Public tools retain original routes and a signed-in return link. Search parameters, hashes and browser history remain router-owned. New account paths are additive protected/noindex entries in `src/data/routeRegistry.mjs`, allowing the existing Hostinger generator to create real refresh destinations and advertising policy.

The canonical frontend directory is `src/features/workspace/registry.ts`: stable IDs, title, description, canonical destination, category and searchable keywords. It reuses defaultHomeCards, deduplicates destinations and adds account tools and subjects. Availability delegates to isProDestination, useProReleasePaused and MPT_HIBERNATED; it grants no access. A Pro badge means membership required, not a claim that the current account is entitled. Current Affairs PDFs, public briefing and personal desk stay separate. Native APIs and ProGate retain entitlement decisions.

| Stable ID / family | Canonical route; aliases | Owner / data read | Writes / auth / entitlement / release | Mobile entry |
|---|---|---|---|---|
| overview | /account/dashboard; ?plan=free, ?plan=pro retained | AccountHome / store, progress, accountContext | existing task update; profile required; Pro pause preserved | Home |
| plan | /account/tasks, /account/plan; /study-planner unchanged | Tasks, StudyPlanner, PlannerDashboard / store + planner API | existing task, settings and syllabus operations; native preparation API remains account-owned | My Plan |
| subjects | /account/subjects; old /subjects/* and /fpsc-syllabus unchanged | Subjects / saved selectedOptionals, syllabus metadata | existing planner selector; new local display preference only | More |
| practice | /account/practice; /gk, /css-mcqs, /five-minute | WorkspaceSections + existing quiz engines / question banks and progress | existing trusted attempt/score flows; SelectedStudyGate retained | Practice |
| performance | /account/progress; /dashboard still redirects here | Progress / getStats, getStudyAnalytics, revision, quizResults | read-only presentation; profile required | More |
| library | /account/library, /account/directory | Library, FeatureFinder / store counts, registry metadata | existing saved MCQ /gk/quiz?mode=saved; writing notebook /answer-writing; no new bookmark store | Library |
| settings | /account/settings; /account?settings=1 unchanged | native Settings, StudentProfilePanel / account and preferences APIs | existing profile/password/sync/signOut methods; reading preferences API retained | More |
| public reading | /current-affairs-daily, /daily-briefing, /vistagram | existing PDF/briefing/Vistagram pages / public APIs | public content unchanged; personal actions retain their guards | Library / directory |
| personal reading | /account/current-affairs, /account/saved, /account/search, /account/factbook | existing Workspace / personal native briefing API | owned reading, saved facts, preferences; Pro + release pause | Library |
| daily-english / grammar-course | /account/english, /grammar-course | existing English and grammar-v5 course / existing state and native APIs | existing free progress, bookmarks and notes | Quick actions / Practice |
| paid learning | /account/precis, /account/general-ability, /study-material/essay-themes, /account/answer-performance | existing pages / guarded native APIs | ProGate, native ownership, expiry and release controls unchanged | Directory (no paused launch link) |
| writing / skills | /account/expression, /account/handwriting, /account/ask-vista, /account/argumentation, /account/analytical-skills, /account/essay-builder | existing page/API flows | existing native policies; isProDestination pause respected; no payment/provider enablement | Practice / directory |
| membership / usage | /account/membership, /account/ai-usage | existing native modules | existing policies and release pause; no new purchase activation | directory |
| MPT | /mpt, /account/mpt and all existing descendants | existing MPT pages / native MPT API | MPT_HIBERNATED remains true; registry has no launch action | no active entry |
| resource families | existing homeCards destinations including notes, past papers, lectures, optional notes, research, books, checklists, tools, guidance | original pages, registry metadata | original access checks, content and storage unchanged | directory |

Other legacy aliases remain declared in App.tsx and routeRegistry.mjs; none removed. Unknown account URLs still reach the existing recovery state.

## Data-flow and preservation review

AccountProvider session → ProfileGate → workspace → existing pages. AccountProvider's moveProgress stashes the old owner and restores the new owner before rendering account content. hostingerSync merges supported snapshots, checks account identity before applying responses, and retains the existing sync delay and errors. None of these modules were edited.

Saved optional names → studyPlanner settings → subject presentation. Syllabus JSON slug + section/item index → unchanged `slug:section:item` identifiers → TaskItem/updateStudyScheduleTask → store save and PROGRESS_CHANGED_EVENT → useAccountSnapshot subscribers. Generated daily suggestions/planTaskCompletions remain separate from studyScheduleTasks. Native My CSS Attempts remains separate and explicitly labeled. Existing PlannerDashboard supplies weekly planning and editing. No competing task database.

Practice engine → recordAttempt / quizResults → shared getStats/progress selectors → performance. Existing results are displayed without inventing a new score. Bookmark → existing saved MCQ mode / writing notebook / Grammar saved view / research library. Profile edit → original StudentProfilePanel → original account refresh/sync events. Logout → original signOut → stash/sync/moveProgress; next account gets its own shell key and preference namespace.

These journeys were traced in source before presentation edits. Browser fixtures verify only the local frontend boundaries listed below, not native server ownership or real cross-device synchronization.

## Subject treatment and metrics

Confirmed source JSON omits Essay and contains both Islamic Studies and Comparative Religions. Presentation adapter `model.ts` produces six slots totaling 600 marks, defaulting the sixth to Islamic Studies unless explicitly changed. No religion inference, JSON rewrite, topic-key rewrite, sample seeding or deletion. Earlier progress remains untouched. The alternative display preference is local to this account/device; it does not claim cross-device sync or alter the existing native attempt subject catalogue.

Optional names are read from saved settings. The existing shared validateSubjectCombination enforces total and group limits in planner settings. Unknown names remain visible until explicitly removed from the current selection; historical records stay intact. Sample fixture: Political Science (I, 200), European History (IV, 100), Environmental Sciences (V, 100), Criminology (VI, 100), Punjabi (VII, 100). Another fixture uses International Relations, History of USA, Gender Studies, International Law and Sociology. No sample is shipped as an account default. Original syllabus planner preserves paper headings including Political Science I/II. Essay and Punjabi do not get invented topic trees.

Official re-verification is pending: both repository-linked FPSC PDF URLs returned non-PDF responses in this environment. Existing repository FPSC references and classifications retained. See public/fpsc-syllabus.json source and lib/subjectSelection.ts official-source URL. Do not describe this as newly verified official content.

Metric definitions:

- Subject coverage: count original syllabus item IDs marked completed divided by the count of actual items for that subject; lifetime manual tracking; no denominator means unavailable. No paper double count.
- Overview syllabus count: all stored completed syllabus statuses, lifetime; labeled a count, no claim of full selected-syllabus coverage.
- MCQ accuracy: existing getStats scoring and attempted-question denominator, lifetime recorded quizResults; missing attempts shows no attempts. Not averaged with syllabus or time.
- Today tasks: same activeStudyTasks/archive filter and localTaskDateKey as existing task engine; completed / all tasks on that local date; minutes are estimates.
- Revision due and mature: existing getRevisionStats schedules, not inferred from unstudied topics.
- Activity/study time: existing recentActivities/getStudyAnalytics(7); units and original recorded timings retained.
- Target date: strictly valid configured date-only value compared by calendar day, using task engine local date convention; missing, invalid and past targets never produce a fabricated future countdown. Greeting retains existing Asia/Karachi convention.
- Continue reading: original book-summary catalogue validates item existence; saved progress must be >0 and <100, not completed, with finite updatedAt. Sort descending timestamp then slug. Existing reader restores position; no attempt is restarted. No valid candidate gives an actionable planner fallback.

## New preferences and rollback

Only addition: `cssvista:workspace:v1:<account-id>` with pins, guidanceDismissed and comparative. Writes happen only after a user action with an authenticated identity. Local-device preference, intentionally outside accountSync's contract; no cross-device claim. Sidebar collapse is temporary UI state. Dismissal is not evidence of preparation completion. The dashboard performs no default writes.

Rollback: revert the implementation commit and rebuild the prior revision through the normal authorized release procedure. Old code ignores the additive preference key. No migration or data clearing is needed; existing progress and server records are unchanged.

## Requirement checklist and scenario evidence

Statuses reflect actual verification, not a build-only completion claim.

| ID | Requirement / location | Verification | Status |
|---|---|---|---|
| W01 | Shell, seven sections, public separation / StudentWorkspace, Layout, App, TrustFooter | fixture route/width checks; route audit | verified in browser fixtures; see validation.txt |
| W02 | Real overview/tasks / AccountHome, ContinueStudying, shared | task fixture refresh, no-record fixture, selectors | verified in browser fixtures; see validation.txt |
| W03 | Six slots, alternative and saved optionals / Subjects, model | workspace.test.ts + browser alternative | verified adapter; official source recheck blocked |
| W04 | Optional group validation / StudyPlanner, existing validator | sample + other valid + invalid fixtures | verified shared validator; verified native save, keyboard validation, and restoration in a fresh context |
| W05 | Complete six-view planner / features/planner, PlannerDashboard, ScheduledSyllabusBoard, FpscSyllabusPlanner, preparation presentation | six-width workflow, native task/goal sync, native reviewed-plan and partial-work journey | verified in disposable browser/native journeys; see planner-restructure.md |
| W06 | Practice and assessment continuity / WorkspaceSections, unchanged timer and engines | existing answer-timer/MPT tests; paused-route fixture | verified unit recovery and native answer-timer navigation/refresh; full mock session unverified |
| W07 | Performance and honest measurement / Progress, shared, model | selector tests, fixture recorded results | verified fixture records; no new overall readiness score |
| W08 | Library / Library, existing saved modes | route/source trace, fixture record retention | implemented; real bookmark→reader native planner API security verified; full browser planning journey partly verified |
| W09 | Registry/search/pins / registry, FeatureFinder, preferences | search/pause tests and browser pin fixture | verified in browser fixtures; see validation.txt |
| W10 | Onboarding / AccountHome | persisted dismissal UI; no academic defaults | implemented; complete keyboard journey unverified |
| W11 | Auth/account isolation/sync / original AccountProvider, hostingerSync, ProfileGate | unchanged contracts; browser fixture switch | verified native ownership/security, sign-in/out and delayed fresh-context restoration; late-response switch scenario unverified |
| W12 | Entitlements/expired/pause / unchanged ProGate, ProReleaseOutlet and native policies | existing tests; pause fixture; no guard changes | verified native free/active/expired direct access and paused release tests |
| W13 | Responsive/accessibility / workspace.css, shell | six widths, reading order/focus styles, screenshot review | verified six-width fixture navigation/screenshots and keyboard controls; no formal WCAG certification |
| W14 | Brand/tokens/performance / authentic logo, CSS tokens | screenshot review; bundle/build output | implemented; comparable before/after performance not measured |
| W15 | URLs/direct refresh/ad policy / routeRegistry.mjs | production routes, route/link audits | verified strict build, direct refresh and link audits |
| W16 | Release safety/review / this report and local branch | git diff review, no push/deploy | verified local-only |

Remaining integration limitations include offline→online transitions with unsynced work, late native responses during an actual account switch, active assessment navigation/refresh and complete bookmark→resource browser journeys. Native login/logout, membership tiers, planner ownership and reading history were additionally exercised as recorded below. Frontend fixtures are not substitutes for these. Run the existing disposable MySQL/PHP CI jobs before release. No production accounts used.

## Verification log

See `validation.txt` for executed commands and final outcomes. Sanitized screenshots and fixture result JSON are in ignored `test-artifacts/workspace/`. The browser fixture deliberately returns 503 for unconfigured native panels, exercising recovery rather than seeding fake server records. It blocks all off-origin requests.

Release prerequisites: finish the remaining scenarios identified in the matrix, retrieve the applicable official FPSC syllabus, review every required mobile interaction including keyboard/forms/active overlays, approve the local diff, and separately authorize production release. This is a review implementation, not a claim that every acceptance gate is complete.

PHP follow-up: the host has no PHP and cannot install packages (no sudo; apt permission denied), but the managed local Docker daemon is available. A disposable `php:8.2-cli` container with no network and a read-only repository mount successfully ran pro, planner, learning, release-pause, reading and topics unit checks. The later disposable MySQL/PHP runtime successfully executed the native security suites listed in validation.txt. No container contacted production.


## Final follow-up findings

Native integration now runs in disposable `cssv-workspace-db` and `cssv-workspace-native` containers, with localhost-only HTTP binding and TEST ONLY accounts. No production configuration is used. Passed native membership security, paid access (anonymous/free/active/expired), planner security, learning security, reading security and release pause suites. Native browser pro-pause checks fourteen paid direct routes and responsive paused presentation.

A fresh-context native sync journey revealed a timing-dependent stale presentation snapshot: accountSync's existing hydration writes storage without sending PROGRESS_CHANGED_EVENT. `useAccountSnapshot` now also invalidates its memo on the current account identity and sync phase. This changes only display subscriptions. The final native browser test deliberately delays the real progress API and checks restoration after sync.

Fresh planner forms now leave the target date empty; the original helper's assumed January date is not shown as a student target. A valid explicit target is required when saving settings, past dates are identified, and date arithmetic uses the existing local task calendar. Unknown saved optional labels have an explicit, unsaved removal action; their historical attempts and progress are preserved.

The build generates unrelated dated Vistagram manifests/posts and question-ID artifacts. These generated source-tree changes are removed from the review diff after testing; no private or newly scheduled editorial material is part of this interface change.

## Scenario matrix

| Scenario | Executed evidence | Remaining boundary |
|---|---|---|
| Empty account | compiled fixture empty state; native fresh planner target unset | no academic seed writes |
| Returning records | fixture task/bookmark/result retained after navigation and refresh | full bookmark content reopening not browser exercised |
| Comparative selection | six-slot unit test and browser selector; previous statuses retained | new local display preference intentionally does not sync |
| Sample and another valid selection | shared validator unit tests; sample saved through native browser | official FPSC PDF recheck unavailable |
| Invalid/unknown choices | group validator; keyboard removal disables native form save; unknown correction preserves history | malformed historical variants reviewed in source |
| Free/active/expired/paused | native paid-access, pro-security, release-pause; native browser paused routes | no production entitlements changed |
| Suspended MPT | existing release gate and tests; fixture route redirects | MPT flag remains true |
| Slow load/API failure/save failure | delayed real native progress; 503 fixture panels; quota-failure task readback | offline reconnection with unsynced work not exercised |
| Other account | fixture account switch; native ownership/CSRF/account-binding suites | deliberately late live-browser responses across a switch not exercised |
| Active answer timer | answerTimerRecovery tests; native browser navigation/refresh check listed in validation | native mock examination navigation remains unverified |
| Midnight/overdue | native planner/reading date boundary checks; targetDays tests | no new timezone preference introduced |
| Keyboard/narrow layouts | six widths; mobile More→Subjects; sidebar collapse; keyboard optional validation | real on-screen keyboard and landscape review not performed |

Existing preservation boundary requiring review: public answer-timer recovery uses
`cssvista:single-answer-timer` and `cssvista:paper-attempt`, outside accountSync's
primary/tool-key allowlist. This change preserves those identifiers and the original
public timer contract. Same-user navigation/refresh continuity passed the native
browser journey. Ownership of those pre-existing device-wide snapshots across a
logout/account switch has not been verified; do not extrapolate the new workspace
preference/isolation checks into a claim of complete timer-record account isolation.
