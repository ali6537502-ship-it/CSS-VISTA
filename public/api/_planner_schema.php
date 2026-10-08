<?php
declare(strict_types=1);
function cssv_planner_schema_statements(): array {return [
"CREATE TABLE IF NOT EXISTS attempt_planner_settings (
 attempt_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, version INT UNSIGNED NOT NULL DEFAULT 1,
 religion_choice VARCHAR(32) NOT NULL, imported_at DATETIME(6) NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 CONSTRAINT planner_settings_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT planner_settings_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT planner_religion_chk CHECK(religion_choice IN ('islamic-studies','comparative-religions'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS attempt_unit_progress (
 attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, unit_id VARCHAR(180) NOT NULL, version INT UNSIGNED NOT NULL DEFAULT 1,
 coverage VARCHAR(16) NOT NULL DEFAULT 'not_started', last_studied DATE NULL, next_revision DATE NULL,
 review_count INT UNSIGNED NOT NULL DEFAULT 0, source JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(attempt_id,unit_id), KEY planner_unit_due(user_id,attempt_id,next_revision),
 CONSTRAINT planner_unit_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT planner_unit_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT planner_coverage_chk CHECK(coverage IN ('not_started','learning','covered'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS attempt_daily_plans (
 id CHAR(36) PRIMARY KEY, attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, plan_date DATE NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 0, budget SMALLINT UNSIGNED NOT NULL, rule_version VARCHAR(80) NOT NULL,
 input_hash CHAR(64) NOT NULL, summary JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 UNIQUE KEY planner_attempt_day(attempt_id,plan_date), KEY planner_owner_day(user_id,plan_date),
 CONSTRAINT planner_day_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT planner_day_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS attempt_plan_tasks (
 id CHAR(36) PRIMARY KEY, plan_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, work_key VARCHAR(220) NOT NULL,
 unit_id VARCHAR(180) NULL, kind VARCHAR(32) NOT NULL, snapshot JSON NOT NULL,
 minutes SMALLINT UNSIGNED NOT NULL, actual_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 status VARCHAR(16) NOT NULL DEFAULT 'pending', version INT UNSIGNED NOT NULL DEFAULT 1,
 moved_to CHAR(36) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY planner_work_identity(plan_id,work_key), KEY planner_task_owner(user_id,plan_id,status),
 CONSTRAINT planner_task_plan_fk FOREIGN KEY(plan_id) REFERENCES attempt_daily_plans(id) ON DELETE RESTRICT,
 CONSTRAINT planner_task_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT planner_task_moved_fk FOREIGN KEY(moved_to) REFERENCES attempt_plan_tasks(id) ON DELETE RESTRICT,
 CONSTRAINT planner_task_status_chk CHECK(status IN ('pending','partial','completed','skipped','deferred','moved')),
 CONSTRAINT planner_task_minutes_chk CHECK(minutes BETWEEN 1 AND 1440 AND actual_minutes<=minutes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS attempt_evidence_links (
 attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, evidence_key VARCHAR(280) NOT NULL,
 kind VARCHAR(32) NOT NULL, unit_id VARCHAR(180) NULL, source_id VARCHAR(255) NOT NULL, snapshot JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(attempt_id,evidence_key), KEY planner_links_unit(user_id,attempt_id,unit_id,kind),
 CONSTRAINT planner_link_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT planner_link_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS attempt_planner_events (
 id CHAR(36) PRIMARY KEY, attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 task_id CHAR(36) NULL, unit_id VARCHAR(180) NULL, event_type VARCHAR(32) NOT NULL, payload JSON NOT NULL,
 occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), KEY planner_event_period(user_id,attempt_id,occurred_at),
 CONSTRAINT planner_event_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT planner_event_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT planner_event_task_fk FOREIGN KEY(task_id) REFERENCES attempt_plan_tasks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
];}
