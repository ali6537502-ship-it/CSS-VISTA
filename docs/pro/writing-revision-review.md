# Private writing revision review — 12 October 2026

Owner direction: defer the large CA/PA source conversion, finish the other Pro work first, and keep Pro hidden until the final release is explicitly authorised. Retained PDFs, checksums and the five prepared partial modules remain private. Word documents may help later; no replacement originals or complete-source conversion are claimed.

## Changes prepared

The existing Sentence, Argumentation, Analysis and Essay studios already save stage responses in immutable account-owned writing versions. Their comparison previously showed only the combined wording, which obscured changes to separate activities. Linked practice also automatically selected the first lesson at the parent's level.

`src/features/skills/RevisionComparison.tsx` now compares the selected activity in two saved versions. It distinguishes revised, unchanged, added and absent responses, displays recognition choices as wording, and retains the full-text comparison. It reports differences only: neither a changed activity nor a shorter response certifies quality, mastery or examination readiness. Reading comparisons makes no model request and does not change saved records.

`src/features/skills/Studio.tsx` lets a student choose the linked lesson and its existing progression level, with an accessible label and separate lesson description. The default retains the previous same-level selection. The native server still validates the chosen feature/lesson/level, owns the selected source version, preserves the source passage and requires explicit adoption of a returned revision.

The next curriculum review found that a three-word participation minimum blocked legitimate sentences such as “I studied.” and imperatives such as “Stop.” from advancing or requesting diagnosis. Sentence draft/revision participation now needs one actual word. Reflection and other features keep their existing minima. The display and AI preflight follow the same rule; empty and punctuation-only submissions do not earn participation. This permits practice, not a judgement that the sentence is correct.

The minimum is applied as a current practice rule without changing existing immutable source snapshots, source hashes, answers or historical evidence. Future saves append new versions using the current rule. No database migration, account policy, allowance, provider prompt, educational source or release gate changes are required. Comparisons use the existing authenticated version endpoint and remain available in the existing read-only expiry history. Private source materials and answer keys are not added to Git.

## Validation

The extended `tests/browser/skills.mjs` exercises the built React interface and native PHP/database with synthetic accounts in `cssvista_briefing_test`. It checks actual earlier/later wording, revised/unchanged/added activity labels, recognition wording, selection of a different linked lesson, preserved selected-passage return, save recovery, another signed-in device, expiry comparison and widths from 320 to 1440 pixels. It also checks that reading comparisons issues no writing request and that no provider calls occur.

All of the following passed on the final code:

- `npm run typecheck` and `npm run lint`.
- `npm run build:hostinger:strict`, including the existing route, link and SEO artifact audits. Existing bundle-size, Browserslist, JSON-import and thin-content notices remain; no new build failure was introduced. The generated Vistagram timestamp was restored to avoid unrelated churn.
- `php tests/skills/unit.php` in the isolated PHP container: curriculum scope, actual theme levels, preserved roadmap, evidence boundaries and anchored rubrics.
- Short-sentence assertions passed for one-/two-word practice, unchanged legacy snapshot hashes, empty/punctuation-only responses, independent revision and consistent displayed minima. The native lifecycle passed with “Stop.”/“Wait.” draft/revision; the TEST ONLY AI lifecycle passed with “Stop.”; and the actual browser passed with “I studied.” unlocking reflection. PHP syntax checks also passed. No real-provider accuracy is implied.
- `node tests/skills/security.mjs` against the isolated native runtime: all four guided journeys, deterministic checks, ownership, concurrency, exact receipts, conflicts, immutable transfer/return and expiry history.
- The extended `node tests/browser/skills.mjs`: actual browser/API/persistence journeys described above, zero page errors and zero provider calls. The initial browser run caught a description included in the new selector's accessible label; the label/description were separated before the successful final run.
- `git diff --check`.

Local evidence is retained in `/workspace/scratch/pro-writing-review-{build,lint,native,browser}.log` and `test-artifacts/skills-comparison-mobile.png`. The mobile comparison screenshot was visually inspected. Isolated tests are not proof of real-provider educational quality or authenticated production workflows.

## Release status and next work

This increment is prepared on a development branch, not merged into `main` or deployed. The production pause is unchanged. No new content publication, payment collection or AI activation is authorised.

Continue core writing and learning quality review before CA/PA expansion. Real AI release still requires the legitimate provider connection, approved processing notices and feature allowances, and representative academic calibration through the actual source-bound workflows. Handwriting additionally requires approved image handling/retention and genuine handwriting trials. Commercial launch requires purchase/refund/support/channel/retention approval in addition to the retained PKR 1,950/30-day configuration. These are separate from reversible private development.
