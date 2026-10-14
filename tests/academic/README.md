# Real-provider academic validation package

This is a private-development review tool, not a mock AI feature. The 45 original cases cover correct/incorrect/partial/unconventional sentences and paragraphs, evidence and reasoning, theme-bound and off-theme essay work, source-bound précis and contextual tutoring. Four handwriting cases explicitly need genuine images and ground-truth review. Case assertions such as 93% and 87% are deliberately unverified student claims to test the evidence safeguards, never factual teaching.

`php server/bin/pro-readiness.php` reads readiness without creating tables or making a provider request. Its configuration assertions are not evidence of model availability or academic accuracy. It distinguishes an isolated test database and rejects TEST credentials as genuine readiness. The packaged CLI equivalent is `php public/api/_pro_readiness.php`; HTTP requests are rejected.

For each real trial, use an approved isolated native account, existing feature UI/API, current consent and actual approved provider configuration. Save the case in its specified activity; work through earlier activities normally. Preserve the exact selected response, theme, original précis passage/title or bounded tutor source. The shared native operations and allowance ledger are authoritative. Do not bypass them with a standalone model call. No fixture transport qualifies as real feedback. An unknown outcome is recovered by operation ID, not sent again.

Then export the already saved owned operation:

```sh
php tests/academic/export.php USER_UUID OPERATION_UUID CASE_ID /private/review/CASE_ID.json
```

The utility performs read-only queries. It validates ownership, scope, successful state, provider metadata, exact case response/context and the existing feature output validator. TEST/unknown operations are rejected. It creates a new 0600 file under configured private storage, outside the repository and webroot; no response text or key is printed. Keep this development utility outside the public deployment. It does not establish independent factual truth or genuine model access merely from a response identifier.

The private packet includes model/token metadata, source snapshot, validated feedback and blank human-review fields. A reviewer must assess meaning preservation, academic correctness, actionable hints, source limitations and independent student work. Status remains REQUIRES_HUMAN_ACADEMIC_REVIEW; no schema pass is turned into release approval. Examine false criticism of correct but unconventional language as well as missed errors. Record limitations and fix prompts/validators only with repeatable evidence.

## Human review and coverage report

The export now also retains the operation's provider, feature, prompt-version label and execution dates from the native ledger. It does not invent a historical prompt fingerprint. Keep the original packet unchanged. Create a separate blank review with:

```sh
node tests/academic/review.mjs template /private/review/packets/CASE.json /private/review/decisions/CASE.json
```

The human reviewer fills in their name, UTC review timestamp, confirmation of the actual provider operation and comparison with the immutable source. For every common criterion, case-specific expectation and safeguard, enter `met`, `not_met` or `uncertain`, an explanation and a verbatim excerpt from the saved feedback. Record observed limitations. A blank or partial review remains unreviewed; uncertainty and false criticism remain visible. The packet SHA256 binds the sidecar to those exact bytes. Do not edit the exported packet or quietly discard an unfavorable trial when a later trial improves.

Keep packet and decision JSON files in separate private directories, outside the repository and webroot. Then produce a new report:

```sh
node tests/academic/review.mjs report /private/review/packets /private/review/decisions /private/review/coverage.json
```

The tool creates 0600 files, never overwrites existing files and rejects symlink paths, duplicate operations/provider responses, orphan or ambiguous reviews, changed criteria, unsupported contexts and TEST transport metadata. Files are bounded to one MiB and each directory to 1,000 JSON files. Failure output does not echo private content. Reports retain every submitted trial, distinguish missing/unreviewed/uncertain/unconfirmed/adverse reviews and group results by configured/reported model and prompt label. Aggregate coverage is not validation of one particular model. A rerun needs a new output filename; retain older reports and review decisions privately rather than overwriting their history.

This is a local development tool and is not part of the public build. Metadata and a human attestation are not independent proof of a genuine provider request or academic truth. The tool checks review structure, not the merits of the review. There are 41 textual cases and four separate genuine-image cases. OCR stays blocked here until image/ground-truth review is completed; it cannot be marked passed through a textual sidecar. Even fully reviewed textual coverage leaves `release_approval:false`, academic/model verification false and the explicit remaining release checks. No model call, allowance deduction, account change, database migration or feature activation occurs.

`node --test tests/academic/review.test.mjs tests/academic/cost.test.mjs` tests the reporting safeguards with conspicuously documented, temporary format-only fixtures. These are not real model trials or human academic endorsements.

For OCR, review the genuine image, crossed-out/unclear wording and permissible transcription alternatives before calling it ground truth. Printed/GD-generated fixtures verify security and workflow only. One publicly licensed crossed-out manuscript was retained privately with original SHA256/source/licensing metadata as an uncertainty control; it was not sent to a provider and is not a positive accuracy result. Additional representative clear/unclear samples and genuine provider access are still required.

Actual runtime status rechecked on 14 October 2026: no provider secret binding, outbound hosting identity or native production administrator connection. Real-model academic review is BLOCKED, not passed. Production is held and new commercial/AI decisions remain pending. See docs/pro/launch-policy-draft.md.

`node tests/academic/cost.mjs PRIVATE_PACKETS_DIRECTORY REVIEWED_RATES_JSON` estimates observed USD token costs using operator-supplied official-model rates and their checked date. Required rate fields: model, source_url, checked_on, input_usd_per_million, cached_input_usd_per_million and output_usd_per_million. It rejects missing token totals, TEST transport IDs, different models and credential-bearing source URLs. Missing cache detail is an input-cost upper bound, never fabricated zero usage. It does not independently verify a price, FX, tax, payment fee or the PKR1,950 launch margin. Real observed feedback and current reviewed pricing are required before deciding that the allowances are affordable.
