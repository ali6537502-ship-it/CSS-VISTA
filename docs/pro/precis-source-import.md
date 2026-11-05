# Précis source-preserving import

The earlier importer replaced chapters 2/18 and appendix C and filtered chapter-20 answers. Those transformations are removed. The real DOCX was received on 5 November 2026 and is archived at `data-archive/precis/master-precis-writing-handbook.docx`, outside the web root. The reader now uses its complete structured text.

## Reproduce the verified edition

```sh
python3 scripts/precis/check-handbook.py
npm run test:precis
```

The check reproduces the served PHP catalogue, independent manifest and earlier-unit compatibility map. It fails on any difference. After reviewing an intentional source/parser change, `python3 scripts/precis/check-handbook.py --write` prepares those artifacts; it does not mutate student records or publish a release.

For a separate candidate from an accessible source:

```sh
python3 scripts/precis/import-handbook.py /path/to/source.docx \
  --output /tmp/precis-candidate.php \
  --manifest /tmp/precis-import-manifest.json
```

The output path is mandatory; source/output/manifest paths must differ. Parsing, the joined cover title, 22-chapter/appendix A–C order, non-empty chapters, six complete practice copies and block accounting are validated before outputs are written. Invalid imports preserve existing candidate files. Unsupported body/table text containers, nested tables and embedded media/notes stop the import for explicit mapping.

The importer trims outer paragraph whitespace and ignores empty paragraphs. It preserves internal text, run joins, explicit tabs/line breaks and paragraph boundaries within table cells. Front matter is stored separately and rendered through the introduction link. Word fonts, page layout and pagination are not reproduced.

The catalogue/manifest include the original file hash, a separate imported-content digest, per-chapter counts and per-chapter digests. The original file hash alone cannot identify changes made by the importer: the restored source has the same raw hash as the earlier transformed catalogue.

## Preserve earlier student records

The frozen earlier catalogue and generated compatibility map retain all 108 old reading IDs/labels. Only 94 unique exact matches are identified; changed or ambiguous sections are not assigned completion. Existing plan rows remain unchanged and are shown as an earlier edition. New reading actions bind to the imported-content digest; old/unknown editions cannot apply their positional IDs to different text.

Earlier tab notes use the original keys/labels. Writing sources and immutable revisions are stored snapshots and are not rewritten. See `docs/audits/precis-source-restoration-2026-11-05.md` for the full inventory and compatibility treatment.

For any future edition, compare every source block and regenerate a reviewed compatibility mapping. Preserve prior records/notes; never infer completion from matching numeric positions or raw-DOCX hash alone.

## Regression scope

Five Python test groups cover synthetic preservation/failure cases and the actual source. The real-source test independently compares the complete ordered source text with the served book, including table cells, and checks the generated artifacts. Native API/browser tests verify account isolation, historical notes/completions, restored models/answers and writing/revision flows. Source-text preservation does not certify the author’s factual claims or replace functional verification.
