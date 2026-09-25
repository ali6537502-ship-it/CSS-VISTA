# MPT 40-paper release standard

The active CSS MPT series contains 40 full papers, each with 200 questions in the FPSC section sequence used by the application: Islamic Studies / Civics & Ethics 20, Urdu 20, English 50, General Abilities 60 and General Knowledge 50. General Knowledge is limited by the MPT selector to Everyday Science, Current Affairs and Pakistan Affairs.

## Mandatory release gates

Every production Hostinger build runs `npm run audit:mpt-release` before the build command. That release command performs two independent checks:

1. `npm run audit:mpt-40` builds the entire forty-paper series and rejects duplicate IDs, duplicate normalized stems, reuse from the archived 6,800-question series, repeated numeric templates, obvious syllabus drift, missing comprehension, excessive synonym concentration, inadequate Urdu translation coverage, malformed paper sizes and over-basic papers.
2. `npm run audit:mpt-facts` separately checks factual-section answer structure, ambiguous catch-all options, known high-risk Islamic Studies / Pakistan Affairs / science patterns, and requires every time-sensitive Current Affairs item to retain an explanation and a primary-source URL from an approved issuing domain.

The dedicated GitHub Actions workflow stores both JSON reports as a 90-day artifact named with the exact Git commit SHA. The structural report includes the audited source SHA, section totals, General Knowledge composition and support counts.

## Current audited baseline

The first full forty-paper release gate run on commit `e49b87b908859d96fee5856c317fc83568f94277` passed with:

- 40 papers and 8,000 questions.
- 0 reused legacy IDs.
- 0 reused legacy stems.
- 0 off-syllabus regex hits.
- 0 bare one-step arithmetic drills.
- 0 papers without English comprehension.
- 0 repeated numeric families above the release threshold.
- 13 Basic, 2,477 Intermediate, 4,793 Advanced and 717 unrated questions under the current bank labels.

That run predates the new factual-integrity gate added immediately afterward; every later production build must pass both gates.

## Editorial rule

Automated checks are a release floor, not a substitute for human subject review. Numeric questions with authored solutions, individually reviewed recalled-paper items and primary-source Current Affairs items have stronger evidence than unsupported legacy factual rows. Any disputed factual question should be disabled or corrected at source and the full release gates rerun. Never loosen the uniqueness or syllabus gates merely to make a paper build.

## Current Affairs provenance

The MPT selector now accepts Current Affairs only when the source URL resolves to a primary issuing family used by the reviewed bank: World Economic Forum, IMF, UNFCCC, WHO, FIFA, Olympics/IOC or the United Nations. Secondary news-publication-date trivia is excluded.

## References

FPSC remains the controlling authority for the examination scheme, rules, notices and syllabus. The repository should not present an internal preparation split inside the 50-mark General Knowledge area as an FPSC-prescribed sub-allocation.
