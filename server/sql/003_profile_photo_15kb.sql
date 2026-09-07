-- CSS Vista profile-photo hard limit.
-- Apply after 001_hostinger_core_schema.sql and 002_hostinger_hardening.sql.
-- User requirement: final stored profile/registration photo must be <= 15 KiB.
-- This migration is additive and idempotent: the original 25 KiB checks may
-- remain, while these stricter checks become the effective database limit.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @cssv_student_photo_15k_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'student_profiles'
    AND constraint_type = 'CHECK'
    AND constraint_name = 'student_profiles_photo_size_15k_chk'
);
SET @cssv_student_photo_15k_sql := IF(
  @cssv_student_photo_15k_exists = 0,
  'ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_photo_size_15k_chk CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 15360)',
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_student_photo_15k_sql;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;

SET @cssv_batch_photo_15k_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'batch_registrations'
    AND constraint_type = 'CHECK'
    AND constraint_name = 'batch_registrations_photo_size_15k_chk'
);
SET @cssv_batch_photo_15k_sql := IF(
  @cssv_batch_photo_15k_exists = 0,
  'ALTER TABLE batch_registrations ADD CONSTRAINT batch_registrations_photo_size_15k_chk CHECK (photo_bytes <= 15360)',
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_batch_photo_15k_sql;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;
