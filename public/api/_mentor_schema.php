<?php
declare(strict_types=1);
function cssv_mentor_schema_statements(): array { return [
 'CREATE TABLE IF NOT EXISTS mentor_answers (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, attempt_id CHAR(36) NOT NULL,
 root_id CHAR(36) NULL, retry_of CHAR(36) NULL, sequence INT UNSIGNED NOT NULL DEFAULT 1,
 subject_id VARCHAR(100) NOT NULL, topic VARCHAR(180) NOT NULL, question TEXT NOT NULL,
 provenance VARCHAR(24) NOT NULL, source_reference VARCHAR(500) NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT \'not_attempted\', written_date DATE NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, evaluation_revision INT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY mentor_answer_owner (user_id,attempt_id,updated_at), KEY mentor_answer_root (root_id,sequence),
 CONSTRAINT mentor_answer_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT mentor_answer_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT mentor_answer_root_fk FOREIGN KEY(root_id) REFERENCES mentor_answers(id) ON DELETE RESTRICT,
 CONSTRAINT mentor_answer_retry_fk FOREIGN KEY(retry_of) REFERENCES mentor_answers(id) ON DELETE RESTRICT,
 CONSTRAINT mentor_answer_state_chk CHECK (status IN (\'not_attempted\',\'awaiting_evaluation\',\'evaluated\')),
 CONSTRAINT mentor_answer_source_chk CHECK (provenance IN (\'practice\',\'student_past_paper\'))
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
 'CREATE TABLE IF NOT EXISTS mentor_evaluations (
 id CHAR(36) PRIMARY KEY, answer_id CHAR(36) NOT NULL, revision INT UNSIGNED NOT NULL,
 obtained_marks SMALLINT UNSIGNED NOT NULL, maximum_marks SMALLINT UNSIGNED NOT NULL,
 evaluation_date DATE NOT NULL, mentor_comment TEXT NOT NULL, correction_reason VARCHAR(500) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY mentor_evaluation_revision (answer_id,revision),
 CONSTRAINT mentor_evaluation_answer_fk FOREIGN KEY(answer_id) REFERENCES mentor_answers(id) ON DELETE RESTRICT,
 CONSTRAINT mentor_evaluation_marks_chk CHECK (maximum_marks BETWEEN 1 AND 1000 AND obtained_marks <= maximum_marks)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
 ]; }
