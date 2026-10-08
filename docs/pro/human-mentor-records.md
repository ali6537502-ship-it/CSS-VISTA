# Human answer workflow — Phase 6

`/account/answer-performance` adds account-owned question and human mentor marks history to the existing My CSS Vista account. Preparation and public human-evaluation pages link to it. It does not replace the existing local answer drafts, WhatsApp evaluation requests, customized test series or their admin controls.

## Product policy

- A student saves a subject, topic, question and source against an owned preparation attempt, writes independently and marks the answer written. States are Not Attempted → Attempted — Awaiting Mentor Evaluation → Evaluated. Marking written never creates marks.
- The mentor evaluates outside this workspace. Enter obtained marks, maximum marks, evaluation date and optional comment; no mentor portal or checked-answer upload is required. All results are explicitly student-entered, not independently authenticated official marks.
- Version 1 accepts **whole marks only**, obtained 0 through maximum, maximum 1–1000. Dates must be valid, from 2000 through today in Asia/Karachi; evaluation cannot precede writing. Zero is genuine evidence, not missing data.
- Questions are clearly labelled Practice or Student-provided past-paper reference. The latter requires a reference and explicitly remains unverified. This phase does not certify a student-supplied question as official or manufacture verified past-paper content. Existing public verified sources stay in their present tools.
- Question/source/subject/topic/attempt are fixed after creation. Repeat attempts copy that context and retain the original question record. Entry mistakes are corrected with a required reason and immutable earlier entries, never destructive replacement of the original entry.
- Under the owner’s updated policy, My Answer Performance is a Pro feature. Creation, reading and correction through `student/mentor.php` require active Pro membership. Expiry does not delete records: renewal restores access to the original questions, evaluations and history. See [paid-feature-policy.md](paid-feature-policy.md).

## Evidence contract and limits

For the selected attempt/subject/exact topic/status/provenance/evaluation-date/score filters, summarize **all matching records**, independently of the 50-record history page. Use each answer's current correction revision exactly once. Percentage is `100 × sum(obtained) / sum(maximum)`, rounded to one decimal, not an unweighted average of percentages. Missing evaluations are excluded; an empty denominator displays No marks yet. First answers and repeat answers have separate totals.

Topic evidence uses first-attempt totals. Below 60% suggests review; 60% and above suggests continued practice. This deterministic study threshold is not an FPSC pass rule, readiness score or mastery certificate. Same-question history displays actual chronological first/repeat marks, maxima, dates and workflow state. A changed percentage does not prove improvement under different evaluation conditions. Topic labels are student-entered and do not certify syllabus classification.

`summary.topics` supplies preparation-linked counts, obtained/maximum totals, percentages and review/continue priorities for the later deterministic planner phase. Actual scheduling and overall readiness integration remain **Phase 8**, after scoped tutoring; no fake planner task or readiness narrative is generated here. Topic cards already give actionable revision guidance without an AI call.

## Native backend

- Additive migration **018_mentor_records.sql**, after existing **012–017**, mirrors `_mentor_schema.php`; runtime schema creation is advisory-lock serialized as in existing preparation modules. No existing table or learning history is deleted or altered.
- `student/mentor.php` requires the existing authenticated, complete-profile account and active Pro membership. POST additionally requires native CSRF and existing expected-user protection. Validate strict action fields, subjects from the actual syllabus catalogue, bounds and dates.
- Every read, parent/repeat lookup and attempt link is owner scoped. Mutation transactions lock the existing account row, check record version, and store a shared `learning_requests` receipt with a `mentor-v1` domain-separated hash. Exact replay returns the committed result; changed payload reuse or stale edits conflicts. Creating a retry advances the parent version to serialize competing repeat requests.
- Mentor question/evaluation tables are separate from AI writing versions/findings/operations. There is no model transport, provider call or AI allowance consumption. Helpers are denied by Hostinger rewrite rules. The private account route disables ads and has noindex/nofollow metadata.
- Form state is account keyed. Session storage retains only account-scoped opaque retry IDs and hashes, never question/comment text. All scores remain native server records; ownership checks also govern expiry history.

## Release and verification

This work is prepared in the existing draft PR, not deployed. Apply the additive migration through the established native workflow when release is authorized; build for Hostinger and smoke-test the complete student journey with an eligible account. Rollback the frontend/endpoint to the previous commit if necessary while retaining the additive tables and saved records for repair; do not delete student history. No new secrets or provider settings are required.

Automated coverage: pure marks/date/timezone/provenance/weighted-evidence/schema rules and native HTTP profile/authentication/CSRF/account-switch/ownership tests; immutable corrections and concurrent saves/retries; idempotent recovery; filters and pagination-independent denominators; expiry history and zero AI operations. Browser checks exercise creation, written transition, marks, lost-response reload recovery, corrections, retries, filtering, cross-device history and 320/390/768/1440px reflow. Existing payment, preparation, handwriting, Expression, Grammar and Précis suites remain regression checks.
