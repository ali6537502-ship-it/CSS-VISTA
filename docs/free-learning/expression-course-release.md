# Sentence and expression course release — 10 November 2026

The owner explicitly requested “deploy and check” after reviewing the free 16-chapter/33-lesson lab. This release is built on production main `1d5a29e00b878bc29341ecadb977399163a97fe1`, rather than merging the divergent broad draft #93. The latest 8–10 November Current Affairs and Vistagram releases are retained.

## Changes

- Add 16 chapters and 33 guided lessons to the existing Sentence practice mode at `/account/expression?view=studio`: 21 reviewed sentence lessons and 12 original expression lessons.
- Preserve the newer eight-lesson English Expression Guide as the default mode. Independent writing and existing bookmarks remain accessible; `view=writing` also resolves to the existing saved-writing lab.
- Extend explanations, fixed understanding checks, choice-specific feedback, paragraph exercises, self-review, independent revision and next-lesson navigation. Stored answers remain private until an attempt.
- Retain immutable source snapshots and writing versions, receipt recovery, stale-draft handling, ownership, profile and CSRF protections. Paragraph activities retain the proper writing kind and their stated practice minimums. Writing records indicate participation, not mastery or examiner marks.
- Preserve the currently deployed Grammar course. Its return link retains the exact originating sentence workspace and saved version. The independent editor retains earlier feedback while removing new assessment controls.

The production free-account conversion remains authoritative: all learning remains free; external processing and payments stay retired. No pricing, scanner, provider, paid entitlement, General Ability, MPT or private-topic publication is activated. All 30 non-sentence lessons are byte-for-byte equivalent as parsed records to current main. Existing Expression Guide and GSA Tutor source files are unchanged. No database migration or student-data reset is introduced.

## Validation

- Current lockfile installed; `npm run typecheck` passes.
- `npm run lint` passes with two existing warnings in unrelated pages.
- `npm run test:all` passes.
- `npm run build:hostinger:strict` passes, including MPT release, SEO, parsed sitemap, route, internal-link and content audits.
- `python3 scripts/skills/author-curriculum.py --check` verifies the authored package.
- Native `tests/skills/free-expression.mjs` passes all 33 lesson journeys, wrong/correct feedback, ordered independent writing/reflection/revision, storage kind, replay/conflicts, ownership/CSRF/authentication and reopening, without AI usage.
- Existing skills security and unit suites pass. The free-learning security and unit suites confirm free access, account/profile separation, retained read-only billing history and refusal of payments/external processing despite stale flags.
- The local PHP container initially lacked `ctype`; this caused an unchanged Current Affairs fixture check to fail. Installing the official matching PHP extension corrected the test environment; the policy suite then passed. No Current Affairs application source was changed.
- Built Chromium checks cover three complete guided journeys, mobile/tablet/desktop widths, axe WCAG A/AA checks, refresh and second-device recovery, independent save/rewrite/earlier-version recovery and the new Grammar return context.

All native accounts and writes used the disposable CI database with `@example.invalid` fixtures. No production student account or private record was created or modified for tests. Local artifacts do not establish production deployment: verify the merged commit against the live `/deployment-fingerprint.json` and check the actual public/account routing after Hostinger deployment. A full live authenticated save requires an approved existing student session and is distinct from the isolated end-to-end evidence.
