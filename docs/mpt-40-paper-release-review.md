# MPT release standard (editorial release 3: the live series, repaired)

## What changed and why

Students complained about the General Knowledge, General Abilities and Islamic Studies
questions in the mocks. Editorial release 3 does not build a new series from scratch. It
takes the papers already frozen for the remaining mocks and repairs them question by
question:

- the running series is 40 mocks (two a day, 15:00 and 22:30 PKT, from 25 Sep 2026);
  Mocks 1–4 had been held by 27 Sep 2026, so **36 papers** are repaired, for Mocks 5–40;
- a live question is **kept exactly as it is** unless it has a concrete defect
  (`scripts/mpt/live-review-rules.mjs`); every rule names the defect;
- only defective slots are **replaced, in place**, from the reviewed bank
  (`src/data/mpt/bank/`) with an item from the same section and official heading that
  most resembles the real FPSC papers (`scripts/mpt/resemblance.mjs`) at an accessible or
  moderate level;
- no extra papers and no new questions are created; every bank item not used stays in the
  bank as **reserve** for any mock added later (nothing is deleted);
- the scheduler stops at the planned 40th mock (`CSSV_MPT_PLANNED_MOCKS`, default 40), so
  reserve papers never turn into unplanned mocks.

The repair is deterministic (`scripts/mpt/repair-live-series.mjs`). The live series it
starts from is archived in `data-archive/mpt-live-series-b054de7.json`; the kept
questions are checked in verbatim at `src/data/mpt/release/live-kept.json`; the paper
list is `src/data/mpt/release/series.json` (series `4b65e98fcd9c99e3`). Every replacement
and its reason is in the private `data-archive/mpt-release-reports/replacements.json`.

## Paper structure: the official FPSC one only

Five sections with their official sizes (Islamic Studies / Civics & Ethics 20, Urdu 20,
English 50, General Abilities 60, General Knowledge 50), each built from its official
syllabus headings, every heading present in every paper. FPSC sets no count for any topic
inside a section and CSS Vista imposes none (`src/data/mpt/blueprint.ts`,
`docs/mpt/editorial/BLUEPRINT.md`). A slot keeps its heading where the bank allows; the
headings of General Abilities and General Knowledge are paced so that the last paper is
balanced like the first.

## Difficulty

The MPT is a screening test and General Abilities is SSC-level. Replacements are
accessible or moderate: across the 36 papers, 2,488 accessible, 3,710 moderate and 37
challenging (all 37 in English; none in General Abilities, Islamic Studies, Urdu or
General Knowledge). General Abilities replacements per paper: 18–26 accessible, 31–42
moderate, 0 challenging.

## Measured result

- 36 papers, 7,200 questions, 0 gate failures.
- Kept from the live papers: **965** (Islamic Studies 212, Urdu 184, English 221,
  General Abilities 19, General Knowledge 329).
- Replaced from the reviewed bank: **6,235** (Islamic Studies 508, Urdu 536, English
  1,579, General Abilities 2,141, General Knowledge 1,471). Main reasons: General
  Abilities items from about 34 code templates repeated across every paper (1,858);
  machine-template wording such as “Which date-place pair correctly matches…” (English
  1,417, General Knowledge 858, Urdu 525, Islamic 465); calculation-heavy “science”
  (280); verse-count / numbering trivia (61); Urdu literature and rhetoric (89);
  catch-all options, stale or pop trivia, sports minutiae, repeats of Mocks 1–4.
- Per paper: General Abilities quantitative 32–37 / reasoning 23–28; General Knowledge
  Everyday Science 15–26, Current Affairs 9–14, Pakistan Affairs 14–22; one unseen
  English passage of 5–6 questions.
- Reserve left in the bank: General Abilities 719, General Knowledge 955, English 1,035,
  Islamic Studies 438, Urdu 440.

Known limitation: 566 kept live questions carry no explanation, exactly as they were
frozen. Their question, options and key are unchanged.

## Gates (all fail closed)

- `npm run audit:mpt-release` (prebuild): the bank validates; the checked-in series is
  exactly what repairing the archived live series against the bank rebuilds; every paper
  and the series pass `scripts/mpt/repair-audit.mjs`.
- `build:hostinger` exports the papers, then `audit-release.mjs --exported` decodes the
  PHP files the server freezes and proves they are identical to the audited papers.
- `tests/mptRelease.test.mjs` (in `test:all`): rebuild equality; 36 papers for Mocks 5–40
  and a scheduler cap at 40; kept questions verbatim and defect-free, from their own paper;
  every bank item fills a replaced slot of the same paper; nothing from Mocks 1–4; bank
  answers match; General Abilities at most one challenging replacement per paper;
  official headings present in every paper.
- `tests/mpt/refreeze.php` (CI, real database) proves unstarted mocks are re-frozen safely
  and started or attempted mocks never change.

Paper checks: section sizes and order; every official heading present; one passage of
5–10 questions; kept items pass every defect rule; bank items verified, explained,
never served in an earlier series, sourced and in date if time-sensitive; no catch-all
option; no repeated question frame more than four times in a paper; one topic once per
paper in the factual sections; no two answers alike in a factual section; General Ability
skeleton at most once per paper. Series checks: no repeated id, text, numbers-masked
template, same fact or near-duplicate; General Ability skeleton in at most 20 papers.

## On deployment

The server re-freezes every mock that has not started (opening more than 15 minutes
later, no attempts) from this release: mock 5 gets repaired paper 1, and so on. Each old
paper is backed up first and every replacement is logged. Held, started or attempted mocks
are never touched. If a mock was already held when the deploy happens, its repaired paper
simply stays in reserve.

## Editorial rule

Automated rules are a floor, not a substitute for subject review. A disputed live item is
added to the review rules or a disputed bank item is corrected in the bank, `npm run
build:mpt-release` is re-run, and the report is read before committing. Never loosen a
gate to make a paper build.
