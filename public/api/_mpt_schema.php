<?php
declare(strict_types=1);

// Canonical MPT examination schema. server/sql/010_mpt_exam_system.sql mirrors
// these statements exactly (tests/mpt/unit.php enforces that). New tables only:
// no existing table is altered. All timestamps are UTC.
const CSSV_MPT_SCHEMA_VERSION = 2;

function cssv_mpt_schema_statements(): array
{
    return [
        "CREATE TABLE IF NOT EXISTS mpt_meta (
  meta_key VARCHAR(64) NOT NULL,
  meta_value VARCHAR(255) NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (meta_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_mocks (
  id CHAR(36) NOT NULL,
  public_slug VARCHAR(40) NOT NULL,
  mock_number INT UNSIGNED NOT NULL,
  schedule_key VARCHAR(64) NULL,
  title VARCHAR(160) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  application_open_at DATETIME(3) NOT NULL,
  application_close_at DATETIME(3) NOT NULL,
  exam_open_at DATETIME(3) NOT NULL,
  entry_close_at DATETIME(3) NOT NULL,
  exam_end_at DATETIME(3) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  roll_issue_delay_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  marks_per_question DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  total_marks DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  negative_marking DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  pass_percentage DECIMAL(5,2) NULL,
  results_release_policy VARCHAR(20) NOT NULL DEFAULT 'AFTER_WINDOW',
  results_delay_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  answer_review_policy VARCHAR(20) NOT NULL DEFAULT 'AFTER_WINDOW',
  rank_min_candidates SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  scoring_version INT UNSIGNED NOT NULL DEFAULT 1,
  paper_ref VARCHAR(96) NULL,
  paper_series VARCHAR(40) NULL,
  paper_frozen_at DATETIME(3) NULL,
  absent_marked_at DATETIME(3) NULL,
  ranks_computed_at DATETIME(3) NULL,
  cancelled_at DATETIME(3) NULL,
  cancel_reason VARCHAR(500) NULL,
  created_by VARCHAR(40) NOT NULL DEFAULT 'system',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY mpt_mocks_slug_uidx (public_slug),
  UNIQUE KEY mpt_mocks_number_uidx (mock_number),
  UNIQUE KEY mpt_mocks_schedule_uidx (schedule_key),
  KEY mpt_mocks_status_open_idx (status,exam_open_at),
  KEY mpt_mocks_end_idx (exam_end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_mock_questions (
  mock_id CHAR(36) NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  question_id VARCHAR(191) NOT NULL,
  section VARCHAR(80) NOT NULL,
  topic VARCHAR(191) NULL,
  difficulty VARCHAR(20) NULL,
  stem TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index TINYINT UNSIGNED NOT NULL,
  explanation TEXT NULL,
  PRIMARY KEY (mock_id,position),
  UNIQUE KEY mpt_mock_questions_question_uidx (mock_id,question_id),
  KEY mpt_mock_questions_qid_idx (question_id),
  CONSTRAINT mpt_mock_questions_mock_fk FOREIGN KEY (mock_id) REFERENCES mpt_mocks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_sessions (
  id CHAR(36) NOT NULL,
  mock_id CHAR(36) NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  capacity INT UNSIGNED NULL,
  reserved_count INT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY mpt_sessions_mock_idx (mock_id),
  CONSTRAINT mpt_sessions_mock_fk FOREIGN KEY (mock_id) REFERENCES mpt_mocks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_candidates (
  user_id CHAR(36) NOT NULL,
  candidate_code VARCHAR(16) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY mpt_candidates_code_uidx (candidate_code),
  CONSTRAINT mpt_candidates_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_applications (
  id CHAR(36) NOT NULL,
  application_code VARCHAR(20) NOT NULL,
  user_id CHAR(36) NOT NULL,
  mock_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  roll_number VARCHAR(12) NOT NULL,
  roll_number_revealed_at DATETIME(3) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  attempt_allowance TINYINT UNSIGNED NOT NULL DEFAULT 1,
  applied_at DATETIME(3) NOT NULL,
  cancelled_at DATETIME(3) NULL,
  cancel_reason VARCHAR(500) NULL,
  source VARCHAR(8) NOT NULL DEFAULT 'web',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY mpt_applications_code_uidx (application_code),
  UNIQUE KEY mpt_applications_user_mock_uidx (user_id,mock_id),
  UNIQUE KEY mpt_applications_roll_uidx (mock_id,roll_number),
  KEY mpt_applications_user_time_idx (user_id,applied_at),
  KEY mpt_applications_mock_status_idx (mock_id,status),
  CONSTRAINT mpt_applications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT mpt_applications_mock_fk FOREIGN KEY (mock_id) REFERENCES mpt_mocks(id),
  CONSTRAINT mpt_applications_session_fk FOREIGN KEY (session_id) REFERENCES mpt_sessions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_attempts (
  id CHAR(36) NOT NULL,
  application_id CHAR(36) NOT NULL,
  attempt_no TINYINT UNSIGNED NOT NULL DEFAULT 1,
  user_id CHAR(36) NOT NULL,
  mock_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS',
  started_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  submitted_at DATETIME(3) NULL,
  submit_reason VARCHAR(16) NULL,
  question_order JSON NULL,
  last_saved_at DATETIME(3) NULL,
  save_version INT UNSIGNED NOT NULL DEFAULT 0,
  active_session_id CHAR(64) NOT NULL,
  current_position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score DECIMAL(8,2) NULL,
  total_marks DECIMAL(8,2) NULL,
  correct_count SMALLINT UNSIGNED NULL,
  incorrect_count SMALLINT UNSIGNED NULL,
  unanswered_count SMALLINT UNSIGNED NULL,
  percentage DECIMAL(5,2) NULL,
  accuracy DECIMAL(5,2) NULL,
  time_taken_seconds INT UNSIGNED NULL,
  scoring_version INT UNSIGNED NULL,
  rank_position INT UNSIGNED NULL,
  rank_candidates INT UNSIGNED NULL,
  percentile DECIMAL(5,2) NULL,
  rescored_at DATETIME(3) NULL,
  visibility_changes INT UNSIGNED NOT NULL DEFAULT 0,
  device_takeovers INT UNSIGNED NOT NULL DEFAULT 0,
  voided_at DATETIME(3) NULL,
  void_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY mpt_attempts_application_uidx (application_id,attempt_no),
  KEY mpt_attempts_sweep_idx (status,expires_at),
  KEY mpt_attempts_user_time_idx (user_id,submitted_at),
  KEY mpt_attempts_mock_status_idx (mock_id,status),
  CONSTRAINT mpt_attempts_application_fk FOREIGN KEY (application_id) REFERENCES mpt_applications(id) ON DELETE CASCADE,
  CONSTRAINT mpt_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT mpt_attempts_mock_fk FOREIGN KEY (mock_id) REFERENCES mpt_mocks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_attempt_answers (
  attempt_id CHAR(36) NOT NULL,
  question_id VARCHAR(191) NOT NULL,
  selected_option TINYINT UNSIGNED NULL,
  answered_at DATETIME(3) NOT NULL,
  is_correct TINYINT(1) NULL,
  PRIMARY KEY (attempt_id,question_id),
  CONSTRAINT mpt_attempt_answers_attempt_fk FOREIGN KEY (attempt_id) REFERENCES mpt_attempts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_attempt_subject_scores (
  attempt_id CHAR(36) NOT NULL,
  subject_key VARCHAR(80) NOT NULL,
  questions SMALLINT UNSIGNED NOT NULL,
  attempted SMALLINT UNSIGNED NOT NULL,
  correct SMALLINT UNSIGNED NOT NULL,
  incorrect SMALLINT UNSIGNED NOT NULL,
  score DECIMAL(8,2) NOT NULL,
  accuracy DECIMAL(5,2) NULL,
  PRIMARY KEY (attempt_id,subject_key),
  CONSTRAINT mpt_attempt_subject_scores_attempt_fk FOREIGN KEY (attempt_id) REFERENCES mpt_attempts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_user_stats (
  user_id CHAR(36) NOT NULL,
  attempts_completed INT UNSIGNED NOT NULL DEFAULT 0,
  avg_score DECIMAL(8,2) NULL,
  highest_score DECIMAL(8,2) NULL,
  lowest_score DECIMAL(8,2) NULL,
  latest_score DECIMAL(8,2) NULL,
  avg_percentage DECIMAL(5,2) NULL,
  highest_percentage DECIMAL(5,2) NULL,
  latest_percentage DECIMAL(5,2) NULL,
  avg_accuracy DECIMAL(5,2) NULL,
  total_correct INT UNSIGNED NOT NULL DEFAULT 0,
  total_incorrect INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT mpt_user_stats_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_rate_hits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_key CHAR(64) NOT NULL,
  bucket VARCHAR(24) NOT NULL,
  hit_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY mpt_rate_hits_lookup_idx (subject_key,bucket,hit_at),
  KEY mpt_rate_hits_time_idx (hit_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NULL,
  mock_id CHAR(36) NULL,
  application_id CHAR(36) NULL,
  attempt_id CHAR(36) NULL,
  event_type VARCHAR(40) NOT NULL,
  payload JSON NULL,
  ip_hash CHAR(64) NULL,
  user_agent VARCHAR(300) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY mpt_events_mock_type_idx (mock_id,event_type),
  KEY mpt_events_user_time_idx (user_id,created_at),
  KEY mpt_events_attempt_idx (attempt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_paper_backups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mock_id CHAR(36) NOT NULL,
  paper_ref VARCHAR(96) NULL,
  paper_series VARCHAR(40) NULL,
  fingerprint CHAR(64) NOT NULL,
  question_count SMALLINT UNSIGNED NOT NULL,
  questions LONGTEXT NOT NULL,
  backed_up_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY mpt_paper_backups_mock_idx (mock_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS mpt_paper_replacements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mock_id CHAR(36) NOT NULL,
  backup_id BIGINT UNSIGNED NOT NULL,
  old_paper_ref VARCHAR(96) NULL,
  old_series VARCHAR(40) NULL,
  old_fingerprint CHAR(64) NOT NULL,
  new_paper_ref VARCHAR(96) NOT NULL,
  new_series VARCHAR(40) NOT NULL,
  new_fingerprint CHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  replaced_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY mpt_paper_replacements_mock_idx (mock_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
}

function cssv_mpt_schema_drop_statements(): array
{
    return [
        'DROP TABLE IF EXISTS mpt_paper_replacements',
        'DROP TABLE IF EXISTS mpt_paper_backups',
        'DROP TABLE IF EXISTS mpt_events',
        'DROP TABLE IF EXISTS mpt_rate_hits',
        'DROP TABLE IF EXISTS mpt_user_stats',
        'DROP TABLE IF EXISTS mpt_attempt_subject_scores',
        'DROP TABLE IF EXISTS mpt_attempt_answers',
        'DROP TABLE IF EXISTS mpt_attempts',
        'DROP TABLE IF EXISTS mpt_applications',
        'DROP TABLE IF EXISTS mpt_candidates',
        'DROP TABLE IF EXISTS mpt_sessions',
        'DROP TABLE IF EXISTS mpt_mock_questions',
        'DROP TABLE IF EXISTS mpt_mocks',
        'DROP TABLE IF EXISTS mpt_meta',
    ];
}
