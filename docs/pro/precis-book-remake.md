# Précis book remake — development draft

The owner requested a remake faithful to the **MASTER PRÉCIS WRITING STEP-BY-STEP HANDBOOK**, with no overlapping courses and the strongest existing features retained. The earlier source audit is recorded in `docs/audits/precis-2026-10-31.md`.

## What this draft changes

- One active workspace: **Read the handbook**, **Write and revise**, and **My drafts and revisions**. Book chapters open directly, without a duration/setup gate.
- The existing chapter renderer is reused for whole chapters and tables. The two obsolete course screens are removed; scheduling helpers and existing reading-plan records remain for compatibility.
- Chapter 18 presents the five retained original passages, extracted teaching notes and handbook responses through the existing authenticated native endpoint. Models are not bundled into public JavaScript. The separate owned-practice comparison gate remains in place.
- Saving opens the saved record. Revising loads its existing ID and latest version into the existing composer, so a revision creates another version of the same record. Saved-writing and older-version URLs work again. Earlier versions remain readable and comparable.
- Chapter-position saving uses the existing versioned progress action without marking a day complete. Earlier plan counts and retained tab-local notes remain readable. No schema, source-unit identity or handbook hash changes, no progress migration, and no deletion of student records.
- The importer no longer replaces chapters 2/18 or appendix C and no longer filters chapter-20 answers. It prepares an explicitly named candidate and preservation manifest, retaining all supported body blocks. Four synthetic regression groups cover preservation, failure without overwriting, output evidence and invalid structure. This repairs future import behavior; it does not restore the absent source. See `docs/pro/precis-source-import.md`.
- Existing authored recognition checks remain supplementary practice in the same workspace. The limited checker retains word counts and bounded checks; valid irrealis and mandative subjunctives are protected from the two confirmed false corrections. Legacy external feedback comparison is shown only when its existing availability flag permits it; the remake activates no provider.

## Source limitation — not a completed transcription

On 4 November the owner supplied a DOCX attachment reference, but its named file is not materialized in the execution workspace. Connected Drive search also returned no copy. The original file bytes remain unavailable for comparison. The importer previously replaced chapter 18 and removed answer-key material; chapter 2 and appendix C contain editorial replacements. This draft does not invent missing material or describe it as restored. Source-review notices identify those gaps.

The served handbook text, edition hash and block identities are deliberately unchanged until the original can be compared. Full re-import and any required progress migration need that source file. Do not merge or deploy this draft as the completed book remake while those gaps remain.

## Required verification

- `npm run test:precis`: existing count/source/schedule/checker tests plus book routing, valid-subjunctive regressions and the synthetic Python importer checks. These tests are included in native CI.
- TypeScript and lint on the changed source and browser tests.
- Native `tests/precis/security.mjs`: worked-example authentication, complete-profile and expected-account checks, free access, exact five-example scope and no answer-key exposure in the ordinary catalogue.
- Built `tests/browser/precis-book.mjs`: a real free native account reads without setting a course duration, opens an example, creates a draft, reopens it, revises the same record, compares versions, opens a retained handbook model and follows an older-version URL. It checks narrow/wide history/table layouts and absence of evaluation dispatch.
- Existing Pro-pause browser checks must keep free Précis reading available while paid/AI capabilities stay held.

Final acceptance still requires comparison of every chapter, example, exercise and answer against the original book. Passing functional tests does not substitute for that comparison.
