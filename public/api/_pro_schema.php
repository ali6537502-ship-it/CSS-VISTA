<?php
declare(strict_types=1);
// Mirror of server/sql/012_pro_membership.sql; parity is checked in tests/pro/unit.php.
function cssv_pro_schema_statements(): array
{
    return [
        'CREATE TABLE IF NOT EXISTS pro_memberships (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  starts_at DATETIME(6) NULL,
  expires_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pro_membership_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS pro_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  request_id CHAR(36) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT \'awaiting_payment\',
  amount_minor INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT \'PKR\',
  duration_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  receiver_number VARCHAR(24) NOT NULL,
  receiver_title VARCHAR(120) NOT NULL,
  terms_version VARCHAR(80) NOT NULL,
  terms_text TEXT NOT NULL,
  return_to VARCHAR(120) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY pro_order_request (user_id,request_id),
  KEY pro_order_history (user_id,created_at),
  CONSTRAINT pro_order_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT pro_order_status_chk CHECK (status IN (\'awaiting_payment\',\'awaiting_verification\',\'approved\',\'rejected\',\'cancelled\')),
  CONSTRAINT pro_order_product_chk CHECK (amount_minor > 0 AND currency = \'PKR\' AND duration_days = 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS pro_submissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  request_id CHAR(36) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  transaction_id VARCHAR(80) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT \'pending\',
  submitted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reviewed_at DATETIME(6) NULL,
  reviewed_by CHAR(36) NULL,
  review_reason VARCHAR(500) NULL,
  received_amount_minor INT UNSIGNED NULL,
  received_at DATETIME(6) NULL,
  UNIQUE KEY pro_submission_request (order_id,request_id),
  KEY pro_submission_queue (status,submitted_at),
  KEY pro_submission_order (order_id,submitted_at),
  CONSTRAINT pro_submission_order_fk FOREIGN KEY (order_id) REFERENCES pro_orders(id) ON DELETE RESTRICT,
  CONSTRAINT pro_submission_admin_fk FOREIGN KEY (reviewed_by) REFERENCES admin_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT pro_submission_status_chk CHECK (status IN (\'pending\',\'approved\',\'rejected\'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS pro_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  submission_id CHAR(36) NOT NULL,
  transaction_id VARCHAR(80) NOT NULL,
  source VARCHAR(24) NOT NULL DEFAULT \'easypaisa_manual\',
  activated_at DATETIME(6) NOT NULL,
  starts_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  UNIQUE KEY pro_grant_order (order_id),
  UNIQUE KEY pro_grant_submission (submission_id),
  UNIQUE KEY pro_grant_transaction (transaction_id),
  KEY pro_grant_history (user_id,activated_at),
  CONSTRAINT pro_grant_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT pro_grant_order_fk FOREIGN KEY (order_id) REFERENCES pro_orders(id) ON DELETE RESTRICT,
  CONSTRAINT pro_grant_submission_fk FOREIGN KEY (submission_id) REFERENCES pro_submissions(id) ON DELETE RESTRICT,
  CONSTRAINT pro_grant_period_chk CHECK (expires_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];
}
