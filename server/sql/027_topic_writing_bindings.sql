-- Additive edition-bound references to the existing immutable writing system.
-- Runtime initializer mirrors this file; no historical rows or text are replaced.
CREATE TABLE IF NOT EXISTS topic_writing_bindings (
 writing_id CHAR(36) NOT NULL PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 attempt_id CHAR(36) NOT NULL,
 topic_version_id CHAR(36) NOT NULL,
 slot VARCHAR(8) NOT NULL,
 baseline_version_id CHAR(36) NOT NULL,
 UNIQUE KEY topic_writing_slot (user_id,attempt_id,topic_version_id,slot),
 CONSTRAINT topic_writing_record_fk FOREIGN KEY (writing_id) REFERENCES writing_records(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_owner_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_edition_fk FOREIGN KEY (topic_version_id) REFERENCES pro_topic_versions(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_baseline_fk FOREIGN KEY (baseline_version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_slot_chk CHECK (slot IN ('draft','notes'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
