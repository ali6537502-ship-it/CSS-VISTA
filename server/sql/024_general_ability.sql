-- Additive only: no existing records, tables or storage keys are changed.
CREATE TABLE IF NOT EXISTS ability_positions (
 user_id CHAR(36) NOT NULL, course_version CHAR(64) NOT NULL,
 unit_id VARCHAR(80) NOT NULL, lesson_id VARCHAR(90) NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(user_id,course_version),
 CONSTRAINT ability_position_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ability_responses (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, course_version CHAR(64) NOT NULL,
 unit_id VARCHAR(80) NOT NULL, mode VARCHAR(12) NOT NULL, lesson_id VARCHAR(90) NOT NULL,
 score TINYINT UNSIGNED NOT NULL, result JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY ability_owner_course(user_id,course_version,unit_id,mode,lesson_id,created_at),
 KEY ability_owner_history(user_id,created_at,id),
 CONSTRAINT ability_response_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT ability_score_chk CHECK(score<=100 AND mode IN ('exercise','quiz'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
