-- CSS Vista Hostinger notification channel
-- Idempotent schema for public student bell notifications published by the private owner admin.

CREATE TABLE IF NOT EXISTS site_notifications (
  id VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(1200) NOT NULL,
  tag VARCHAR(40) NOT NULL DEFAULT 'General',
  notify TINYINT(1) NOT NULL DEFAULT 1,
  published_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY site_notifications_published_idx (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
