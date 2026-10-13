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

For OCR, review the genuine image, crossed-out/unclear wording and permissible transcription alternatives before calling it ground truth. Printed/GD-generated fixtures verify security and workflow only. One publicly licensed crossed-out manuscript was retained privately with original SHA256/source/licensing metadata as an uncertainty control; it was not sent to a provider and is not a positive accuracy result. Additional representative clear/unclear samples and genuine provider access are still required.

Actual runtime status on 13 October 2026: no provider secret binding, outbound hosting identity or native production administrator connection. Real-model academic review is BLOCKED, not passed. Production is held and new commercial/AI decisions remain pending. See docs/pro/launch-policy-draft.md.

`node tests/academic/cost.mjs PRIVATE_PACKETS_DIRECTORY REVIEWED_RATES_JSON` estimates observed USD token costs using operator-supplied official-model rates and their checked date. Required rate fields: model, source_url, checked_on, input_usd_per_million, cached_input_usd_per_million and output_usd_per_million. It rejects missing token totals, TEST transport IDs, different models and credential-bearing source URLs. Missing cache detail is an input-cost upper bound, never fabricated zero usage. It does not independently verify a price, FX, tax, payment fee or the PKR1,950 launch margin. Real observed feedback and current reviewed pricing are required before deciding that the allowances are affordable.
