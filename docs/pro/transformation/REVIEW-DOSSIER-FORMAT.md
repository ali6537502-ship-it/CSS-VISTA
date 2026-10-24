# Private topic review dossier format

No approved dossier or source body is added to Git. A trusted operator must verify the actual independent academic evidence and owner release scope, then install the exact JSON bytes at:

`CSSV_PRIVATE_STORAGE_DIR/topic-reviews/<SHA256-of-file-bytes>.json`

The directory must be outside the web root, restricted to the operator/service account and excluded from public build/Git. The student/admin publishing API has no action to create these files. The separate existing release hold still rejects publication, even when a dossier is valid.

Required string fields:

| Field | Meaning |
|---|---|
| `version_id` | Exact retained native topic edition UUID |
| `content_hash` | Exact canonical content hash checked by the topic engine |
| `status` | Must be `approved` |
| `author_ref`, `reviewer_ref` | Separate attributable author/self-review and independent reviewer references |
| `independent_approval_ref` | Private location/reference of actual independent approval |
| `approval_evidence_sha256` | Hash of the exact retained approval evidence |
| `source_review_ref` | Claim/source/date/retrieval/freshness decisions |
| `assessment_review_ref` | Question/key/distractor/alternative/feedback review decisions |
| `coverage_ref` | Course/objective/prerequisite/release-scope matrix |
| `owner_authorization_ref` | Owner authorization identifying exact artifact and release scope |
| `valid_until` | Actual review freshness date, YYYY-MM-DD, not earlier than the current Pakistan date |

All fields are bounded to 500 bytes. The manifest file is at most 16 KB. A changed manifest needs a new SHA256; a changed lesson hash/edition requires new approval. Publication records the exact dossier hash and metadata in `topic_editor_events`, alongside the existing note/content hash. Normal request identity/optimistic revision/MFA/CSRF still apply. Withdrawal retains editions, student records and events.

The loader establishes the integrity and declared scope of an operator-trusted dossier. It does not cryptographically authenticate an external reviewer or retrieve/approve referenced claims itself. The operator must retain and verify the real approval artifact and any signatures. Author self-review, a checkbox, structural validation and synthetic fixtures do not provide independent approval. `tests/topics/review-fixture.php` exists only for the exact disposable CI database and creates clearly labelled synthetic evidence; never copy its files to a host.
