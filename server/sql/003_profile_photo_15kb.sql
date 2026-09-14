-- Legacy migration filename retained for migration-order compatibility.
-- The active CSS Vista profile and registration photo limit is 60 KiB.
-- Canonical 60 KiB constraints are defined in 001_hostinger_core_schema.sql
-- and normalized for existing installations by 007_student_profile_photo_60kb.sql.
-- This file is intentionally a no-op so a fresh or partial migration cannot
-- silently recreate the obsolete 15 KiB constraints.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SELECT 1;
