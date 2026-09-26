-- Rollback for 010_mpt_exam_system.sql. Destroys all MPT application, attempt and result data.
DROP TABLE IF EXISTS mpt_paper_replacements;
DROP TABLE IF EXISTS mpt_paper_backups;
DROP TABLE IF EXISTS mpt_events;
DROP TABLE IF EXISTS mpt_rate_hits;
DROP TABLE IF EXISTS mpt_user_stats;
DROP TABLE IF EXISTS mpt_attempt_subject_scores;
DROP TABLE IF EXISTS mpt_attempt_answers;
DROP TABLE IF EXISTS mpt_attempts;
DROP TABLE IF EXISTS mpt_applications;
DROP TABLE IF EXISTS mpt_candidates;
DROP TABLE IF EXISTS mpt_sessions;
DROP TABLE IF EXISTS mpt_mock_questions;
DROP TABLE IF EXISTS mpt_mocks;
DROP TABLE IF EXISTS mpt_meta;
