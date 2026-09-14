-- Additive Hostinger email verification and encrypted delivery queue.
CREATE TABLE IF NOT EXISTS account_verification_tokens (
        id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME(6) NOT NULL, used_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY account_verification_user_idx(user_id,created_at),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_mail_outbox (
        id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, purpose VARCHAR(24) NOT NULL,
        message_cipher MEDIUMTEXT NULL, status VARCHAR(24) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0, next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        expires_at DATETIME(6) NOT NULL, accepted_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY account_mail_queue_idx(status,next_attempt_at),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_reset_codes (
        user_id CHAR(36) PRIMARY KEY,
        code_hash CHAR(64) NOT NULL,
        code_fingerprint CHAR(64) NULL,
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME(6) NOT NULL,
        UNIQUE KEY account_reset_code_fingerprint_uidx(code_fingerprint),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
