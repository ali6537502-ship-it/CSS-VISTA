CREATE TABLE IF NOT EXISTS current_affairs_days (
 publication_date DATE NOT NULL PRIMARY KEY, published_at DATETIME(6) NOT NULL,
 edition VARCHAR(160) NOT NULL, metadata JSON NOT NULL, payload_hash CHAR(64) NOT NULL,
 is_published TINYINT(1) NOT NULL DEFAULT 1, story_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 ingested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 INDEX ca_days_visible (is_published, publication_date, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_items (
 id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 publication_date DATE NOT NULL, category VARCHAR(120) NOT NULL, headline VARCHAR(350) NOT NULL,
 summary TEXT NOT NULL, content JSON NOT NULL, search_text MEDIUMTEXT NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 INDEX ca_items_day (publication_date, active), INDEX ca_items_category (category, publication_date),
 FULLTEXT INDEX ca_items_search (search_text),
 CONSTRAINT ca_items_day_fk FOREIGN KEY (publication_date) REFERENCES current_affairs_days(publication_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_user_items (
 user_id CHAR(36) NOT NULL, item_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 saved TINYINT(1) NOT NULL DEFAULT 0, status ENUM('unread','opened','read') NOT NULL DEFAULT 'unread',
 saved_at DATETIME(6) NULL, first_opened_at DATETIME(6) NULL, last_opened_at DATETIME(6) NULL, completed_at DATETIME(6) NULL,
 PRIMARY KEY (user_id, item_id), INDEX ca_user_saved (user_id, saved, saved_at),
 INDEX ca_user_reading (user_id, status, last_opened_at),
 CONSTRAINT ca_user_item_fk FOREIGN KEY (item_id) REFERENCES current_affairs_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_preferences (
 user_id CHAR(36) NOT NULL PRIMARY KEY, reading_mode ENUM('quick','full') NOT NULL DEFAULT 'quick',
 preferred_categories JSON NOT NULL, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_ingestion_runs (
 id CHAR(36) NOT NULL PRIMARY KEY, publication_date DATE NULL,
 status VARCHAR(30) NOT NULL, story_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 error_code VARCHAR(120) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX ca_ingestion_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_publish_tokens (
 id CHAR(36) NOT NULL PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE, label VARCHAR(120) NOT NULL,
 created_by CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 expires_at DATETIME(6) NOT NULL, last_used_at DATETIME(6) NULL, revoked_at DATETIME(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_release_files (
 file_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 file_hash CHAR(64) NOT NULL, applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
