-- CSS Vista Hostinger migration foundation
-- Target: MySQL 8+/compatible MariaDB on Hostinger.
-- SAFETY: additive only. Do not point production traffic here until Supabase data
-- has been copied, reconciled and dual-auth has been verified.
-- Existing Supabase auth UUIDs are preserved verbatim as users.id.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NULL,
  auth_source VARCHAR(24) NOT NULL DEFAULT 'supabase',
  auth_migrated_at DATETIME(6) NULL,
  email_verified_at DATETIME(6) NULL,
  last_sign_in_at DATETIME(6) NULL,
  last_seen_at DATETIME(6) NULL,
  disabled_at DATETIME(6) NULL,
  raw_metadata JSON NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uidx (email),
  KEY users_last_seen_idx (last_seen_at),
  CONSTRAINT users_auth_source_chk CHECK (auth_source IN ('supabase','dual','local'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) NULL,
  PRIMARY KEY (user_id),
  KEY admin_users_created_by_idx (created_by),
  CONSTRAINT admin_users_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT admin_users_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id CHAR(36) NOT NULL,
  display_name VARCHAR(180) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  whatsapp VARCHAR(40) NOT NULL DEFAULT '',
  date_of_birth DATE NULL,
  gender VARCHAR(32) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  province_region VARCHAR(120) NOT NULL DEFAULT '',
  country VARCHAR(120) NOT NULL DEFAULT 'Pakistan',
  css_attempt_year SMALLINT NULL,
  preparation_level VARCHAR(40) NOT NULL DEFAULT '',
  optional_subjects JSON NULL,
  education VARCHAR(240) NOT NULL DEFAULT '',
  previous_academy_mentor VARCHAR(240) NOT NULL DEFAULT '',
  avatar_url VARCHAR(1000) NULL,
  profile_photo_path VARCHAR(900) NULL,
  profile_photo_mime VARCHAR(80) NULL,
  profile_photo_bytes INT UNSIGNED NULL,
  profile_photo_width INT UNSIGNED NULL,
  profile_photo_height INT UNSIGNED NULL,
  profile_photo_sha256 CHAR(64) NULL,
  profile_photo_updated_at DATETIME(6) NULL,
  profile_completed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  last_seen_at DATETIME(6) NULL,
  PRIMARY KEY (user_id),
  KEY student_profiles_city_idx (city),
  KEY student_profiles_gender_idx (gender),
  KEY student_profiles_attempt_idx (css_attempt_year),
  KEY student_profiles_last_seen_idx (last_seen_at),
  CONSTRAINT student_profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT student_profiles_photo_size_chk CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 25600)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_progress (
  user_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  client_updated_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  CONSTRAINT student_progress_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_activity (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  event_key VARCHAR(255) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  label VARCHAR(500) NOT NULL DEFAULT '',
  path VARCHAR(1000) NULL,
  metadata JSON NULL,
  occurred_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY student_activity_user_event_uidx (user_id,event_key),
  KEY student_activity_user_time_idx (user_id,occurred_at),
  CONSTRAINT student_activity_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  attempt_key VARCHAR(255) NOT NULL,
  quiz_type VARCHAR(120) NOT NULL,
  category VARCHAR(180) NOT NULL DEFAULT '',
  score INT UNSIGNED NOT NULL,
  total INT UNSIGNED NOT NULL,
  metadata JSON NULL,
  completed_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY quiz_attempts_user_attempt_uidx (user_id,attempt_key),
  KEY quiz_attempts_user_time_idx (user_id,completed_at),
  CONSTRAINT quiz_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT quiz_attempts_score_chk CHECK (total > 0 AND score <= total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  event_key VARCHAR(255) NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  category VARCHAR(180) NOT NULL DEFAULT '',
  topic VARCHAR(240) NULL,
  subtopic VARCHAR(240) NULL,
  mode VARCHAR(80) NULL,
  difficulty VARCHAR(80) NULL,
  selected_option SMALLINT NULL,
  correct TINYINT(1) NOT NULL,
  attempted_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY question_attempts_user_event_uidx (user_id,event_key),
  KEY question_attempts_user_time_idx (user_id,attempted_at),
  KEY question_attempts_user_category_idx (user_id,category,attempted_at),
  KEY question_attempts_user_topic_idx (user_id,topic,attempted_at),
  CONSTRAINT question_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT question_attempts_option_chk CHECK (selected_option IS NULL OR selected_option BETWEEN -1 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content (
  id VARCHAR(40) NOT NULL,
  content JSON NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) NULL,
  PRIMARY KEY (id),
  CONSTRAINT site_content_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT site_content_id_chk CHECK (id = 'published')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) NULL,
  PRIMARY KEY (id),
  KEY site_content_versions_created_idx (created_at),
  CONSTRAINT site_content_versions_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO site_content (id,content) VALUES ('published',JSON_OBJECT());

CREATE TABLE IF NOT EXISTS mcq_error_reports (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  question_id VARCHAR(160) NOT NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME(6) NOT NULL,
  resolved_at DATETIME(6) NULL,
  resolved_by CHAR(36) NULL,
  PRIMARY KEY (id),
  KEY mcq_error_reports_status_time_idx (status,created_at),
  KEY mcq_error_reports_user_idx (user_id),
  CONSTRAINT mcq_reports_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT mcq_reports_resolver_fk FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT mcq_reports_status_chk CHECK (status IN ('open','resolved'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_test_series_requests (
  request_id VARCHAR(180) NOT NULL,
  user_id CHAR(36) NOT NULL,
  student_name VARCHAR(180) NOT NULL DEFAULT '',
  student_email VARCHAR(320) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  subjects JSON NOT NULL,
  test_count INT UNSIGNED NOT NULL,
  scheduling_mode VARCHAR(24) NOT NULL,
  start_date DATE NOT NULL,
  duration_days INT UNSIGNED NOT NULL,
  gap_days INT UNSIGNED NOT NULL,
  schedule JSON NOT NULL,
  unit_price INT NULL,
  total_fee INT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'submitted',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (request_id),
  KEY custom_test_series_user_time_idx (user_id,created_at),
  KEY custom_test_series_status_time_idx (status,created_at),
  CONSTRAINT custom_test_series_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT custom_test_series_test_count_chk CHECK (test_count BETWEEN 1 AND 60),
  CONSTRAINT custom_test_series_status_chk CHECK (status IN ('submitted','contacted','approved','completed','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS protected_files (
  id CHAR(36) NOT NULL,
  legacy_bucket VARCHAR(120) NULL,
  owner_user_id CHAR(36) NULL,
  storage_path VARCHAR(900) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NULL,
  access_scope VARCHAR(32) NOT NULL DEFAULT 'authenticated',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY protected_files_storage_uidx (storage_path),
  KEY protected_files_owner_idx (owner_user_id),
  CONSTRAINT protected_files_owner_fk FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT protected_files_scope_chk CHECK (access_scope IN ('owner','authenticated','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Batch registration is intentionally separate from ordinary study accounts.
CREATE TABLE IF NOT EXISTS batches (
  id CHAR(36) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(220) NOT NULL,
  mentor_name VARCHAR(180) NOT NULL DEFAULT '',
  description TEXT NULL,
  fee_pkr INT UNSIGNED NULL,
  capacity INT UNSIGNED NULL,
  registration_opens_at DATETIME(6) NULL,
  registration_closes_at DATETIME(6) NULL,
  starts_at DATETIME(6) NULL,
  ends_at DATETIME(6) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  created_by CHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY batches_slug_uidx (slug),
  KEY batches_status_idx (status),
  CONSTRAINT batches_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT batches_status_chk CHECK (status IN ('draft','open','closed','active','completed','archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batch_registrations (
  id CHAR(36) NOT NULL,
  registration_code VARCHAR(40) NOT NULL,
  batch_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  whatsapp VARCHAR(40) NOT NULL DEFAULT '',
  date_of_birth DATE NULL,
  gender VARCHAR(32) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  province_region VARCHAR(120) NOT NULL DEFAULT '',
  country VARCHAR(120) NOT NULL DEFAULT 'Pakistan',
  css_attempt_year SMALLINT NULL,
  preparation_level VARCHAR(40) NOT NULL DEFAULT '',
  optional_subjects JSON NULL,
  education VARCHAR(240) NOT NULL DEFAULT '',
  previous_academy_mentor VARCHAR(240) NOT NULL DEFAULT '',
  student_message TEXT NULL,
  photo_storage_path VARCHAR(900) NOT NULL,
  photo_mime VARCHAR(80) NOT NULL,
  photo_bytes INT UNSIGNED NOT NULL,
  photo_width INT UNSIGNED NOT NULL,
  photo_height INT UNSIGNED NOT NULL,
  photo_sha256 CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid',
  amount_due_pkr INT UNSIGNED NULL,
  amount_paid_pkr INT UNSIGNED NOT NULL DEFAULT 0,
  consent_at DATETIME(6) NOT NULL,
  submitted_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY batch_registration_code_uidx (registration_code),
  UNIQUE KEY batch_user_registration_uidx (batch_id,user_id),
  KEY batch_registrations_batch_status_idx (batch_id,status,submitted_at),
  KEY batch_registrations_email_idx (email),
  KEY batch_registrations_city_idx (city),
  KEY batch_registrations_gender_idx (gender),
  KEY batch_registrations_attempt_idx (css_attempt_year),
  KEY batch_registrations_dob_idx (date_of_birth),
  CONSTRAINT batch_registrations_batch_fk FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  CONSTRAINT batch_registrations_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT batch_registrations_photo_size_chk CHECK (photo_bytes <= 25600),
  CONSTRAINT batch_registrations_status_chk CHECK (status IN ('new','contacted','confirmed','payment-pending','paid','enrolled','waitlisted','rejected','withdrawn')),
  CONSTRAINT batch_registrations_payment_chk CHECK (payment_status IN ('unpaid','pending','partial','paid','refunded','waived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registration_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  registration_id CHAR(36) NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  changed_by CHAR(36) NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY registration_history_registration_idx (registration_id,created_at),
  CONSTRAINT registration_history_registration_fk FOREIGN KEY (registration_id) REFERENCES batch_registrations(id) ON DELETE CASCADE,
  CONSTRAINT registration_history_admin_fk FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_payments (
  id CHAR(36) NOT NULL,
  registration_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  amount_pkr INT UNSIGNED NOT NULL,
  method VARCHAR(80) NOT NULL DEFAULT '',
  reference_number VARCHAR(180) NOT NULL DEFAULT '',
  payment_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  paid_at DATETIME(6) NULL,
  recorded_by CHAR(36) NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY student_payments_registration_idx (registration_id,created_at),
  KEY student_payments_user_idx (user_id,created_at),
  CONSTRAINT student_payments_registration_fk FOREIGN KEY (registration_id) REFERENCES batch_registrations(id) ON DELETE CASCADE,
  CONSTRAINT student_payments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT student_payments_recorder_fk FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_student_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NULL,
  registration_id CHAR(36) NULL,
  note TEXT NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY admin_student_notes_user_idx (user_id,created_at),
  KEY admin_student_notes_registration_idx (registration_id,created_at),
  CONSTRAINT admin_student_notes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT admin_student_notes_registration_fk FOREIGN KEY (registration_id) REFERENCES batch_registrations(id) ON DELETE CASCADE,
  CONSTRAINT admin_student_notes_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT admin_student_notes_target_chk CHECK (user_id IS NOT NULL OR registration_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Local authentication tables. Password reset tokens and session tokens are
-- stored only as one-way SHA-256/HMAC hashes; plaintext values never enter MySQL.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_hash CHAR(64) NOT NULL,
  user_agent_hash CHAR(64) NULL,
  ip_prefix_hash CHAR(64) NULL,
  expires_at DATETIME(6) NOT NULL,
  last_used_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY auth_sessions_token_uidx (token_hash),
  KEY auth_sessions_user_idx (user_id,expires_at),
  CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  used_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY password_reset_tokens_uidx (token_hash),
  KEY password_reset_user_idx (user_id,created_at),
  CONSTRAINT password_reset_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_security_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NULL,
  email_hash CHAR(64) NULL,
  ip_prefix_hash CHAR(64) NULL,
  event_type VARCHAR(40) NOT NULL,
  occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY login_security_user_time_idx (user_id,occurred_at),
  KEY login_security_email_time_idx (email_hash,occurred_at),
  KEY login_security_ip_time_idx (ip_prefix_hash,occurred_at),
  CONSTRAINT login_security_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personal Factbook. IDs and ownership are preserved exactly during import.
CREATE TABLE IF NOT EXISTS factbook_subjects (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  icon VARCHAR(80) NOT NULL DEFAULT 'book',
  cover_style VARCHAR(32) NOT NULL DEFAULT 'classic',
  accent_color CHAR(7) NOT NULL DEFAULT '#0f6b4f',
  exam_label VARCHAR(80) NOT NULL DEFAULT '',
  target_date DATE NULL,
  position INT NOT NULL DEFAULT 0,
  category_count INT UNSIGNED NOT NULL DEFAULT 0,
  entry_count INT UNSIGNED NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_subject_owner_uidx (id,user_id),
  KEY factbook_subject_user_position_idx (user_id,position,updated_at),
  CONSTRAINT factbook_subject_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_categories (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  name VARCHAR(140) NOT NULL,
  icon VARCHAR(80) NOT NULL DEFAULT 'folder',
  color CHAR(7) NOT NULL DEFAULT '#0f6b4f',
  position INT NOT NULL DEFAULT 0,
  entry_count INT UNSIGNED NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_category_owner_uidx (id,user_id),
  KEY factbook_categories_subject_idx (user_id,subject_id,parent_id,position),
  CONSTRAINT factbook_category_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_category_subject_fk FOREIGN KEY (subject_id,user_id) REFERENCES factbook_subjects(id,user_id) ON DELETE CASCADE,
  CONSTRAINT factbook_category_parent_fk FOREIGN KEY (parent_id,user_id) REFERENCES factbook_categories(id,user_id) ON DELETE RESTRICT,
  CONSTRAINT factbook_category_self_chk CHECK (parent_id IS NULL OR parent_id <> id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_entries (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  category_id CHAR(36) NULL,
  title VARCHAR(220) NOT NULL,
  entry_type VARCHAR(40) NOT NULL,
  content JSON NOT NULL,
  importance VARCHAR(32) NOT NULL DEFAULT 'normal',
  revision_status VARCHAR(32) NOT NULL DEFAULT 'not-reviewed',
  bookmarked TINYINT(1) NOT NULL DEFAULT 0,
  source_count INT UNSIGNED NOT NULL DEFAULT 0,
  personal_remarks TEXT NOT NULL,
  search_text LONGTEXT NULL,
  position INT NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_entry_owner_uidx (id,user_id),
  KEY factbook_entries_subject_idx (user_id,subject_id,category_id,position),
  KEY factbook_entries_updated_idx (user_id,updated_at),
  CONSTRAINT factbook_entry_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_entry_subject_fk FOREIGN KEY (subject_id,user_id) REFERENCES factbook_subjects(id,user_id) ON DELETE CASCADE,
  CONSTRAINT factbook_entry_category_fk FOREIGN KEY (category_id,user_id) REFERENCES factbook_categories(id,user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE FULLTEXT INDEX factbook_entries_search_ftx ON factbook_entries(title,search_text);

CREATE TABLE IF NOT EXISTS factbook_entry_blocks (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  entry_id CHAR(36) NOT NULL,
  block_type VARCHAR(32) NOT NULL,
  content JSON NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_block_owner_uidx (id,user_id),
  KEY factbook_blocks_entry_idx (user_id,entry_id,position),
  CONSTRAINT factbook_block_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_block_entry_fk FOREIGN KEY (entry_id,user_id) REFERENCES factbook_entries(id,user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_sources (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  entry_id CHAR(36) NOT NULL,
  title VARCHAR(300) NOT NULL DEFAULT '',
  author_organization VARCHAR(240) NOT NULL DEFAULT '',
  publication_year VARCHAR(40) NOT NULL DEFAULT '',
  page_number VARCHAR(60) NOT NULL DEFAULT '',
  web_address VARCHAR(2048) NOT NULL DEFAULT '',
  accessed_on DATE NULL,
  verification_note VARCHAR(2000) NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_source_owner_uidx (id,user_id),
  KEY factbook_sources_entry_idx (user_id,entry_id,position),
  CONSTRAINT factbook_source_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_source_entry_fk FOREIGN KEY (entry_id,user_id) REFERENCES factbook_entries(id,user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_tags (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  color CHAR(7) NOT NULL DEFAULT '#0f6b4f',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_tag_owner_uidx (id,user_id),
  UNIQUE KEY factbook_tag_user_name_uidx (user_id,name),
  CONSTRAINT factbook_tag_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_entry_tags (
  user_id CHAR(36) NOT NULL,
  entry_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (entry_id,tag_id),
  CONSTRAINT factbook_entry_tags_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_entry_tags_entry_fk FOREIGN KEY (entry_id,user_id) REFERENCES factbook_entries(id,user_id) ON DELETE CASCADE,
  CONSTRAINT factbook_entry_tags_tag_fk FOREIGN KEY (tag_id,user_id) REFERENCES factbook_tags(id,user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_collections (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL DEFAULT '#b8861f',
  position INT NOT NULL DEFAULT 0,
  archived_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_collection_owner_uidx (id,user_id),
  KEY factbook_collections_user_idx (user_id,position),
  CONSTRAINT factbook_collection_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_collection_entries (
  user_id CHAR(36) NOT NULL,
  collection_id CHAR(36) NOT NULL,
  entry_id CHAR(36) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (collection_id,entry_id),
  KEY factbook_collection_entries_entry_idx (user_id,entry_id),
  CONSTRAINT factbook_collection_entries_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_collection_entries_collection_fk FOREIGN KEY (collection_id,user_id) REFERENCES factbook_collections(id,user_id) ON DELETE CASCADE,
  CONSTRAINT factbook_collection_entries_entry_fk FOREIGN KEY (entry_id,user_id) REFERENCES factbook_entries(id,user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_media (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  entry_id CHAR(36) NULL,
  storage_path VARCHAR(900) NOT NULL,
  file_name VARCHAR(240) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  caption VARCHAR(1000) NOT NULL DEFAULT '',
  alt_text VARCHAR(500) NOT NULL DEFAULT '',
  source VARCHAR(1000) NOT NULL DEFAULT '',
  sha256 CHAR(64) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_media_owner_uidx (id,user_id),
  KEY factbook_media_entry_idx (user_id,entry_id),
  CONSTRAINT factbook_media_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_media_entry_fk FOREIGN KEY (entry_id,user_id) REFERENCES factbook_entries(id,user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_revisions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  entry_id CHAR(36) NOT NULL,
  snapshot JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY factbook_revision_owner_uidx (id,user_id),
  KEY factbook_revisions_entry_idx (user_id,entry_id,created_at),
  CONSTRAINT factbook_revision_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT factbook_revision_entry_fk FOREIGN KEY (entry_id,user_id) REFERENCES factbook_entries(id,user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factbook_preferences (
  user_id CHAR(36) NOT NULL,
  default_view VARCHAR(24) NOT NULL DEFAULT 'cards',
  default_print_layout VARCHAR(24) NOT NULL DEFAULT 'standard',
  source_reminders TINYINT(1) NOT NULL DEFAULT 1,
  autosave_enabled TINYINT(1) NOT NULL DEFAULT 1,
  revision_labels TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT factbook_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration bookkeeping. Every imported table must reconcile before cutover.
CREATE TABLE IF NOT EXISTS migration_runs (
  id CHAR(36) NOT NULL,
  source_project VARCHAR(120) NOT NULL,
  source_snapshot_at DATETIME(6) NOT NULL,
  started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  completed_at DATETIME(6) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'running',
  notes TEXT NULL,
  PRIMARY KEY (id),
  CONSTRAINT migration_runs_status_chk CHECK (status IN ('running','verified','failed','rolled-back'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migration_table_audits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  migration_id CHAR(36) NOT NULL,
  source_table VARCHAR(180) NOT NULL,
  target_table VARCHAR(180) NOT NULL,
  source_count BIGINT UNSIGNED NOT NULL,
  target_count BIGINT UNSIGNED NOT NULL,
  source_digest CHAR(64) NULL,
  target_digest CHAR(64) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  checked_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY migration_table_audit_uidx (migration_id,source_table,target_table),
  CONSTRAINT migration_table_audits_run_fk FOREIGN KEY (migration_id) REFERENCES migration_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migration_row_failures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  migration_id CHAR(36) NOT NULL,
  source_table VARCHAR(180) NOT NULL,
  source_key VARCHAR(255) NOT NULL,
  error_code VARCHAR(80) NOT NULL,
  error_message VARCHAR(1000) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY migration_row_failures_run_idx (migration_id,source_table),
  CONSTRAINT migration_row_failures_run_fk FOREIGN KEY (migration_id) REFERENCES migration_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
