-- Additive, account-owned adaptive Précis guide progress.
-- Keeps the established 30-day curriculum and all writing versions untouched.
CREATE TABLE IF NOT EXISTS precis_guide_plans (
 attempt_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
 target_days TINYINT UNSIGNED NOT NULL, version INT UNSIGNED NOT NULL,
 completed_units JSON NOT NULL, handbook_sha CHAR(64) NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 CONSTRAINT precis_guide_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT precis_guide_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
