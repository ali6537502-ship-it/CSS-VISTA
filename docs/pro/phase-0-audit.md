# CSS Vista Pro: Phase 0 audit and execution contract

Inspected 7 October 2026 against `main` / `7b01d0126b07d0bf8626b0b3d365a01a3b64ff5a`. The working tree was clean. Live `deployment-fingerprint.json` matched this commit; `/api/health.php` reported native accounts, reachable database, private storage and SMTP ready. No production writes occurred. Significant work uses `feature/css-vista-pro-foundations`; review and explicit release authorization precede merging/deployment.

The supplied Unified Master Prompt is the governing product brief. The complete supplied Master Précis Writing Handbook was read through its source appendix (22 chapters, three appendices). The owner subsequently approved **PKR 1,950** for **PRO — 30 DAYS**. Terms, support expectations, proof retention and permitted business collection remain undecided. Payment instructions must not invite transfer until approved launch configuration exists.

## Verified architecture and reuse

| Boundary | Inspected implementation | Finding |
| --- | --- | --- |
| App and navigation | `src/main.tsx`, `src/App.tsx`, `src/components/Layout.tsx` | React 19, TypeScript, Vite, React Router; existing lazy routes, Tailwind/Radix/Lucide. Preserve shell and navigation. |
| Accounts | `AccountProvider.tsx`, `hostingerApi.ts`, `public/api/auth/`, `_account_auth.php`, `_bootstrap_core.php` | Same-origin PHP/PDO/MySQL, HttpOnly session, CSRF and expected-user protection. Reuse existing UUID. |
| Eligibility | `ProfileGate.tsx`, `StudentProfilePanel.tsx`, `public/api/_profile.php` | Twelve checks on actual saved profile; server enforcement. Payment must not bypass them. |
| Admin | `src/pages/admin/Admin.tsx`, `public/api/_admin_auth.php`, `admin/*.php` | Separate owner password/TOTP session and CSRF; reuse, never a client admin flag. |
| Learning | `store.ts`, `progress.ts`, `accountSync.ts`, `hostingerSync.ts`, `pages/account/` | Local-first progress plus account synchronization; existing task, syllabus and performance records. Do not delete or reset them. |
| MPT | `pages/mpt/`, `lib/mpt/`, `public/api/_mpt*.php`, `server/sql/010_mpt_exam_system.sql` | Existing server-scored examinations, applications, frozen papers, roll numbers and history. Retain. |
| Briefing | `features/current-affairs/`, `content/current-affairs/`, `_current_affairs.php` | Git-validated private editions imported into MySQL; separate public magazine/dossier experience. |
| Writing | `AnswerEvaluation.tsx`, `useAutosavedDraft.ts`, `testSeriesRequests.ts` | Human mentor service already identified honestly. Do not introduce AI full-answer/essay marking. |
| SEO/deployment | `routeRegistry.mjs`, `RouteSeo.tsx`, `scripts/build-target.mjs`, Hostinger workflow | Five independent route policies; actual React prerender; `build:hostinger` → `dist` including PHP and Apache routing. Private payment pages must be noindex and ad-free. |

No existing subscription/order/payment-grant implementation was found. Supabase and Sites historical artifacts are not permission to change the active architecture. Available Hostinger AI Builder tools are not the Git production deployment control. No production SQL credential, owner session or OpenAI API credential is bound to this workspace.

## Existing Grammar audit and preservation

`/grammar-course` mounts `src/pages/GrammarCourse.tsx`, importing `grammarCourse.ts` and `grammar-course/phase1.ts` through `phase5.ts`. There are **30 days, 480 auto-checked questions (4 warm-up + 12 drill per day), 180 corrections, 285 worked examples**. Rules include authored explanations/models; lessons retain goals, terms, pitfalls, exam application and independent writing. `toolkit.ts` supplies lookup. Complete day/title/phase/count/question-ID/correction-ID mapping and source hashes are in `grammar-preservation-map.json`.

`cssvista:grammar-course:v3` preserves `completed`, best `scores`, `mistakes`, `notes`, `currentDay`. Answers/correction drafts are component state and disappear on lesson changes or refresh. Best quiz score alone is not mastery or a complete attempt history. The course key is **not** included by `accountSync.ts` (which selects `cssvista:v1`, `cssvista:progress:v1`, `cssvista:tool:*`); do not claim course continuity across devices. The shared browser course key needs an explicit account-bound migration before private synchronization. Anonymous records must not be silently assigned to the wrong account.

`/language-grammar` loads English/Urdu reference JSON and mounts `MasterGrammarCourse.tsx` for its embedded master course. That separate course has `css-vista-master-grammar-progress-v1`. Preserve both datasets and keys until an explicit mapping is reviewed; do not discard one based on its name. Inspect and inventory that reference/master curriculum in the Grammar phase before modifying it.

