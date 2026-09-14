-- CSS Vista: structured previous-student history for profile creation.
-- Idempotent for existing Hostinger installations.

SET @cssv_has_previous_student := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'student_profiles'
    AND column_name = 'previous_css_vista_student'
);
SET @cssv_add_previous_student := IF(
  @cssv_has_previous_student = 0,
  "ALTER TABLE student_profiles ADD COLUMN previous_css_vista_student VARCHAR(64) NOT NULL DEFAULT '' AFTER previous_academy_mentor",
  'SELECT 1'
);
PREPARE cssv_previous_student_stmt FROM @cssv_add_previous_student;
EXECUTE cssv_previous_student_stmt;
DEALLOCATE PREPARE cssv_previous_student_stmt;

SET @cssv_has_previous_services := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'student_profiles'
    AND column_name = 'previous_css_vista_services'
);
SET @cssv_add_previous_services := IF(
  @cssv_has_previous_services = 0,
  'ALTER TABLE student_profiles ADD COLUMN previous_css_vista_services JSON NULL AFTER previous_css_vista_student',
  'SELECT 1'
);
PREPARE cssv_previous_services_stmt FROM @cssv_add_previous_services;
EXECUTE cssv_previous_services_stmt;
DEALLOCATE PREPARE cssv_previous_services_stmt;

SET @cssv_has_previous_details := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'student_profiles'
    AND column_name = 'previous_css_vista_details'
);
SET @cssv_add_previous_details := IF(
  @cssv_has_previous_details = 0,
  "ALTER TABLE student_profiles ADD COLUMN previous_css_vista_details VARCHAR(500) NOT NULL DEFAULT '' AFTER previous_css_vista_services",
  'SELECT 1'
);
PREPARE cssv_previous_details_stmt FROM @cssv_add_previous_details;
EXECUTE cssv_previous_details_stmt;
DEALLOCATE PREPARE cssv_previous_details_stmt;
