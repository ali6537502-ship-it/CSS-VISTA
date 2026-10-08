<?php
declare(strict_types=1);
function cssv_tutor_schema_statements(): array {
 return [<<<'SQL'
CREATE TABLE IF NOT EXISTS tutor_requests (
 operation_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, attempt_id CHAR(36) NOT NULL,
 context_id VARCHAR(180) NOT NULL, parent_id CHAR(36) NULL, intent VARCHAR(32) NOT NULL,
 question TEXT NOT NULL, intent_hash CHAR(64) NOT NULL, input JSON NOT NULL, input_hash CHAR(64) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY tutor_owner_history(user_id,attempt_id,created_at), KEY tutor_intent(user_id,intent_hash),
 CONSTRAINT tutor_operation_fk FOREIGN KEY(operation_id) REFERENCES ai_operations(id) ON DELETE RESTRICT,
 CONSTRAINT tutor_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT tutor_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT tutor_parent_fk FOREIGN KEY(parent_id) REFERENCES ai_operations(id) ON DELETE RESTRICT,
 CONSTRAINT tutor_intent_chk CHECK(intent IN ('explain','misconception','hint','check_understanding'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL];
}
