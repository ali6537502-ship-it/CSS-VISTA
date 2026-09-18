# Question banks — verification status

Source material extracted from five supplied files and checked before any of it is
published. **Verification status differs sharply between banks. Read this before
wiring any of it into a route.**

Nothing here is referenced by `src/data/routeRegistry.mjs` yet. These are data
files only; adding a route for them is a separate change.

## Files

| File | Rows | Status |
|---|---|---|
| `mpt-past-papers.json` / `.csv` | 540 | **Verified.** Every answer determined independently, then compared with the source key. |
| `mpt-past-papers-unresolved.json` / `.csv` | 23 | **Do not publish.** Cannot be answered — see `basis`. |
| `mpt-past-papers-corrections.json` | 34 | Log of source keys that were wrong, with the reason. |
| `gk-2026-publish-queue.json` | 276 | Mixed — check the `ready` field. |
| `gk-2026-blocked.json` | 27 | **Do not publish.** Wrong answers, destroyed questions, one editorial problem. |
| `everyday-science-UNVERIFIED.json` | 1858 | **Not fact-checked. Do not publish as-is.** |

## MPT Past Papers

Section name: `MPT Past Papers`. 563 questions parsed; 540 carry a verified answer.

- 276 — my answer matched the source key
- 230 — source supplied no answer; the answer here was worked out during review
- 34 — **source key was wrong and has been corrected** (see the corrections log)
- 23 — unresolved, held back in the separate file

Maths and reasoning answers were solved and checked by computation; the working is
in each row's `basis` field. Factual answers rest on the reviewer's knowledge, not
cited sources. Rows whose `basis` says `CONTESTED` or `low confidence` need a
subject editor before they go live.

Known gap: the source document claims 616 questions. 563 were recovered; the rest
have no option table in the .docx and were not extracted.

## GK 2026

Split by the `ready` field:

- `ready: true` — 148 rows, clean text, safe to publish
- `ready: false` — 128 rows, answer verified correct but the question text still
  carries OCR damage. **Retype from the source PDF before publishing.**

## Everyday Science — read this

**Only 90 of 1,858 rows were fact-checked.** Four wrong answers were found in that
sample and corrected here (`corrected_key`); every other row is marked
`NOT VERIFIED`.

At the observed rate (4.4%) roughly 60–80 more wrong answers remain in the
unchecked rows. The bank passes every structural check — no duplicates, no
contradictions, every answer letter resolves to a real option — which makes the
remaining errors easy to miss. Its own source header states the answers "have not
been independently fact-checked".

Errors already corrected:

| # | Key said | Correct |
|---|---|---|
| 1210 | Green is *not* a primary colour | Yellow — red/green/blue are the primaries of light |
| 1539 | Venus has the longest year | Mars — 687 days vs Venus 225 |
| 1495 | Earth is 4th largest | 5th |
| 66 | Biotype = same phenotype | same genotype |

## Not covered

- The 1,768 unchecked Everyday Science rows
- 1,253 idioms and 795 word groups in the Website bank (no language check)
- Reading-comprehension items whose passages were not in the source documents
