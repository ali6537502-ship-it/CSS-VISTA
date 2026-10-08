<?php
declare(strict_types=1);
function cssv_handwriting_schema_statements(): array { return [
<<<'SQL'
CREATE TABLE IF NOT EXISTS handwriting_pages (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, attempt_id CHAR(36) NOT NULL,
 title VARCHAR(180) NOT NULL, state VARCHAR(32) NOT NULL DEFAULT 'uploaded',
 image_path VARCHAR(180) NULL, image_sha256 CHAR(64) NOT NULL, image_bytes INT UNSIGNED NOT NULL,
 image_width SMALLINT UNSIGNED NOT NULL, image_height SMALLINT UNSIGNED NOT NULL,
 image_expires_at DATETIME(6) NOT NULL, image_deleted_at DATETIME(6) NULL,
 policy_version VARCHAR(80) NOT NULL, transcription_version INT UNSIGNED NOT NULL DEFAULT 0,
 confirmed_transcription_version INT UNSIGNED NULL, confirmed_hash CHAR(64) NULL,
 writing_id CHAR(36) NULL, confirmed_text_version_id CHAR(36) NULL,
 active_operation_id CHAR(36) NULL, version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY handwriting_owner (user_id,updated_at), KEY handwriting_cleanup (image_expires_at,image_deleted_at),
 CONSTRAINT handwriting_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT handwriting_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT handwriting_writing_fk FOREIGN KEY (writing_id) REFERENCES writing_records(id) ON DELETE RESTRICT,
 CONSTRAINT handwriting_text_fk FOREIGN KEY (confirmed_text_version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT handwriting_state_chk CHECK (state IN ('uploaded','extracting','awaiting_confirmation','confirmed','evaluating','completed','unreadable','extraction_failed','evaluation_failed','outcome_unknown','image_expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
<<<'SQL'
CREATE TABLE IF NOT EXISTS handwriting_transcriptions (
 id CHAR(36) PRIMARY KEY, page_id CHAR(36) NOT NULL, version INT UNSIGNED NOT NULL,
 text TEXT NOT NULL, text_hash CHAR(64) NOT NULL, uncertain TINYINT NOT NULL DEFAULT 0,
 source VARCHAR(16) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY handwriting_transcription (page_id,version),
 CONSTRAINT handwriting_transcription_page_fk FOREIGN KEY (page_id) REFERENCES handwriting_pages(id) ON DELETE RESTRICT,
 CONSTRAINT handwriting_source_chk CHECK (source IN ('model','student'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
]; }
