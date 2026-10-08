CREATE TABLE IF NOT EXISTS grammar_progress (
 attempt_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, state JSON NOT NULL, evidence JSON NOT NULL,
 imported_browser BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY grammar_owner (user_id,updated_at),
 CONSTRAINT grammar_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT grammar_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
