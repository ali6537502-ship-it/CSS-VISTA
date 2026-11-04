# Précis source-preserving import

The earlier importer deliberately replaced chapters 2 and 18 and appendix C and filtered chapter-20 answers. Those transformations are removed. A future import keeps every supported, non-empty body paragraph, heading, bullet and table in source order. Practice sources are additional copies; they do not replace the chapter text, commentary or solutions.

This is importer preparation, not certification of the uploaded book. On 4 November 2026 the chat supplied the filename `Master_Precis_Writing_Handbook (1).docx`, but the attachment path was absent from the selected workspace. No original source was read or re-imported, and the served handbook catalogue is unchanged. The older audit's missing-content findings remain open.

## Prepare and review a candidate

Use the actual accessible source file, without renaming unrelated documents or reconstructing missing author text:

```sh
python3 scripts/precis/import-handbook.py /path/to/source.docx \
  --output /tmp/precis-candidate.php \
  --manifest /tmp/precis-import-manifest.json
python3 tests/precis/test_import_handbook.py
```

The output path is mandatory, and source/output/manifest paths must differ. Parsing, title verification, the 22-chapter/appendix A–C sequence, non-empty chapters, six complete practice copies and block accounting are validated before either candidate file is written. Unsupported text containers, nested tables and embedded media/notes fail rather than silently disappear. Files that fail validation leave any previous candidate and manifest intact.

The importer trims outer paragraph whitespace and ignores empty paragraphs. It preserves internal text, run joins, explicit tabs/line breaks and paragraph boundaries within table cells. It stores the front matter separately from the numbered chapters. This is structured text preservation, not preservation of Word pagination, fonts or layout. Source editions with unsupported structures require an explicit mapping and review before import.

The generated catalogue includes the original file SHA-256, a separate digest of the actual imported content, and a per-chapter block-count/content-digest manifest. The separate digest is necessary because the old file hash alone did not identify changes made by the importer. The independent manifest repeats this evidence for review.

## Before replacing the served catalogue

1. Compare every chapter, example, explanation, exercise, table and answer with the real source. Verify the front matter is accessible in the final reader. Keep any editorial examination-rule caveats separate from author text.
2. Compare the candidate with the current catalogue. Current reading-unit IDs are positional (`chapter:blockIndex`); restoring omitted blocks can reuse an old ID for different text. Existing completion IDs and tab-local notes must not be interpreted against the new content without a reviewed mapping.
3. Prepare a migration that retains the earlier edition and its notes/completions, transfers only verified identical units, and leaves restored material unread. Raw-DOCX hash equality does not establish unit identity. Bind future progress to the imported-content digest as well.
4. Preserve owned writing sources, immutable revisions, model-reveal history and student records. They are stored snapshots and must not be rewritten to match a new catalogue.
5. Rerun native API/browser checks and source-fidelity verification before marking the remake ready for release. Passing the synthetic importer tests alone does not verify the real book or authorize deployment.

## Regression scope

`tests/precis/test_import_handbook.py` constructs an explicitly synthetic DOCX. It checks exact block ordering, the formerly removed/replaced chapters and answers, table paragraph boundaries, tabs/line breaks, numbered subsections, manifests and both hashes. It also checks that malformed examples/structure cannot overwrite existing candidate files. These tests prevent the known importer failure from recurring; they cannot supply or certify missing source text.
