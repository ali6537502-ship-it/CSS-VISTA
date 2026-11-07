# Free learning and retirement of AI evaluation

Owner decision recorded 5 November 2026. This supersedes the earlier Pro access/pricing and AI-assessment launch plans. It does not authorize production release.

## Confirmed product scope

- There will be no new paid CSS Vista Pro tier. The remaining formerly Pro learning features become free in the existing account workspace: guided sentence/expression learning, argumentation, analysis, essay themes, Précis lessons and independent practice, General Ability, reviewed CA/PA topics, preparation tools, progress and access to owned human mentor records.
- Cancel the study-picture scanner, OCR extraction and handwritten-evaluation journey. This does not cancel profile photos or unrelated site imagery.
- Cancel all new AI evaluation of student work: sentence/paragraph diagnosis, Précis feedback, argument strength/analysis critique, essay/thesis/outline assessment and handwriting assessment. No model-generated marks, criticism or equivalent assessment may be reintroduced under a different label.
- Keep deterministic exercise marking, authored explanations/hints, independent writing, revisions, saved comparisons and actual progress. These are learning functions, not cancelled AI assessments.
- Human mentor marks/comments and earlier student work remain owned records. This instruction does not cancel human evaluation services or promise that unrelated consultation/notes services become free.
- Conceptual source-bound study explanations are distinct from evaluation. If retained, Ask VISTA must not become a back door for cancelled student-work assessment. Existing provider and usage protections remain for any independently retained AI explanation service; cancelled evaluation activation is no longer a launch requirement.

## Access and preservation contract

Use a real free-learning access policy, not fabricated membership expiry/status. Remove payment requirements at both frontend and server layers, including direct resource/API routes and resume queries. Preserve authentication, account ownership, CSRF, conflict detection, receipts, administrator authorization and any profile requirements that are independent of payment. Free access does not make personal records or private source files publicly readable.

Replace the Free/Pro account split, stars, upgrade prompts and membership sales navigation with truthful learning navigation. Preserve old URLs through appropriate destinations where possible. Remove scanner/evaluation entry points and new-action controls, while retaining a clearly scoped history path for existing saved text and feedback.

Stop new Pro orders, payment submissions, renewals and coupon redemptions for access. Retain historical payments, grants and redemptions for legitimate account/admin/support access; do not rewrite paid records as free or delete financial history. Existing records are not authorization to collect further money.

Retire new upload, reservation and dispatch paths for cancelled features on the server, not just buttons. Preserve existing operation identities, persisted outcomes, usage accounting and safe status recovery. Do not issue another model call to recover a cancelled assessment. Reconcile any genuine accepted/in-flight operations without silently losing work, duplicating calls or inventing outcomes. Preserve existing approved temporary-image retention/cleanup protections; cancellation is not permission for an unreviewed bulk purge.

Reading and fixed checks remain free of model calls. Previously reviewed lessons and private editions must not be discarded or automatically published during the access migration. MPT and preparation-strategy hibernation remain unchanged.

## Inspected implementation dependencies

Inspected development head: `964beeb50e4f7bfe83c2394bc16736ea55993dad`, draft PR #93. The current main baseline is `4c0a2e16d77f1546da64719673285fb2cc655b23`; it includes a later narrowly scoped Précis release exception. Reconcile that newer implementation before adapting access logic; do not overwrite it with the older helper signature.

| Verified location | Existing behavior requiring migration |
| --- | --- |
| `public/api/_pro.php` | Product/order lifecycle and shared active-membership guard. Main's guard has a scope argument and a Précis release exception. Preserve release controls and financial records separately from free learning access. |
| `public/api/_premium.php` | Private Ability/Current Affairs delivery checks release state, membership and profile. Removing account stars alone will leave direct resources locked. |
| `public/api/_learning.php` | New generic Précis writing explicitly calls the paid guard. Preserve saved writing ownership/version protections while removing the purchase requirement. |
| `public/api/_skills.php`, `public/api/student/skills.php` | Resume/catalogue and mutations have membership checks; the student endpoint dispatches evaluation through `_skills_ai.php`. Keep guided work, retire assessment dispatch. |
| `public/api/_ai.php` | Shared reservations and dispatch coexist with owned operation history. Preserve the ledger/recovery; block cancelled scopes from new reservations and provider dispatch. |
| `public/api/_expression.php`, `public/api/_precis_feedback.php`, `public/api/student/precis-feedback.php` | Separate diagnosis/assessment configuration, reserve and execute paths require retirement; independent writing and stored feedback must survive. |
| `public/api/_handwriting.php`, `public/api/student/handwriting.php` | Upload, extract/evaluate and owned history/cleanup are distinct paths. Retire new scanner work while protecting saved text and private image lifecycle. |
| `src/pages/AccountHome.tsx`, `src/features/membership/AccountSections.tsx` | Separate Free/Pro choices, badges, membership summary and scanner entry still exist. Replace the sales split without discarding learning destinations. |
| `docs/pro/paid-feature-policy.md` | Historical paid-access contract; superseded by this owner decision. Its old tests are not proof of the new free policy. |

These verified locations are starting points, not a complete search of every paywall or evaluation caller. Native Ability, topics, briefing/reading, mentor APIs, route guards, static delivery, navigation, provider workers, commercial endpoints and availability responses still need a complete dependency trace in the restored workspace.

## Validation required before calling the migration implemented

Test authenticated accounts with no membership, active and expired historical memberships; direct URL/API/file delivery; legitimate profile requirements; and anonymous/foreign-account denial for private records. Exercise actual course learning, fixed checks, independent drafts, cross-device conflicts, revision and saved history. Verify no new Pro order or cancelled AI reservation/provider call can be created, including direct requests and delayed dispatch. Confirm owned historical feedback and human mentor records remain available. Retain negative upload/scanner checks and privacy controls. Run relevant PHP, TypeScript, lint, browser/security suites and the production build in isolation.

## Current status — 7 November 2026

The environment is restored. The free Sentence and English Expression Lab now has a development implementation with 16 chapters and 33 guided lessons, existing account-owned writing/revisions, free server access and cancellation guards for new AI evaluation/scanning. See [the implementation and validation report](free-expression-lab.md).

This is a focused increment, not completion of every legacy paid gate. The owner's latest scope skips Ask VISTA, My Answer Performance, CA/PA, maths and reasoning exercises in this build. Preserve their histories and unrelated public resources. The wider free-account navigation and access conversion outside the expression lab remains pending; do not represent it as completed.

The earlier unavailable-environment/policy-only checkpoint is historical. Local builds and focused native/browser tests now exist, but do not certify hosted CI or production. Private CA/PA artifacts were not reopened or republished for this task.

No deployment, main merge, private publication, payment activation, provider call or production mutation was performed. Reconcile later main changes before an eventual owner-authorized release; the release hold remains active.
