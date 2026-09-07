-- CSS Vista Hostinger migration hardening.
-- Apply after 001_hostinger_core_schema.sql.
-- This migration is idempotent and contains no source/student data.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @cssv_batch_email_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'batch_registrations'
    AND index_name = 'batch_registration_email_uidx'
);
SET @cssv_batch_email_idx_sql := IF(
  @cssv_batch_email_idx_exists = 0,
  'ALTER TABLE batch_registrations ADD UNIQUE KEY batch_registration_email_uidx (batch_id,email)',
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_batch_email_idx_sql;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;

SET @cssv_security_event_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'login_security_events'
    AND index_name = 'login_security_event_type_time_idx'
);
SET @cssv_security_event_idx_sql := IF(
  @cssv_security_event_idx_exists = 0,
  'ALTER TABLE login_security_events ADD KEY login_security_event_type_time_idx (event_type,occurred_at)',
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_security_event_idx_sql;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;