Strengths: lesson-specific authored practice, immediate reasons, wrong-answer retry, worked corrections, mistake notebook, toolkit, meaningful day sequence. Evidenced gaps: per-question/draft resume, sync ownership, full score history, exact links between lesson and reference topic, writing-error links and maintenance revision. Proposed Phase 4 migration: retain stable day/question IDs and teaching text; migrate with a versioned, reversible account-bound mapping; keep legacy reads and original backups; add structured attempt evidence rather than rewriting best scores. Normal reading and fixed exercises make zero AI calls.

## Source inventory and academic checks

| Source | Status | Boundary |
| --- | --- | --- |
| Supplied Précis handbook | Supplied and fully read; stages mapped below | Not yet published or transformed into lessons. Examples/drills are instructional, not official past questions. |
| Existing Grammar | Current active course mapped; parallel reference/master experience located | No curriculum or progress changes in this increment. |
| Official syllabus/past papers | Repository JSON/PDFs and mapping code located | New hierarchy needs source-by-source verification; observed repository data does not prove every mapping correct. |
| Handbook official 15+5 marks claim | Source link supplied; official FPSC PDF returned HTTP 503 on recheck | Retain pending verification for newly published teaching; never claim live verification succeeded. |
| 86 Current Affairs source topics | No complete owner-source inventory established | Do not create 86 invented modules or assert existing `caTopics` equals the supplied authoritative collection. Source material and mapping remain required. |

Handbook map: chapters 1–4 orientation/central idea; 5 skeleton; 6 selection; 7 compression; 8 paraphrasing; 9 fidelity/qualification; 10 coherence; 11 Grammar links; 12 titles; 13 deterministic length; 14–15 guided rough work; 16 errors; 17 expression; 18 authored worked passages; 19 self-check rubric; 20 fixed drills; 21 optional 30-day sequence; 22 final checks; appendices A/B targeted compression/correction, C source distinction. Its /50 self-check rubric is instructional, not an official examination marking scheme. One-third is explicitly a convention when no question limit is stated.

## Experimental work and access conflicts

