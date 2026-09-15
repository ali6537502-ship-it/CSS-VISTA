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
