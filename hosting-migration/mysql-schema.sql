-- CSS Vista Hostinger/MySQL target schema
-- Zero-data-loss migration foundation. Existing Supabase UUIDs are preserved.
-- Secrets and database credentials must never be committed to Git.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hash migrated from Supabase; never expose in admin UI',
  email_confirmed_at DATETIME(6) NULL,
  last_sign_in_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  disabled_at DATETIME(6) NULL,
  raw_user_meta JSON NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT NULL,
  phone VARCHAR(40) NULL,
  whatsapp VARCHAR(40) NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(40) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL DEFAULT 'Pakistan',
  css_attempt_year SMALLINT NULL,
  preparation_level VARCHAR(60) NULL,
  optional_subjects JSON NULL,
  education VARCHAR(255) NULL,
  profile_photo_path VARCHAR(500) NULL,
  profile_photo_bytes INT NULL,
  profile_photo_mime VARCHAR(80) NULL,
  profile_completed_at DATETIME(6) NULL,
  last_seen_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT chk_profile_photo_size CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 25600),
  KEY idx_student_profiles_city (city),
  KEY idx_student_profiles_gender (gender),
  KEY idx_student_profiles_attempt (css_attempt_year),
  CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_progress (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  payload JSON NOT NULL,
  client_updated_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_student_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_activity (
  id BIGINT PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  event_key VARCHAR(255) NOT NULL,
  activity_type VARCHAR(120) NOT NULL,
  label TEXT NOT NULL,
  path TEXT NULL,
  metadata JSON NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_student_activity_user_event (user_id, event_key),
  KEY idx_student_activity_user_time (user_id, occurred_at),
  CONSTRAINT fk_student_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_attempts (
  id BIGINT PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  event_key VARCHAR(255) NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL DEFAULT '',
  topic VARCHAR(255) NULL,
  subtopic VARCHAR(255) NULL,
  mode VARCHAR(120) NULL,
  difficulty VARCHAR(80) NULL,
  selected_option INT NULL,
  correct TINYINT(1) NOT NULL,
  attempted_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_question_attempt_user_event (user_id, event_key),
  KEY idx_question_attempts_user_time (user_id, attempted_at),
  CONSTRAINT fk_question_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id BIGINT PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  attempt_key VARCHAR(255) NOT NULL,
  quiz_type VARCHAR(120) NOT NULL,
  category VARCHAR(255) NOT NULL DEFAULT '',
  score INT NOT NULL,
  total INT NOT NULL,
  metadata JSON NOT NULL,
  completed_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_quiz_attempt_user_key (user_id, attempt_key),
  KEY idx_quiz_attempts_user_time (user_id, completed_at),
  CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  created_at DATETIME(6) NOT NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  CONSTRAINT fk_admin_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content (
  id VARCHAR(120) PRIMARY KEY,
  content JSON NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  updated_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content_versions (
  id BIGINT PRIMARY KEY,
  content JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_test_series_requests (
  request_id VARCHAR(255) PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_name VARCHAR(255) NOT NULL DEFAULT '',
  student_email VARCHAR(320) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  subjects JSON NOT NULL,
  test_count INT NOT NULL,
  scheduling_mode VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  duration_days INT NOT NULL,
  gap_days INT NOT NULL,
  schedule JSON NOT NULL,
  unit_price INT NULL,
  total_fee INT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'submitted',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_custom_test_series_user (user_id),
  CONSTRAINT fk_custom_test_series_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mcq_error_reports (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  note TEXT NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'open',
  created_at DATETIME(6) NOT NULL,
  resolved_at DATETIME(6) NULL,
  resolved_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  KEY idx_mcq_reports_status (status),
  CONSTRAINT fk_mcq_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personal Factbook tables. UUIDs and ownership are preserved exactly.
CREATE TABLE IF NOT EXISTS factbook_subjects (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(80) NOT NULL DEFAULT 'book',
  cover_style VARCHAR(80) NOT NULL DEFAULT 'classic',
  accent_color VARCHAR(32) NOT NULL DEFAULT '#0f6b4f',
  exam_label VARCHAR(255) NOT NULL DEFAULT '',
  target_date DATE NULL,
  position INT NOT NULL DEFAULT 0,
  category_count INT NOT NULL DEFAULT 0,
  entry_count INT NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_factbook_subjects_user (user_id),
  CONSTRAINT fk_factbook_subjects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_categories (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  parent_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(80) NOT NULL DEFAULT 'folder',
  color VARCHAR(32) NOT NULL DEFAULT '#0f6b4f',
  position INT NOT NULL DEFAULT 0,
  entry_count INT NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_factbook_categories_user (user_id),
  KEY idx_factbook_categories_subject (subject_id),
  CONSTRAINT fk_factbook_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_categories_subject FOREIGN KEY (subject_id) REFERENCES factbook_subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_categories_parent FOREIGN KEY (parent_id) REFERENCES factbook_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_entries (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  category_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  title VARCHAR(500) NOT NULL,
  entry_type VARCHAR(100) NOT NULL,
  content JSON NOT NULL,
  importance VARCHAR(80) NOT NULL DEFAULT 'normal',
  revision_status VARCHAR(80) NOT NULL DEFAULT 'not-reviewed',
  bookmarked TINYINT(1) NOT NULL DEFAULT 0,
  source_count INT NOT NULL DEFAULT 0,
  personal_remarks TEXT NOT NULL,
  search_text LONGTEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_factbook_entries_user (user_id),
  KEY idx_factbook_entries_subject (subject_id),
  KEY idx_factbook_entries_category (category_id),
  CONSTRAINT fk_factbook_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_entries_subject FOREIGN KEY (subject_id) REFERENCES factbook_subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_entries_category FOREIGN KEY (category_id) REFERENCES factbook_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_entry_blocks (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  block_type VARCHAR(100) NOT NULL,
  content JSON NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_factbook_blocks_entry FOREIGN KEY (entry_id) REFERENCES factbook_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_blocks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_tags (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(32) NOT NULL DEFAULT '#0f6b4f',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_factbook_tags_user (user_id),
  CONSTRAINT fk_factbook_tags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_entry_tags (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  tag_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  CONSTRAINT fk_factbook_entry_tags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_entry_tags_entry FOREIGN KEY (entry_id) REFERENCES factbook_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_entry_tags_tag FOREIGN KEY (tag_id) REFERENCES factbook_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_sources (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title TEXT NOT NULL,
  author_organization TEXT NOT NULL,
  publication_year VARCHAR(40) NOT NULL DEFAULT '',
  page_number VARCHAR(80) NOT NULL DEFAULT '',
  web_address TEXT NOT NULL,
  accessed_on DATE NULL,
  verification_note TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_factbook_sources_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_sources_entry FOREIGN KEY (entry_id) REFERENCES factbook_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_revisions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  snapshot JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  KEY idx_factbook_revisions_entry_time (entry_id, created_at),
  CONSTRAINT fk_factbook_revisions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_revisions_entry FOREIGN KEY (entry_id) REFERENCES factbook_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_preferences (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  default_view VARCHAR(80) NOT NULL DEFAULT 'cards',
  default_print_layout VARCHAR(80) NOT NULL DEFAULT 'standard',
  source_reminders TINYINT(1) NOT NULL DEFAULT 1,
  autosave_enabled TINYINT(1) NOT NULL DEFAULT 1,
  revision_labels TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_factbook_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_collections (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  color VARCHAR(32) NOT NULL DEFAULT '#b8861f',
  position INT NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_factbook_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_collection_entries (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  collection_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (collection_id, entry_id),
  CONSTRAINT fk_factbook_collection_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_collection_entries_collection FOREIGN KEY (collection_id) REFERENCES factbook_collections(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_collection_entries_entry FOREIGN KEY (entry_id) REFERENCES factbook_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_media (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  storage_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  byte_size INT NOT NULL,
  width INT NULL,
  height INT NULL,
  caption TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_factbook_media_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_factbook_media_entry FOREIGN KEY (entry_id) REFERENCES factbook_entries(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- New CSS Vista batch/student-management domain.
CREATE TABLE IF NOT EXISTS batches (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  mentor VARCHAR(255) NULL,
  description TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  registration_open_at DATETIME(6) NULL,
  registration_close_at DATETIME(6) NULL,
  capacity INT NULL,
  fee_amount DECIMAL(12,2) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_batches_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batch_registrations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'new',
  admin_notes TEXT NULL,
  registered_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_batch_registration (user_id, batch_id),
  KEY idx_batch_registrations_status (batch_id, status),
  CONSTRAINT fk_batch_registrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_batch_registrations_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  batch_registration_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(80) NULL,
  reference VARCHAR(255) NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'pending',
  paid_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_payments_user (user_id),
  KEY idx_payments_status (status),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_registration FOREIGN KEY (batch_registration_id) REFERENCES batch_registrations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  last_seen_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user (user_id),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  used_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(160) NOT NULL,
  target_type VARCHAR(100) NULL,
  target_id VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at DATETIME(6) NOT NULL,
  KEY idx_admin_audit_time (admin_user_id, created_at),
  CONSTRAINT fk_admin_audit_user FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migration_control (
  migration_key VARCHAR(120) PRIMARY KEY,
  source_row_count BIGINT NOT NULL DEFAULT 0,
  target_row_count BIGINT NOT NULL DEFAULT 0,
  source_checksum VARCHAR(128) NULL,
  target_checksum VARCHAR(128) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  verified_at DATETIME(6) NULL,
  notes TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
