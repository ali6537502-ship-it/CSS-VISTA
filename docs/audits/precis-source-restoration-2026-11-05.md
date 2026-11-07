# Précis source restoration — 5 November 2026

The actual uploaded **Master_Precis_Writing_Handbook (1).docx** is now accessible. Its raw SHA-256 exactly matches the hash embedded in the old catalogue, confirming the source edition and the earlier audit’s omission findings. No source text was invented to fill gaps.

## Source-to-reader inventory

| Item | Earlier stored catalogue | Restored catalogue |
| --- | ---: | ---: |
| Chapters/appendices | 25 | 25 |
| Front-matter blocks | 0 | 33 |
| Chapter blocks | 256 | 293 |
| Chapter 2 blocks | 2 editorial replacements | 4 original blocks |
| Chapter 18 blocks | 1 application placeholder | 25 original blocks |
| Chapter 20 blocks | 25, answer key removed | 32, full answer key |
| Appendix C blocks | 2 editorial replacements | 6 original blocks |
| Writing-source copies | 6 | 6, byte-for-byte identical |
| Generated reading units | 108 | 121 |

The restoration also preserves paragraph boundaries inside table cells, which the old extractor concatenated. This changes some table text serialization without changing author wording. Blank paragraphs and Word layout/formatting are outside the native-block representation.

All 351 non-empty document-body blocks are accounted for: 33 front-matter blocks, 25 chapter headings and 293 chapter blocks. An independent XML/text test compares every source word and punctuation token with the served book in order, including every table cell. `docs/audits/precis-source-manifest.json` records the raw-source digest, imported-content digest, per-chapter counts and per-chapter content digests. The actual-content digest is `607555988d7d2532f615aeaf8ad2fa3dde50180e4344b370b450da526bb5e5c3`.

The title occupies three cover paragraphs in the real DOCX. The importer validates their joined title while retaining those original paragraphs individually. It no longer assumes the title is a single paragraph. Unsupported text structures stop the import rather than being silently discarded.

## Earlier progress and notes

Restoring text changes positional reading IDs even though the raw DOCX hash is unchanged. Automatically treating the old hash as the current edition would therefore be wrong.

- The exact earlier catalogue is frozen at `data-archive/precis/stored-edition-before-restoration.json`.
- The compatibility manifest records every earlier unit ID, original section label and unit digest. Exactly 94 of 108 have a unique, exact block/text match within the same chapter. Ambiguous or changed units receive no target ID.
- Existing plan rows retain their original version, duration, completed IDs and raw-source hash. Reads identify them as an earlier edition and derive only exact matching current IDs. No database row is rewritten, and restored sections receive no completion credit.
- New plan actions use the imported-content digest. Old/unknown-edition setup/mark requests are rejected for review, preserving their records rather than interpreting positional IDs against different text.
- Earlier tab-local note keys are read through the legacy map with their original labels. A note for the old chapter-18 placeholder remains an earlier-edition note; it is never assigned to the first restored example. Account/reset namespaces remain unchanged.
- Chapter positions remain valid because the same 25 chapter IDs/titles remain. Saved writing sources, immutable versions, model-reveal records and recognition responses are untouched.

This is a read-only compatibility treatment, not destructive migration or automatic completion transfer. Unknown editions remain preserved without inferred matches.

## Audit disposition

The original audit remains a historical record of the earlier live implementation. Source omission/replacement findings are repaired in this draft. The single book workspace repairs schedule-gated navigation and the disconnected history/revision flow. The two demonstrated grammar false positives have regression coverage. The six short passages are still exactly the book’s stored writing sources; the application does not claim they are a comprehensive assessment programme.

The author’s examination claims and source citations are preserved as author text. Separate study notes advise following current FPSC/question instructions. Source fidelity is not independent examination-rule verification.

Functional validation uses the real source, focused tests and the disposable native account/browser environment. Production data is not used for fixtures or modified. The same draft PR holds the changes; no extra course or planner/dashboard rewrite is introduced.
