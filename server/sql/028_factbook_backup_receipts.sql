CREATE TABLE IF NOT EXISTS factbook_backup_requests (
 user_id CHAR(36) NOT NULL, request_id CHAR(36) NOT NULL, payload_hash CHAR(64) NOT NULL,
 result JSON NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (user_id,request_id),
 CONSTRAINT factbook_backup_request_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
