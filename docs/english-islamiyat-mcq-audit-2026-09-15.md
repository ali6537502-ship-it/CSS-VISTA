# English and Islamiyat MCQ integrity audit

Date: 2026-09-15

## Outcome

- English records audited: 2,819
- English records retained: 2,599
- Corrupted or ambiguous English imports removed: 205
- Repeated English vocabulary, idiom or analogy items removed: 11
- Conflicting duplicate English analogies removed: 4
- Islamiyat records audited before cleanup: 6,047
- Previously audited Islamiyat records retained: 3,790
- Internally contradictory September workbook records quarantined: 2,257

## Why the Islamiyat batch was quarantined

The imported workbook was not merely inconsistent in spelling. It assigned conflicting answers to identical facts, misclassified numerous questions, contained a broken Quran topic label, and mixed unsupported traditional trivia with source-verifiable material. Selecting answers from that batch would require guessing. The complete defective import was therefore removed from the student-facing bank while the previously audited Islamiyat bank was preserved unchanged. Git history retains the source batch for any later source-by-source reconstruction.

## Permanent guard

The repository test suite runs this cleaner in check mode. A future change fails if the quarantined Islamiyat IDs, corrupted English option joins, ambiguous composite answers, or the detected duplicate relation patterns reappear.

## 14 October 2026 provenance-guard correction

The permanent guard above originally rejected every future question with a numeric ID in 8449–10705. Git history establishes that commit `7385d36b1de0197dda7d7587bb8063c100cfe033` (28 September, “Import GK Master OCR question bank into the GK MCQ database”) subsequently reused IDs 8449–8476 for 28 different source rows. All 28 current rows exactly match that later import commit; none is the original rejected source row with the same ID. Their factual correctness is not established by their import provenance.

The guard now compares the original source-record **ID and content fingerprint**, using the checked-in `scripts/lib/islamiyat-rejected-source-records.json` manifest. It contains the 2,257 original rejected records' fingerprints from source revision `43738bf1d370ce0ab6ac200544c7f17458b416e6`, immediately before cleanup `317d98c9e63d6bf18ed48a3d5e73f2bfd918be45`. Runtime/CI do not need Git history. The fingerprint includes normalized stem, sorted options and correct-answer text. Restoring an original rejected source record still fails; changing option order cannot bypass that check. Numeric ID reuse alone does not remove a different later record.

One later record, `islamic-gk-8462`, has the same question/options/answer as old `islamic-gk-8450` (Umar's conversion and Surah Taha). Check output reports this separately as a cross-ID **editorial review candidate**. The original batch was rejected collectively; this overlap does not establish that a particular answer is false or verified. An editor should verify its historical attribution from an appropriate authentic source. No answer or educational record was edited, deleted, newly exposed or factually cleared by this audit repair. The source bank retains all 3,818 current Islamiyat records.