Unmerged PR [#77](https://github.com/ali6537502-ship-it/CSS-VISTA/pull/77), `feature/mistral-writing-pilot`, adds `_mistral.php`, handwriting API/component and `011_ai_learning.sql`. Reviewed changed files and API/schema flow. Reusable ideas: correction/confirmation UI, server quotas, normalized writing storage and safe upload boundaries. It does not establish the required common Pro entitlement/operation lifecycle; its provider defaults and simplistic call counters must not become production policy. Do not merge it wholesale, close it or retire data without instruction. Reserve a distinct migration number to avoid its SQL collision.

Grammar, public Current Affairs and Vistagram are currently reachable through existing public/account flows. The new specification targets Pro, but explicitly forbids silent revocation. **Preserve access** pending an approved, feature-specific migration policy. Existing free resources and MPT remain free. This increment adds membership infrastructure without applying it to existing routes.

## Data and deterministic preparation contract

Pro grants attach to `users.id`, never to a second account or a course. Proposed/implemented payment responsibilities are described in `phase-1-membership.md`; they are independent of learning state. Phase 1B now adds `preparation_attempts` (owned UUID, target year, student target date, optional-subject shortlist, daily minutes and version), immutable writing versions, operations and anchored findings; see `phase-1-learning.md`. Official target dates, certified subject combinations and evidence-linked learning events remain later work. No backfill or readiness score until mappings and evidence eligibility are verified.

The later hierarchy is existing Subject → verified Section → Topic → Subtopic → stable available resource IDs. A versioned planner selects due revision, demonstrated weakness, syllabus work, writing and tests within stated minutes, with stable tie-breaking and explanations. Persist task IDs; preserve completed/partial work when replanning. Source frequency is one signal, never a prediction. Declare coverage independently from practice, mentor marks, revision and readiness. Missing resources are unschedulable; insufficient evidence is not mastery. Document denominators/window/weights before displaying percentages.

## Model and quota contract

On 7 October, official [model catalogue](https://developers.openai.com/api/docs/models) and [GPT-6 Luna page](https://developers.openai.com/api/docs/models/gpt-6-luna) named API identifier **`gpt-6-luna`** and supported structured output. This verifies public documentation, **not this account's API access**. Responses client, image input, usage semantics, pricing and real account limits must be verified before enabling. No silent substitution and no model call without a private key. Pricing-derived costs remain unavailable until a verified configured schedule exists.

Phase 1B implements one disabled server-only configurable Responses client and persisted owned operations: stable request ID + payload hash → atomic Karachi-date reservation → release locks → provider → schema/excerpt validation → result and successful allowance. Client timeout stays pending; status recovery precedes retry. Failures release successful allowance only when outcome known; provider cost is separate. Allowed scopes exclude essay/full-answer marking. Initial configurable allowances: précis 2, typed paragraph 5, sentences 15, tutor 20, Current Affairs 10, Maths 10. Handwriting extraction/evaluation allowance is still a separate decision (3–5 range must not be shipped as policy); OCR abuse accounting remains distinct. No AI calls for reading, quizzes, planner, readiness or word counts.

## Design and user journeys

Reuse `AccountPage`/existing account shell, white surfaces, slate body text, restrained existing deep-green accent, Lucide icons, 4px spacing scale, `max-w-5xl` page / `max-w-2xl` reading measure, 16px body with comfortable line height, `rounded-xl` surfaces, subtle slate borders and minimum 44px actions. Use visible focus, text status labels, natural error copy and no gradients/decorative metrics. Existing CSS supports reduced motion; respect it. Membership is a secondary account link and one restrained summary, not a second dashboard or upgrade-banner wall.

Membership composition: heading/back link → status + exact Karachi expiry → one plan/terms panel → owned orders and details. On mobile stack by action priority; no wide payment table. Admin: existing private workspace → filtered pending queue → expected/received comparison → reviewed-state action → immutable history. Only confirmed persisted state displays approval. Keyboard forms have visible labels; errors preserve inputs; refresh/background updates retain valid content and ignore stale responses.

Priorities: same-account free → explore Pro; eligible member → order → transaction claim → pending → actual administrator receipt verification → one grant → resume; expired → history preserved → renewal; unauthorized → existing login/profile recovery. Return paths must be validated internal destinations, never external URLs or arbitrary query strings. No purchase action while launch dependencies remain missing.

## Phases and exact next increment

1. **Phase 1A (implemented for review):** common membership summary/page, server-configured product at approved PKR 1,950 with collection off; additive order/submission/grant ledger; exact thirty-day renewal; owned order history; CSRF-protected manual review with database uniqueness/locks; server entitlement helper. Optional screenshot collection stays unavailable pending retention policy. No premium content gate migration or live payment collection.
2. **Phase 1B (implemented for review):** minimal account-owned attempt settings and immutable writing versions, operation/accounting lifecycle, configurable disabled primary AI client, member/admin usage reports and concurrency/failure tests. No public AI evaluation endpoint, OCR, full planner or Grammar migration; details in `phase-1-learning.md`.
3. **Phase 2 (implemented for review, launch disabled):** owned one-page uploads, extraction/correction/confirmation-bound feedback, shared accounting, private image retirement and recovery; see `phase-2-handwriting.md`.
4. **Phase 3 (implemented for review, evaluation disabled):** typed sentence/paragraph diagnosis, immutable rewrites, zero-call comparison and conservative recurring-error evidence; see `phase-3-expression.md`.
5. **Phase 4 (implemented in review increments):** preserved authored course, guided sessions, mixed/focused Error Lab, scheduled revision, account/attempt-scoped continuity and a deterministic Personal Grammar Profile combining self-practice with independent writing findings; see `phase-4-grammar.md`. Stable/Mastered classifications remain withheld pending calibrated independent assessment. No production deployment or live AI launch.
6. **Phase 5A (implemented for review):** complete handbook mapping, optional 30-day course, 39 fixed recognition drills, six instructional sources, staged independent writing, titles/counts/self-checks, immutable source-bound revisions, delayed handbook comparison and owned expiry-safe history; see `phase-5-precis.md`. Phase 5B adds source-bound evaluation/revision evidence for review; live feedback remains disabled, as documented in `phase-5-precis-feedback.md`.
7. **Phase 6 (implemented for review):** account-owned human answer states, student-entered mentor marks, immutable correction history, linked retries, filtered performance and deterministic topic revision evidence; see `human-mentor-records.md`. No AI full-answer marking or official certification of student-supplied references.
8. **Phase 7 (implemented for review, live help disabled):** source-bound Ask VISTA, four help modes, immutable one-parent context, owned recovery/history and separate tutor/Maths/Current Affairs quotas; see `phase-7-ask-vista.md`. No full-answer/essay marking, human-mark changes or unverified all-topic coverage.
9. Phases 8–9 follow the supplied dependency order: deterministic attempt/planner integration; verified Pro content migration.

Verification: actual PDO/MariaDB persisted payment effects plus concurrency, duplicate/conflicting identities, ownership/CSRF/profile checks, tampered price/duration, receiver/amount mismatches, rejection/resubmission, offline activation, exact expiry and preserved learning. Existing lint/types/build/test suite and route policy checks remain mandatory. Browser review at mobile/desktop plus failures/refresh and no overflow. Fixtures are isolated/test-only, never production users or receipts.

Release dependencies: approved terms/version, permitted collection confirmation, support expectations, evidence-retention policy if collecting images, source/access migration decisions, private AI credential/account capability, official academic source checks. Major PR remains unmerged and undeployed until explicit authorization. Phase 1A/1B are reviewable foundations, not a completed commercial or AI launch. Verify unresolved release dependencies before enabling either.

Phase 5B continuation: dedicated source/title/rubric-bound Précis feedback, immutable input snapshots (additive migration 017), owned operation recovery, independent revision comparison and source-specific evidence are implemented for draft review. Shared language findings feed existing Grammar/Writing profiles. Live AI remains disabled; actual provider calibration, disclosure and production recovery validation remain release prerequisites. See `phase-5-precis-feedback.md`.
