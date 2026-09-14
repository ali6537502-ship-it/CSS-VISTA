-- CSS Vista: standardise student profile photos at 60 KB.
-- Existing installations may still have the original 25 KB CHECK constraint.
-- The live student upload endpoint applies the same migration idempotently.

SET @cssv_photo_check_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_profiles'
    AND CONSTRAINT_NAME = 'student_profiles_photo_size_chk'
    AND CONSTRAINT_TYPE = 'CHECK'
);

SET @cssv_is_mariadb := LOCATE('MariaDB', VERSION()) > 0;
SET @cssv_drop_photo_check := IF(
  @cssv_photo_check_exists > 0,
  IF(
    @cssv_is_mariadb,
    'ALTER TABLE student_profiles DROP CONSTRAINT student_profiles_photo_size_chk',
    'ALTER TABLE student_profiles DROP CHECK student_profiles_photo_size_chk'
  ),
  'SELECT 1'
);

PREPARE cssv_photo_drop_stmt FROM @cssv_drop_photo_check;
EXECUTE cssv_photo_drop_stmt;
DEALLOCATE PREPARE cssv_photo_drop_stmt;

ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_photo_size_chk
  CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 61440);
