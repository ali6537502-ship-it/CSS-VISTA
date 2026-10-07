-- Additive account-owned preparation/writing and AI accounting. No legacy reset.
CREATE TABLE IF NOT EXISTS preparation_attempts (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, exam VARCHAR(8) NOT NULL DEFAULT 'CSS',
 target_year SMALLINT UNSIGNED NOT NULL, target_date DATE NULL, date_source VARCHAR(24) NOT NULL DEFAULT 'student_target',
 optional_subject_ids JSON NOT NULL, daily_minutes SMALLINT UNSIGNED NOT NULL, stage VARCHAR(24) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY preparation_owner (user_id,updated_at),
 CONSTRAINT preparation_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT preparation_valid_chk CHECK (exam='CSS' AND date_source='student_target' AND daily_minutes BETWEEN 15 AND 1440 AND stage IN ('starting','in_progress','revision'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS writing_records (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, attempt_id CHAR(36) NOT NULL,
 kind VARCHAR(24) NOT NULL, title VARCHAR(180) NOT NULL, version INT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY writing_owner (user_id,updated_at),
 CONSTRAINT writing_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT writing_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT writing_kind_chk CHECK (kind IN ('sentence','paragraph','precis'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS writing_versions (
 id CHAR(36) PRIMARY KEY, writing_id CHAR(36) NOT NULL, version INT UNSIGNED NOT NULL,
 text MEDIUMTEXT NOT NULL, text_hash CHAR(64) NOT NULL, word_count INT UNSIGNED NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE KEY writing_version (writing_id,version),
 CONSTRAINT writing_version_fk FOREIGN KEY (writing_id) REFERENCES writing_records(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_requests (
 user_id CHAR(36) NOT NULL, request_id CHAR(36) NOT NULL, payload_hash CHAR(64) NOT NULL,
 result JSON NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (user_id,request_id),
 CONSTRAINT learning_request_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_daily_usage (
 user_id CHAR(36) NOT NULL, feature VARCHAR(32) NOT NULL, bucket_date DATE NOT NULL,
 used INT UNSIGNED NOT NULL DEFAULT 0, reserved INT UNSIGNED NOT NULL DEFAULT 0,
 accepted INT UNSIGNED NOT NULL DEFAULT 0, provider_calls INT UNSIGNED NOT NULL DEFAULT 0,
 PRIMARY KEY (user_id,feature,bucket_date),
 CONSTRAINT ai_usage_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_operations (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, request_id CHAR(36) NOT NULL, payload_hash CHAR(64) NOT NULL,
 feature VARCHAR(32) NOT NULL, version_id CHAR(36) NOT NULL, bucket_date DATE NOT NULL,
 provider VARCHAR(24) NOT NULL DEFAULT 'openai', model VARCHAR(120) NOT NULL, prompt_version VARCHAR(80) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'reserved', accounting VARCHAR(16) NOT NULL DEFAULT 'reserved',
 provider_started_at DATETIME(6) NULL, provider_response_id VARCHAR(180) NULL, reported_model VARCHAR(120) NULL,
 input_tokens BIGINT UNSIGNED NULL, cached_tokens BIGINT UNSIGNED NULL, output_tokens BIGINT UNSIGNED NULL,
 image_usage JSON NULL, estimated_cost_usd DECIMAL(16,8) NULL, result JSON NULL, error_code VARCHAR(80) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), completed_at DATETIME(6) NULL,
 UNIQUE KEY ai_request (user_id,request_id), KEY ai_owner_history (user_id,created_at), KEY ai_reporting (created_at,feature,state),
 CONSTRAINT ai_operation_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT ai_operation_version_fk FOREIGN KEY (version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT ai_state_chk CHECK (state IN ('reserved','in_flight','unknown','succeeded','failed')),
 CONSTRAINT ai_accounting_chk CHECK (accounting IN ('reserved','consumed','released'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS writing_findings (
 id CHAR(36) PRIMARY KEY, operation_id CHAR(36) NOT NULL, version_id CHAR(36) NOT NULL,
 code VARCHAR(48) NOT NULL, severity VARCHAR(16) NOT NULL, excerpt TEXT NOT NULL, explanation TEXT NOT NULL, hint TEXT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), KEY finding_version (version_id),
 CONSTRAINT finding_operation_fk FOREIGN KEY (operation_id) REFERENCES ai_operations(id) ON DELETE RESTRICT,
 CONSTRAINT finding_version_fk FOREIGN KEY (version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT finding_severity_chk CHECK (severity IN ('minor','moderate','major'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
