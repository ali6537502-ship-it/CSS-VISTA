# Implementation and data preservation

The native CSS VISTA architecture is retained. The application continues to use React 19, TypeScript, Vite and Tailwind, with its existing same-origin PHP account, CSRF, preparation-attempt and MySQL infrastructure. Pro, MPT, payment and AI release restrictions are unaffected.

`content/grammar/v5` is the editable source of truth. Each day contains orientation, outcomes, prerequisites, substantial concept modules in four depths, patterns, reasoned examples, comparisons, restrictions, mistakes, glossary definitions, independently authored practice, corrections, transformations, writing, cumulative recall and a completion checklist. The 116 daily modules also serve as permanent reference entries; four additional entries develop word formation, productivity, negation/scope and presupposition. Reference and lesson views share the same teaching data.

The build validates all 30 exact syllabus titles and 260 scheduled subtopic groups, plus 14 explicit permanent-extension subtopics. It generates public JSON, the searchable concept/item index, mistake details, native server validation catalogue, coverage matrix, question inventory and source register. Stable concept and item IDs link prerequisites, explanations, practice, reports and reinforcement. A content digest covers manuscripts, curriculum map, categories and generator. Readable content remains public. Day files are fetched on demand with the content digest in their URLs; the index revalidates. Earlier-work code and its legacy data load separately.

The course route offers the 30-day path, public lessons, searchable encyclopedia/glossary/rule and exception views, regional and formal-writing guides, analysis/transformation/editing/revision banks, diagnostic and cumulative assessments, bookmarks, notes, saved task position, print-friendly sections, JSON work exports/restoration and downloadable revision calendars. These are different views of real shared content, not inflated counts of separate banks.

Objective attempts retain their first and latest responses and exposure counts. Same-day retries do not earn spaced successes. Retrieval intervals reuse the existing 1/3/7/14/30-day scheduler; two later qualifying retrievals supply item retention evidence. Reports separate study completion, first-response accuracy, written drafts, self-review and retention. Initial diagnostic thresholds suggest a reading depth explicitly as a study aid, not a calibrated level or certification. All depths and all topics remain accessible.

Open responses accept original wording. A model, task-specific rubric and alternative-answer policy support honest self-review; no exact-string or claimed AI grading is used. Exam feedback opens after responses have been recorded to all tasks. This is a self-study assessment, not a secure proctored examination.

## Preservation strategy

No legacy schema, answer index or progress namespace is replaced. No production learner export was needed or accessed for an in-place transformation because there is no in-place transformation. `server/sql/026_grammar_learning_v5.sql` and the equivalent guarded runtime schema add only `grammar_learning_v5`, keyed by preparation attempt and owner. Historical `grammar_progress` remains intact.

Before new browser work, an exact-scope raw backup preserves a legacy v4 record or the guest v3 fallback. Guest, account-local and each account attempt remain separate; signing in never silently adopts guest writing. Read failures preserve the original raw values and pause writes. Exports include current work and retained raw records where readable. Restoring a backup checks account, attempt and edition and first backs up the current raw browser copy.

Native saves use CSRF, strict known IDs, ownership checks, atomic version comparison and the existing idempotent request ledger. An interrupted save retains its exact request identity and payload for replay. Concurrent versions return a conflict and retain the browser draft. Loading an account copy first backs up the latest local draft. Missing restored fields cannot erase old notes, writing, original response evidence, completion or newer review history. The server returns the canonical preserved state.

The disposable native test verifies legacy state before and after new saves, restores missing fields, checks long text, idempotency, concurrency and attempt/user separation. No production record has been migrated, reset or deleted. Rollback of the frontend leaves both editions’ data intact; existing legacy code and endpoints remain available for historical work.

## Continuing maintenance

Edit the canonical JSON and run `node scripts/grammar-v5/build.mjs`, `node scripts/grammar-v5/report.mjs` and the relevant tests. Review every changed grammatical claim and key. Before an edition has accepted responses, editorial option rearrangement is safe; after release, changing an existing option order or keyed meaning requires a new stable item/edition and deliberate history handling. Never reinterpret existing learner answers with a new option order.
