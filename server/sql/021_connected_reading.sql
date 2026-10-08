-- Additive owned reading state; preserve earlier records and existing free readers.
CREATE TABLE IF NOT EXISTS attempt_reading_records (
 attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, kind VARCHAR(32) NOT NULL, source_id VARCHAR(128) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, saved TINYINT(1) NOT NULL DEFAULT 0,
 read_date DATE NULL, read_hash CHAR(64) NULL, last_review DATE NULL, next_revision DATE NULL, review_count INT UNSIGNED NOT NULL DEFAULT 0, review_stage SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 source_hash CHAR(64) NOT NULL, snapshot JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(attempt_id,kind,source_id), KEY reading_owner_due(user_id,attempt_id,next_revision),
 CONSTRAINT reading_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT reading_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT reading_kind_chk CHECK(kind IN ('current_affairs','vistagram'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
