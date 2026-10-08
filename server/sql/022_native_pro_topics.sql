-- Native topic definitions stay in the existing private MySQL database.
-- No raw owner PDF, Drive URL or plaintext lesson belongs in public Git/assets.
CREATE TABLE IF NOT EXISTS pro_topics (
 id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 title VARCHAR(200) NOT NULL, summary VARCHAR(600) NOT NULL, category VARCHAR(40) NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 1, published_version_id CHAR(36) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 INDEX topics_catalog (category,published_version_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pro_topic_versions (
 id CHAR(36) NOT NULL PRIMARY KEY, topic_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 content_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 content JSON NOT NULL, created_by CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY topic_content_version (topic_id,content_hash),
 CONSTRAINT topic_version_topic_fk FOREIGN KEY (topic_id) REFERENCES pro_topics(id) ON DELETE RESTRICT,
 CONSTRAINT topic_version_admin_fk FOREIGN KEY (created_by) REFERENCES admin_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS attempt_topic_progress (
 attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 topic_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, topic_version_id CHAR(36) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, state VARCHAR(24) NOT NULL DEFAULT 'not_started', completed JSON NOT NULL, bookmarked TINYINT(1) NOT NULL DEFAULT 0,
 started_at DATETIME(6) NULL, notes TEXT NOT NULL, draft TEXT NOT NULL, draft_version INT UNSIGNED NOT NULL DEFAULT 0, draft_words SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 learn_score TINYINT UNSIGNED NULL, revision_score TINYINT UNSIGNED NULL,
 next_revision DATE NULL, last_review DATE NULL, review_count INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY (attempt_id,topic_version_id), INDEX topic_owned_history (user_id,attempt_id,updated_at),
 INDEX topic_revision_due (user_id,attempt_id,next_revision),
 CONSTRAINT topic_progress_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT topic_progress_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT topic_progress_topic_fk FOREIGN KEY (topic_id) REFERENCES pro_topics(id) ON DELETE RESTRICT,
 CONSTRAINT topic_progress_version_fk FOREIGN KEY (topic_version_id) REFERENCES pro_topic_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS attempt_topic_checks (
 id CHAR(36) NOT NULL PRIMARY KEY, attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 topic_version_id CHAR(36) NOT NULL, mode VARCHAR(16) NOT NULL, result JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX topic_check_history (user_id,attempt_id,topic_version_id,created_at),
 CONSTRAINT topic_check_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT topic_check_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT topic_check_version_fk FOREIGN KEY (topic_version_id) REFERENCES pro_topic_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS topic_admin_requests (
 admin_id CHAR(36) NOT NULL, request_id CHAR(36) NOT NULL, payload_hash CHAR(64) NOT NULL, result JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (admin_id,request_id),
 CONSTRAINT topic_request_admin_fk FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS topic_editor_events (
 id CHAR(36) NOT NULL PRIMARY KEY, admin_id CHAR(36) NOT NULL,
 topic_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, version_id CHAR(36) NOT NULL,
 action VARCHAR(24) NOT NULL, details JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX topic_editor_history (topic_id,created_at),
 CONSTRAINT topic_event_admin_fk FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE RESTRICT,
 CONSTRAINT topic_event_topic_fk FOREIGN KEY (topic_id) REFERENCES pro_topics(id) ON DELETE RESTRICT,
 CONSTRAINT topic_event_version_fk FOREIGN KEY (version_id) REFERENCES pro_topic_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
