# Bounded MCQ editorial repair — 15 October 2026

This pass improves the existing central GK question bank; it does not certify the entire collection or establish why Google rejected the site. The owner-reported AdSense wording remains “low quality content”. No production deployment, Google-account action, new public page or publication-status change occurred.

## Actual content changes

**56 existing questions now have question-specific explanations:** 30 General Ability number-series questions (`general-ability-4801` through `general-ability-4830`) and 26 English grammar/vocabulary questions. All 26 English explanations link to an inspected British Council grammar lesson or Cambridge Dictionary entry in the existing post-answer “Review source” interface. The original examination source is unknown; these references support the explanation and are not presented as examination provenance.

The number-series solutions show the actual arithmetic, including interleaved sequences, alternating operations, repeated differences, sums of previous terms and prime-number differences. Automated calculation checks verify the stated rule against **every supplied term and the missing position**, rather than merely checking that an explanation mentions the keyed option. A finite number sequence can admit multiple mathematical continuations; these explanations present a consistent conventional pattern, not a proof of a unique possible sequence.

**One demonstrated answer-key error was corrected:** `english-grammar-6407`, “Commander: Commands”, was keyed to option 0, “Aerates: Aviator”. It now points to existing option 1, “Senator: Legislates”. This preserves the person → action relationship; the original option reverses it. Cambridge's commander, senator and legislate entries, together with the US Senate's own powers description, support the correction. The options, their order, question ID and stem remain unchanged. No stored attempt or historical score was rewritten or recalculated.

Full before-records, exact patches, source links, calculation proofs and the correction rationale are in [`reviewed-mcq-explanations.json`](../../scripts/editorial/reviewed-mcq-explanations.json). Public HTTP response fingerprints and short source-verification excerpts are in [`mcq-editorial-sources-2026-10-15.json`](evidence/mcq-editorial-sources-2026-10-15.json). Sources were inspected on 15 October 2026; no publication date was invented for dictionary or grammar material.

## Measured scope and remaining work

| Collection | Actual rows | Missing explanations before | Missing explanations after | Completed explanations in this pass |
| --- | ---: | ---: | ---: | ---: |
| General Ability | 900 | 400 | 370 | 30 |
| English Grammar | 2,599 | 2,413 | 2,387 | 26 |
| Entire central bank | 37,627 | 23,491 | 23,435 | 56 |

These are repository counts, not production, Search Console or AdSense measurements. Missing explanations do not alone establish that a question is wrong or an interactive practice page lacks value. This pass has not completed an independent factual review of the other **37,571 central-bank questions**. It has not rewritten the separate CSS-subject bank, Current Affairs collection or protected/hibernated MPT releases.

Nine additionally inspected English rows remain in an explicit editorial queue. They were preserved unchanged and are **not** counted as completed repairs:

| ID | Verified issue or unresolved interpretation | Next editorial action |
| --- | --- | --- |
| `english-grammar-4882` | The apostrophe stem does not specify singular/plural ownership; more than one option can be grammatical. | Clarify intended ownership using the original exercise. |
| `english-grammar-4901` | A railway can run across, over or by a river depending on the unstated situation. | Specify whether it crosses or follows the bank. |
| `english-grammar-6401` | The intended choose/discard analogy is unclear, with multiple possible opposite-action pairs. | Review the source and make the tested relationship explicit. |
| `english-grammar-6402` | Cup:Tea and Vase:Water both admit a container:contents relationship. | Review the options and intended relation before changing the key. |
| `english-grammar-6406` | Wine:Brewery does not establish a sound equivalent to Coin:Mint; alternative production relationships also need review. | Recover the authentic exercise; avoid guessing a new key. |
| `english-grammar-7206` | Both Horse and Lamb have hooves. | Narrow the stem or replace a distractor after editorial review. |
| `english-grammar-7225` | “Shallot” is a small onion; no offered option supplies the required category. | Compare with the original source. Do not silently assume the author meant “shallop”. |
| `english-grammar-7231` | Desire:Hate versus Desire:Indifference is sense-dependent. Cambridge's thesaurus lists aversion/dislike as antonyms of desire. | Preserve the existing key until a sense and intended source are established; a proposed automatic correction was rejected during research. |
| `english-grammar-7253` | The instruction is absent; multiple choices are grammatical active forms, and one inserts an unstated agent. | Recover the intended voice-conversion instruction and source. |

The machine-readable ledger includes each unchanged snapshot and its reason. Further editorial work should prioritise malformed or ambiguous questions, then dated/contested facts and explanations that merely repeat the answer. It should not generate thousands of interchangeable explanations or claim that every row is independently verified.

## Preservation and regression checks

Both serving copies were updated together: `public/mcq/` and `src/data/mcq-shards/`. Comparison with the branch's `HEAD` established that all **37,627 IDs and their order** were preserved, only the 56 ledger-listed records changed, and every question stem, option array/order and subject label remained unchanged. The only answer-index change is documented above. Category/index totals and generated metadata were not changed.

Successful checks on 15 October 2026:

- `node --test tests/mcqEditorial.test.mjs`: **6 tests passed**, including arithmetic against all sequence terms, source-backed correction, unchanged ambiguity queue, source-drift refusal, copy mismatch refusal and forbidden option/wording changes.
- `node scripts/editorial/reviewed-mcqs.mjs --check`: **56 reviewed questions, 1 documented key correction**; both serving copies match the ledger.
- `node scripts/audit-mcq-data.mjs`: **37,627 questions and 37,627 unique IDs**; public/bundled copies and category counts pass.
- `node scripts/clean-english-islamiyat-mcqs.mjs --check`: 2,599 English rows retained, zero required edits; 3,818 Islamiyat rows retained, with the already-documented cross-ID historical-source candidate still reported.
- `node scripts/clean-mcq-quality.mjs --check`: zero removals requested from the 37,627 central questions or 42,804 separate CSS questions.
- `npx eslint scripts/editorial/reviewed-mcqs.mjs tests/mcqEditorial.test.mjs`: passed.

The review utility defaults to a read-only check. Explicit `--apply` replays only pre-reviewed patches and checks every target shard before writing. A changed original row, missing/duplicated ID or mismatched public/bundled copy stops the operation. It cannot change stems, options, identity or classification. Future editorial decisions should update the ledger and tests deliberately.

## Modified-file record

| Files | Purpose |
| --- | --- |
| `public/mcq/cat-general-ability-6.json` and its bundled copy | 30 existing numerical reasoning explanations. |
| `public/mcq/cat-english-grammar-{6,7,8,9}.json` and their bundled copies | 26 sourced explanations; one demonstrated key correction. |
| `scripts/editorial/reviewed-mcq-explanations.json` | Individual before-records, patches, calculation proofs, inspected references and unresolved queue. |
| `scripts/editorial/reviewed-mcqs.mjs` | Review replay and read-only drift/copy checks. |
| `tests/mcqEditorial.test.mjs` | Six substantive content-preservation and calculation regressions. |
| `docs/seo/evidence/mcq-editorial-sources-2026-10-15.json` | Public source HTTP status, inspected date, response fingerprint and short evidence excerpts. |
| `docs/seo/MCQ_EDITORIAL_REVIEW.md` | Scope, measured results, limitations and remaining editorial decisions. |
