# Précis book remake — source restored

The owner requested one free, straightforward Précis workspace faithful to **MASTER PRÉCIS WRITING STEP-BY-STEP HANDBOOK**, keeping the strongest existing tools and student records. The source audit is recorded in `docs/audits/precis-2026-10-31.md`; the verified restoration is recorded in `docs/audits/precis-source-restoration-2026-11-05.md`.

## Final behavior

- One active workspace: **Read the handbook**, **Write and revise**, and **My drafts and revisions**. All 22 chapters and appendices A–C open directly, without a duration/setup gate. Purpose, cover text and original contents are accessible through the introduction link.
- Every supported non-empty source block is retained in order: 33 front-matter blocks and 293 chapter blocks. Chapters 2/18/20 and appendix C contain the author’s original text, worked examples, commentary and answer key again. Separate study notes in chapters 2/25 advise following the current examination syllabus and question instructions without rewriting the author’s words.
- Chapter 18 uses the same chapter renderer as the rest of the book. Its five originals, explanations, models and titles are readable directly. Links open those same passages in the existing composer. There is no parallel worked-example course. The earlier worked-example endpoint remains compatible with old clients.
- Saving opens the saved record. Revising loads its existing ID/latest version into the composer, creating another immutable version of that record. Saved-writing and older-version URLs work; versions remain comparable. All six writing-source copies are identical to the earlier catalogue, and existing stored sources/versions are not rewritten.
- Earlier reading records are retained as an earlier edition. A separate content digest prevents the unchanged raw-DOCX hash from silently reusing positional IDs after restoration. Exact-text mapping identifies 94 of 108 earlier units, without modifying their database rows or awarding completion to restored material. Old tab-local notes use their original IDs/section labels; they are not looked up against new unit positions.
- Chapter-position saving keeps its existing versioned action and does not mark reading complete. No schema migration, deletion or production data write is required for the read-only compatibility treatment.
- Existing authored recognition checks remain supplementary practice. Their answer keys retain the response contract. The handbook’s own models and answer key are intentionally readable by free authenticated students; the owned two-version comparison tool remains a separate revision aid.
- The limited local checker retains word counts and bounded checks, including regressions for valid irrealis/mandative subjunctives. No external AI service, payment or subscription is activated.

## Source and reproducibility

The source was successfully received on 5 November 2026 through the new file upload. Its SHA-256 is `e1b36b54b25edc343a460eb73fec43e63d68210f5044e70727a72fbe1c071561`, exactly the raw file hash recorded by the old importer. It is archived outside the web root at `data-archive/precis/master-precis-writing-handbook.docx`.

`python3 scripts/precis/check-handbook.py` reproduces and checks the PHP catalogue, source manifest and compatibility map against the real DOCX and the frozen earlier catalogue. The independent real-source test compares every source text token, including table cells, with the served book in order. This proves structured text preservation, not Word pagination/font/layout reproduction or independent verification of the author’s examination claims.

## Verification

- `npm run test:precis`: 22 Node tests, five Python regression groups (including the real uploaded source), and the reproducible source/compatibility check.
- TypeScript and lint on changed source/browser tests.
- Native API tests: free source reading, ownership/profile/expected-account checks, existing writing/revision behavior, earlier-edition reads without mutation, stale positional-ID rejection, and unchanged recognition-answer contracts.
- Native browser: reading without a schedule, front matter, complete example/model, earlier tab-note recovery, earlier completion status, save/reopen/same-record revision, older-version URL, version/model comparison, restored answer key, and 320–1440px history/table/exercise layouts. No evaluation dispatch.
- Existing Pro-pause journeys remain required. No release or production write is performed by these checks.

The PR remains a development draft for review. Source restoration resolves the missing-file blocker; it does not itself merge or publish the release.
