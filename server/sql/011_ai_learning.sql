-- CSS Vista AI learning foundation.
-- Additive only. The runtime also creates these tables idempotently on first use.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ai_daily_usage (
  user_id CHAR(36) NOT NULL,
  usage_date DATE NOT NULL,
  feature VARCHAR(80) NOT NULL,
  calls INT UNSIGNED NOT NULL DEFAULT 0,
  input_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  units DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, usage_date, feature),
  KEY ai_daily_usage_date_idx (usage_date),
  CONSTRAINT ai_daily_usage_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_writing_attempts (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  feature VARCHAR(80) NOT NULL,
  source_text MEDIUMTEXT NOT NULL,
  evaluation JSON NOT NULL,
  provider VARCHAR(32) NOT NULL,
  model VARCHAR(96) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ai_writing_attempts_user_time_idx (user_id, created_at),
  KEY ai_writing_attempts_feature_idx (feature, created_at),
  CONSTRAINT ai_writing_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_writing_errors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  error_code VARCHAR(80) NOT NULL,
  category VARCHAR(80) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  excerpt VARCHAR(500) NULL,
  explanation VARCHAR(1200) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ai_writing_errors_user_code_idx (user_id, error_code, created_at),
  KEY ai_writing_errors_user_category_idx (user_id, category, created_at),
  CONSTRAINT ai_writing_errors_attempt_fk FOREIGN KEY (attempt_id) REFERENCES ai_writing_attempts(id) ON DELETE CASCADE,
  CONSTRAINT ai_writing_errors_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
