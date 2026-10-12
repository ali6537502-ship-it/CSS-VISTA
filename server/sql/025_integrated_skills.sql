-- Additive owned contexts bound to existing writing and AI ledgers. No data reset.
CREATE TABLE IF NOT EXISTS skills_workspaces (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, attempt_id CHAR(36) NOT NULL,
 feature VARCHAR(24) NOT NULL, lesson_id VARCHAR(150) NOT NULL, level VARCHAR(16) NOT NULL,
 source_hash CHAR(64) NOT NULL, source_snapshot JSON NOT NULL, statement TEXT NOT NULL,
 writing_id CHAR(36) NULL, version INT UNSIGNED NOT NULL DEFAULT 0, position TINYINT UNSIGNED NOT NULL DEFAULT 0,
 parent_id CHAR(36) NULL, parent_version_id CHAR(36) NULL, parent_field VARCHAR(40) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY skills_owner_history(user_id,updated_at,id), KEY skills_attempt(attempt_id,feature,updated_at),
 UNIQUE KEY skills_writing(writing_id),
 CONSTRAINT skills_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT skills_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT skills_writing_fk FOREIGN KEY(writing_id) REFERENCES writing_records(id) ON DELETE RESTRICT,
 CONSTRAINT skills_parent_fk FOREIGN KEY(parent_id) REFERENCES skills_workspaces(id) ON DELETE RESTRICT,
 CONSTRAINT skills_parent_version_fk FOREIGN KEY(parent_version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT skills_feature_chk CHECK(feature IN ('sentence','argument','analysis','essay') AND level IN ('beginner','intermediate','advanced'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills_versions (
 version_id CHAR(36) PRIMARY KEY, workspace_id CHAR(36) NOT NULL, answers JSON NOT NULL, evidence JSON NOT NULL,
 CONSTRAINT skills_version_fk FOREIGN KEY(version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT skills_workspace_fk FOREIGN KEY(workspace_id) REFERENCES skills_workspaces(id) ON DELETE RESTRICT,
 KEY skills_version_workspace(workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills_ai_inputs (
 operation_id CHAR(36) PRIMARY KEY, workspace_id CHAR(36) NOT NULL, input JSON NOT NULL, input_hash CHAR(64) NOT NULL,
 CONSTRAINT skills_ai_operation_fk FOREIGN KEY(operation_id) REFERENCES ai_operations(id) ON DELETE RESTRICT,
 CONSTRAINT skills_ai_workspace_fk FOREIGN KEY(workspace_id) REFERENCES skills_workspaces(id) ON DELETE RESTRICT,
 KEY skills_ai_workspace(workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
