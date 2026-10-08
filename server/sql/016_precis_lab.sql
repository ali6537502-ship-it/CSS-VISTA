-- Additive Précis Lab; uses native learning records and immutable versions.
CREATE TABLE IF NOT EXISTS precis_sources (
 writing_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, source JSON NOT NULL, revealed_model JSON NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT precis_source_writing_fk FOREIGN KEY(writing_id) REFERENCES writing_records(id) ON DELETE RESTRICT,
 CONSTRAINT precis_source_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS precis_version_context (
 version_id CHAR(36) PRIMARY KEY, context JSON NOT NULL,
 CONSTRAINT precis_context_version_fk FOREIGN KEY(version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS precis_progress (
 attempt_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, version INT UNSIGNED NOT NULL,
 current_day TINYINT UNSIGNED NOT NULL, current_chapter TINYINT UNSIGNED NOT NULL DEFAULT 1, completed JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 CONSTRAINT precis_progress_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT precis_progress_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS precis_responses (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, attempt_id CHAR(36) NOT NULL,
 question_id VARCHAR(80) NOT NULL, choice TINYINT UNSIGNED NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY precis_response_owner(user_id,attempt_id,created_at),
 CONSTRAINT precis_response_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT precis_response_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
