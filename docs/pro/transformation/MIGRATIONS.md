# Additive schema and rollback contract

Keep both `026_grammar_learning_v5.sql` and `026_pro_coupons.sql` unchanged. No production applied/checksum inventory is available. The source inventory in `ledger.json` identifies full filenames and hashes; ordinal-only application is unsafe.

`027_topic_writing_bindings.sql` is needed because the existing topic progress row retains only latest notes/draft. It adds a unique `(user, attempt, edition, slot)` reference to the existing `writing_records` and `writing_versions`, with restrictive owner/attempt/edition/baseline foreign keys and slot check. It creates no body, progress or AI ledger. Runtime initialization is outside business transactions, under the existing topic schema lock; SQL parity is tested. No new query index is proposed beyond binding uniqueness.

Baseline import is lazy and transactionally joins the current account-serialized topic save: preserve exact prior text and hash, label one baseline, append only changed new text, retain the old latest row and existing receipt. Repeated accepted requests return the old receipt. Stale draft versions fail before appending. This preserves the original published edition and creates a separate binding for a new edition.

Native tests exercise MySQL 8. MariaDB compatibility is designed through existing supported DDL, but this session has not replayed it against MariaDB. Host schema inventory/backup remains an operational release prerequisite. The two existing 026 schema initializers and the new 027 coexist in the disposable database.

Rollback: revert presentation commits independently and keep native binding guards, latest projection and all additive data. Disable new topic writes if rolling back the persistence adapter. Do not drop bindings/versions, rewrite original text, or run destructive down migrations. Older application code must not edit a bound record through generic writing. Restore rehearsals use only the disposable database; host database and private-image storage must later be backed up/restored consistently by an authorized operator.
