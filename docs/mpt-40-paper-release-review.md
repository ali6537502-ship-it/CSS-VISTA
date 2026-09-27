# MPT 40-paper release standard (editorial release 2)

The official CSS Vista MPT series is 40 papers of 200 MCQs, built only from the reviewed
bank in `src/data/mpt/bank/` and checked in as `src/data/mpt/release/series.json`
(series `38127f5f5c8dcb7c`). The broad structure is FPSC's: Islamic Studies / Civics &
Ethics 20, Urdu 20, English 50, General Abilities 60, General Knowledge 50. Everything
below that level is a CSS Vista practice range, labelled in `src/data/mpt/blueprint.ts`
as *observed* (from the recorded 2022–2025 papers) or *internal*, and rendered in
`docs/mpt/editorial/BLUEPRINT.md`. None of it is an FPSC quota.

## Gates (all fail closed)

- `npm run audit:mpt-release` (prebuild): the bank validates; the checked-in series is
  exactly what the bank rebuilds; every paper passes every paper-level check and the
  series passes every series-level check.
- `build:hostinger` exports the papers, then `audit-release.mjs --exported` decodes the
  PHP files the server freezes and proves they are identical to the audited papers.
- `tests/mptRelease.test.mjs` (in `test:all`) repeats the gate, the served-question
  check, answer-key parity and time-sensitive provenance.
- `tests/mpt/refreeze.php` (CI, real database) proves unstarted mocks are re-frozen
  safely and started or attempted mocks never change.

Paper-level checks: section counts and order; every subtopic and group range; one
unseen passage; no Islamic numbering/source trivia; no Urdu literature; no
calculation-heavy science; no news-publication trivia; no templated Pakistan Affairs
wording; time-sensitive items sourced and inside the window; one use per General
Ability skeleton; no repeated numbers-masked template; difficulty shape; opening rule
(no challenging item in Q1–5, at most two in Q1–10); at most two challenging items in
a row; human-style review flags (database prompts, template wording, punctuation
defects, length giveaways, negative stems).

Series-level checks: no repeated id, text, concept or fact (same fact across sections
included); no near-duplicates (token-Jaccard ≥ 0.72 within a subtopic); no reuse of any
question served in an earlier series (`data-archive/mpt-served-archive.json`); General
Ability skeleton families in at most 20 of 40 papers.

## Measured result (this release)

- 40 papers, 8,000 questions, 8,000 distinct ids and concepts; 0 gate failures.
- Bank: 9,822 reviewed items and 48 original passages (Islamic 946, Urdu 976,
  English 2,614, General Abilities 2,860, General Knowledge 2,426).
- Series sources: 5,258 newly written, 2,278 generated with code-computed answers,
  186 source-backed recent Current Affairs, 209 re-verified repository items, 69
  re-verified past-paper items (2022: 39, 2023 Special: 24, 2024: 6 — each year
  confirmed against the paper text in `data-archive/mpt-past-paper-text/`).
- Difficulty: 2,482 accessible / 3,991 moderate / 1,527 challenging; per paper 51–69
  accessible and 34–42 challenging.
- General Knowledge per paper: Everyday Science 16–18, Current Affairs 14–17
  (3–5 recent, dated 1 Sep 2025 – 25 Sep 2026, each with a source URL, event date and
  verification date), Pakistan Affairs 15–19.
- English per paper: 6 comprehension questions on one unseen passage, 4–6 synonyms,
  4–6 antonyms, 5–7 sentence-correction items, plus prepositions, tenses, articles,
  agreement, modifiers, punctuation, error identification and structure.

Paper-by-paper figures are in the private report
`data-archive/mpt-release-reports/release-report.md` (not deployed).

## Current Affairs provenance

Recent items come from pages that were fetched and state the fact (mainly Al Jazeera,
Radio Pakistan, UN News, PID, Arab News and others). Reuters, AP, IMF and WEF pages
could not be fetched from the build environment, so items relying only on them were
dropped. Structural Current Affairs items state fixed facts and are not time-sensitive.

## Editorial rule

Automated checks are a floor, not a substitute for subject review. A disputed item is
corrected or removed in the bank, `npm run build:mpt-release` is re-run, and the report
is read before committing. Never loosen a gate to make a paper build.
