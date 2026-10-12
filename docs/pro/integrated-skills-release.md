# Integrated Pro learning release and remaining completion work

Prepared 12 October 2026. This report distinguishes code, isolated student workflows, educational review and production activation. It does **not** declare the entire master assignment done.

## Initial state and reconciliation

The audited authoritative baseline was `36272671458a460333eed81bcb92c3cd2fb5677a` (PR #88), also verified in the live Hostinger deployment fingerprint. [The initial audit](completion-audit-2026-10.md) records the feature inventory, PR #78 and subsequent work, overlapping older branches and access-policy reconciliation.

Native PHP/MySQL accounts, membership, writing versions, preparation attempts, AI operations/reservations, Grammar, Précis, Expression, handwriting, contextual tutoring, topic publication and mentor records already existed. This release extends those systems. It does not replace the accounts, writing ledger, provider transport or payment system.

## Actual changes

- Added 51 original instructional lessons: 21 sentence, 15 argumentation and 15 analysis lessons, with explanations, different worked examples, one fixed recognition check and independent staged writing. Authored examples are hypothetical instructional material, not purported past questions or factual findings.
- Added account-owned Sentence Studio inside Expression and independent Argumentation/Analysis routes. The seven-stage Essay Builder uses all 25 existing themes and preserves the 2,619 roadmap directions. It supports three selected levels, independent thesis/argument/analysis/outline/draft work and immutable saved versions.
- Added explicit linked practice and return: select a saved response or a Unicode passage, refine it in another studio, compare and save a new parent version. Partial returns preserve the surrounding essay. Changed selected text or concurrent account updates require comparison rather than silent overwriting.
- Extended the existing operation/usage system with purpose-built qualitative rubrics, exact student-text anchors, unverified-evidence flags, bounded requests, immutable accepted input, notice hashes, no-repeat recovery and separate new scopes. Their approved limits remain unconfigured/zero. No real AI or money collection was activated.
- Added scoped Ask VISTA contexts for actual saved skill stages, individual Ability lessons and individual published topic sections. The tutor cannot cite unverified student wording as factual authority. Exercise answers and private full libraries are excluded.
- Added four Ability units: logical inference, ordering/arrangements, coding/decoding and explicit-rule classification. The full course now has 25 topics, 75 lessons/exercises and 125 quiz questions. Deterministic grading remains authoritative. The original 21 maths units are unchanged; compatible historical evidence, last position and local drafts are preserved only after exact unit-hash checks.
- Connected saved work to preparation recommendations, the existing Writing Workspace, Grammar/Error Lab, dashboard, account navigation and AI Usage. Recorded participation is explicitly separate from demonstrated understanding and mastery.
- Added read-only private topic-package validation. The existing four-framework package contains 40 sections and 60 checks. Validation does not import, publish, establish academic approval or complete conversion of all 107 source files.

### Implementation locations

New server code: `public/api/_skills.php`, `_skills_core.php`, `_skills_schema.php`, `_skills_ai.php`, `student/skills.php`; additive `server/sql/025_integrated_skills.sql`. Existing writing/account identity and immutable version tables remain authoritative. MySQL JSON object formatting/key order is normalized for source and accepted-input identities; real content/list changes remain significant.

New client: `src/features/skills/api.ts`, `useStudioSave.ts`, `Studio.tsx`, `src/pages/account/Skills.tsx`. Integration edits: `App.tsx`, route registry, AccountHome, account Expression/Learning/AiUsage/shared navigation, EssayThemeDetail, membership return destinations, topic Lesson and Ability Course/API.

A focused `src/components/Layout.tsx` interaction fix preserves scroll restoration while preventing a pressed control from moving before its click completes.

Existing server extensions: `_learning.php`, `_learning_core.php`, `_ai.php`, `_expression.php`, `_grammar.php`, `_planner.php`, `_tutor.php`, `_tutor_context.php`, `_tutor_core.php`, `_ability.php`, `_ability_core.php`, and student tutor/ability/AI Usage endpoints. Helpers and course payloads remain private under Apache access controls. `server/config/config.example.php` documents disabled new configuration; no private configuration was committed.

Private curriculum assets: `_premium_files/skills-curriculum.json`, expanded `_premium_files/general-ability-course.json`; authoring/check scripts under `scripts/skills` and `scripts/ability`, with a previous-edition compatibility manifest. Private CA/PA originals, extracted workbooks and the unpublished package remain outside Git.

Operational/content tooling: `server/bin/pro-topic-package-check.php`; [provider activation/academic validation requirements](ai-activation-and-validation.md).

Tests: `tests/skills` covers pure curriculum, native ownership/stages/recovery/transfers and labelled synthetic-provider lifecycle; Ability pure/native tests include independent reasoning and historical compatibility fixtures; Tutor pure tests reject student-claim citations. `tests/browser` contains pinned test-only Playwright dependencies, a loopback HTTPS built-app runtime and two actual student journey suites. `.github/workflows/pro-foundations.yml` runs them against isolated MySQL 8 in addition to the preserved regressions. No browser-test dependency enters the production application bundle.

## Feature completion matrix

“Isolated verified” means synthetic accounts in the disposable database using the real UI/API/persistence. It never means a live student workflow or real provider calibration.

| Feature | Existing state / work completed | Workflow and test evidence | Remaining limitation / AI / production |
| --- | --- | --- | --- |
| Sentence Studio | Added guided course inside existing Expression, saved independent versions and Grammar links | Native fixed checks/stages, concurrency, draft-vs-revision targeting, history, UI save/refresh/device/expiry and linked passage return | Implemented; real instructional AI activation and academic validation blocked. Production authenticated journey requires an authorized account. |
| Argumentation | Added 15 authored lessons and claim→reason→evidence→counterargument→rebuttal→final writing | Native full progression, rubric persistence, owned transfers/history; built entry/save/resume | Implemented; real criticism depends on legitimate provider activation, reviewed notice and approved allowance. No AI-generated argument presented as live. |
| Analytical Skills | Added 15 authored lessons and mechanisms/conditions/alternatives/evidence/trade-offs/conclusion | Native full progression, immutable input, transfer/history; built entry/save/resume | Implemented; real formative evaluation/calibration and allowance remain blocked. |
| Advanced Essay Themes | Preserved catalogue/roadmap; added three levels, seven staged independent responses, outline/draft, linked refinements | All 25 theme sources/levels checked, native progression/transfers; built save/recovery/version/device/passage-return journey | Implemented guided workspace; live AI evaluation and theme-specific academic calibration remain incomplete. Stage text completion is participation, not proven essay quality. |
| Précis Mastery Lab | Retained handbook, passages, checks, timers, original-bound drafts/titles/revisions, feedback and comparisons | Existing 191 pure content/schema assertions, 29 feedback assertions and native course/feedback regressions pass | Existing implementation preserved; real provider activation/calibration and production student workflow unverified. Existing daily policy retained. |
| Expression Lab | Retained independent writing and feedback history; guided records cannot be detached by generic edits/evaluation | Native ownership, consent/version identity, separate quotas, expiry/history and comparison regression pass | Real sentence/paragraph feedback activation unverified; no new default allowance imposed. |
| General Ability | Added four reasoning units; preserved maths and prior-edition evidence | 200 answer keys independently checked (168 maths + 32 reasoning); all-unit native gates and complete new reasoning checks/quizzes; built mobile/desktop choice flows | Guided defined scope implemented and deterministically checked. Optional AI conceptual help remains subject to existing provider configuration. |
| Handwriting | Preserved secure images, explicit corrected-text confirmation, independent revision and cleanup architecture | Existing upload/size/format/ownership/confirmation, no-repeat, expiry and cleanup regressions pass | Real vision capability, genuine-handwriting academic trials, owner limits, retention and cleanup operations still require verification/approval. |
| Ask VISTA | Preserved bounded source snapshots/history; added owned skills, selected Ability and published-topic contexts | 437 pure source/model/citation assertions; native original lifecycle plus new source publication/withdrawal/ownership checks pass | Implemented; actual provider access and pedagogical calibration remain unverified. |
| Pro CA/PA Topic Learning | Preserved reviewed native import/version/publish/lesson/check/recall workflow; added offline validator and section tutoring | Native synthetic editorial/student/edition/expiry regression passes; private four-module structure validated | **CONTENT INCOMPLETE**: all 107-file conversion/review is unfinished. Authenticated production catalogue/publication unavailable. Structure validation is not publication. |
| Current Affairs | Preserved protected published briefings and native reading linkage | Paid-access and published/corrected/withdrawn/future-source reading regressions pass | No unrelated article/state changes. Private live catalogue was not inferred from public health. |
| My Answer Performance | Preserved human records, marks/corrections, repeat attempts and weighted history | Native ownership/paid access/concurrency/subject/filter/repeat/expiry tests and 23 pure assertions pass | No mentor marks/comments rewritten. Live authenticated records were not inspected or used for destructive testing. |
| Preparation/continuity | Retained attempt identity; added actual recorded-stage resume candidates and source/version basis | Existing learning/planner/reading regressions, 225 planner assertions; built signed-in second-device resume | Implemented integration. Recommendations describe recorded evidence, not invented readiness or mastery. |
| Dashboard/progress | Added functional starred Pro destinations and truthful blocked-feedback states | Type/lint/route/build checks; built widths 320,390,768,1024,1440 | No fake scores, achievements or preview feedback in production. Full live authenticated responsive journey still requires a legitimate test account. |
| AI engine/accounting | Reused native transport and reservation ledger; added feature-specific schemas, immutable notices/context and zero-default new buckets | Native synthetic schemas/anchors/ownership/concurrency/recovery/unknown outcome/preflight release; MySQL-key normalization tests | **IMPLEMENTED — AI ACTIVATION BLOCKED**. Synthetic valid JSON does not establish academic accuracy or real provider availability. |
| Membership/payments | Preserved PKR1,950/30-day manual orders, admin receipt verification, expiry and renewal | Native closed collection/tampering/CSRF/transaction reuse/concurrent review/renewal/history regressions pass | Real collection remains subject to purchase terms, approved channel, support, retention and launch authorization. Safepay was not found or invented. |
| Existing free services | No access-policy reversal; free Grammar preserved; paid owner policy retained | Grammar catalogue/key preservation, standard suite, native Grammar/free Science/paid-access and profiles/planner regressions | Preservation is verified in isolated tests and source diffs; not a claim that every production student's records were queried. |
| MPT / strategy hibernation | Preserved suspension, schedules/archives/records and existing editorial bank | Existing MPT state/release/audit gates and unchanged suspension controls | Remain hidden; this release does not reactivate them. Pro Max remains out of scope. |

## Validation and evidence

- `npm run typecheck`, `npm run lint`, `npm run test:all`: pass; the standard suite comprises 185 tests, zero failures.
- `npm run build:hostinger:strict`: pass, including MPT release gate, protected content packaging, SEO/route/private artefact and internal-link audits. Existing large-chunk warnings remain; new Studio code is lazy loaded. An uncommitted local build fingerprint is **not** release evidence.
- `python3 scripts/skills/author-curriculum.py --check`, `python3 scripts/ability/author-course.py --check`, `node tests/ability/content.mjs`, `node tests/ability/reasoning.mjs`: pass. Math and inference keys are checked independently of authoring functions.
- Pure PHP suites for skills, Ability, topics, reading, planner, tutor, mentor, membership, learning, handwriting, Expression, Grammar and Précis pass; changed server/helper/CLI PHP syntax checks pass.
- Native disposable-database suites for all the above workflows pass, including dedicated Précis feedback and new skills/AI/source/reasoning tests. Test-only model responses are labelled and isolated. Changed notice/model configurations release undispatched reservations without charging or calling a provider. JSON normalization preserves accepted source/input identities.
- Built HTTPS browser journeys exercise all four new entries, one-at-a-time practice, save/resume, source-owned Ask VISTA, lost-response receipt recovery, immutable comparison, selected-passage refinement and explicit return, independently signed-in device and expired read-only history. Reasoning browser journeys test all four new units with wrong/correct choices, reopened saved feedback and free/Pro/expired access. Widths 320–1440 are checked; screenshots are private test artefacts, not production metrics.
- Offline topic validation records `STRUCTURE_VALID_NOT_PUBLISHED`: four topics, 40 sections, 60 checks and four source checksums; private package SHA256 `5b4846d66c7735e5510f0790b7e58c748e70ffa7fd1942328d79d79b5a5cd451`. No private content was pushed or published.

Local reruns initially exposed an expired synthetic admin session, overlapping fixture configuration, outdated built counts, browser selectors that assumed unnormalized punctuation/open history and a root-owned screenshot directory. These were corrected and relevant checks rerun. The substantive MySQL JSON identity issue, including published-topic tutor verification through the existing normalizer without changing historical hashes, was fixed and regression-tested before release. The built browser also identified a shared scroll-restoration defect: releasing temporary height on pointer-down moved a submit button before pointer-up. Restoration cancellation now retains that height until the interaction/click completes; the actual reasoning browser journey covers the failure. No unresolved product test failure is intentionally hidden.

## Release and exact remaining work

This document accompanies the deployable code. GitHub checks and the exact live deployment fingerprint, rather than merge alone, establish release status. The final PR report records the actual merge/deployment SHA and public live checks. Native schema 025 is additive and uses the project's existing schema initialization/deployment convention; production table status and authenticated persistence must not be inferred from an anonymous health check.

Remaining external prerequisites:

1. Legitimate native production administrator/hosting connection for private configuration readiness, schema inspection, controlled activation and topic publication; an authorized student test session for live workflows. Do not request or paste keys/passwords in chat.
2. Actual approved provider/account model and text/image capability verification, processing notices and representative real-provider academic validation. Provider flags alone are insufficient.
3. Owner-approved new reasoning/essay AI allowance policy, plus handwriting limits and temporary-image retention/cleanup policy. Defaults stay closed.
4. Commercial purchase/refund/support/privacy/retention terms, payment-channel approval and collection release authorization. Price/duration remain approved and unchanged.

Remaining implementation/content work:

- Convert and academically verify the full 107-file private collection, reconcile updated editions/topic mappings, prepare validated lesson/learning/recall/writing packages and publish approved versions through the existing native administrator. Four framework modules are not completion of that collection.
- Conduct genuine AI academic calibration and repair any feature-specific feedback defects it reveals. No real-provider examples have been represented as successful in this session.
- Complete the authorized live end-to-end student/provider/admin journeys once the above connections are available.

## Preservation bounds

All schema changes are additive; no production data reset, table/column deletion, student-result alteration, history rewrite, force push, DNS/billing change or credential rotation occurred. Existing immutable writing, mentor marks, account identities, original maths curriculum and exact-compatible evidence are retained. Free Grammar and current paid access policy were checked. Private source originals/checksums remain outside Git. Production student data was not used for destructive tests, and no fictional grades or achievements were inserted into production.
