-- Latest guided feedback points to an immutable, account-owned submitted check.
-- Existing lesson editions, quiz results and student writing are retained.
CREATE TABLE IF NOT EXISTS attempt_topic_guided_results (
 attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 topic_version_id CHAR(36) NOT NULL,
 question_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 check_id CHAR(36) NOT NULL,
 PRIMARY KEY (attempt_id,topic_version_id,question_id),
 INDEX topic_guided_owner (user_id,attempt_id,topic_version_id),
 CONSTRAINT topic_guided_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT topic_guided_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT topic_guided_version_fk FOREIGN KEY (topic_version_id) REFERENCES pro_topic_versions(id) ON DELETE RESTRICT,
 CONSTRAINT topic_guided_check_fk FOREIGN KEY (check_id) REFERENCES attempt_topic_checks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
