-- CSS Vista: standardise all student profile/registration photos at 60 KiB.
-- Existing installations may still contain older canonical or legacy stricter
-- CHECK constraints. Drop both variants, then install one canonical 60 KiB
-- constraint per table. Safe for MySQL 8+ and compatible MariaDB deployments.

SET @cssv_is_mariadb := LOCATE('MariaDB', VERSION()) > 0;

SET @cssv_student_photo_check_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_profiles'
    AND CONSTRAINT_NAME = 'student_profiles_photo_size_chk'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @cssv_drop_student_photo_check := IF(
  @cssv_student_photo_check_exists > 0,
  IF(
    @cssv_is_mariadb,
    'ALTER TABLE student_profiles DROP CONSTRAINT student_profiles_photo_size_chk',
    'ALTER TABLE student_profiles DROP CHECK student_profiles_photo_size_chk'
  ),
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_drop_student_photo_check;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;

SET @cssv_student_legacy_check_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_profiles'
    AND CONSTRAINT_NAME = 'student_profiles_photo_size_15k_chk'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @cssv_drop_student_legacy_check := IF(
  @cssv_student_legacy_check_exists > 0,
  IF(
    @cssv_is_mariadb,
    'ALTER TABLE student_profiles DROP CONSTRAINT student_profiles_photo_size_15k_chk',
    'ALTER TABLE student_profiles DROP CHECK student_profiles_photo_size_15k_chk'
  ),
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_drop_student_legacy_check;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;

SET @cssv_batch_photo_check_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batch_registrations'
    AND CONSTRAINT_NAME = 'batch_registrations_photo_size_chk'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @cssv_drop_batch_photo_check := IF(
  @cssv_batch_photo_check_exists > 0,
  IF(
    @cssv_is_mariadb,
    'ALTER TABLE batch_registrations DROP CONSTRAINT batch_registrations_photo_size_chk',
    'ALTER TABLE batch_registrations DROP CHECK batch_registrations_photo_size_chk'
  ),
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_drop_batch_photo_check;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;

SET @cssv_batch_legacy_check_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batch_registrations'
    AND CONSTRAINT_NAME = 'batch_registrations_photo_size_15k_chk'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @cssv_drop_batch_legacy_check := IF(
  @cssv_batch_legacy_check_exists > 0,
  IF(
    @cssv_is_mariadb,
    'ALTER TABLE batch_registrations DROP CONSTRAINT batch_registrations_photo_size_15k_chk',
    'ALTER TABLE batch_registrations DROP CHECK batch_registrations_photo_size_15k_chk'
  ),
  'SELECT 1'
);
PREPARE cssv_stmt FROM @cssv_drop_batch_legacy_check;
EXECUTE cssv_stmt;
DEALLOCATE PREPARE cssv_stmt;

ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_photo_size_chk
  CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 61440);

ALTER TABLE batch_registrations
  ADD CONSTRAINT batch_registrations_photo_size_chk
  CHECK (photo_bytes <= 61440);
