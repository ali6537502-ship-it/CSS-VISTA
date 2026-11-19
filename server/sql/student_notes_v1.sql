-- My VISTA Notes v1. Additive migration: run on a reviewed staging copy
-- before rollout, then production under an approved schema-change window.
-- All UUIDs and timestamps remain part of the standard MySQL backup.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS student_note_folders (
  id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, parent_id CHAR(36) NULL,
  name VARCHAR(180) NOT NULL, depth TINYINT UNSIGNED NOT NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY(id), KEY user_parent(user_id,parent_id,deleted_at),
  CONSTRAINT note_folders_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_notes (
  id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, folder_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled note',
  pinned TINYINT(1) NOT NULL DEFAULT 0, deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY(id), KEY user_folder(user_id,folder_id,deleted_at),
  KEY user_recent(user_id,deleted_at,pinned,updated_at),
  CONSTRAINT notes_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_note_pages (
  id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, note_id CHAR(36) NOT NULL,
  position INT UNSIGNED NOT NULL, content_html LONGTEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1, last_request_id CHAR(36) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY(id), KEY note_pages_order(user_id,note_id,deleted_at,position),
  CONSTRAINT note_pages_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT note_pages_note_fk FOREIGN KEY(note_id) REFERENCES student_notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_note_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, user_id CHAR(36) NOT NULL,
  page_id CHAR(36) NOT NULL, version INT UNSIGNED NOT NULL,
  content_html LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY(id), UNIQUE KEY user_page_version(user_id,page_id,version),
  KEY revision_recent(user_id,page_id,created_at),
  CONSTRAINT note_revisions_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT note_revisions_page_fk FOREIGN KEY(page_id) REFERENCES student_note_pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
