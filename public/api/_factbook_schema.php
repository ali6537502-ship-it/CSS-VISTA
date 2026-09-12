<?php
declare(strict_types=1);
// Fixed allowlist generated from the committed Hostinger schema. Never inferred from client input.
return json_decode(<<<'JSON'
{
  "factbook_subjects": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "name": "VARCHAR(120)",
    "description": "VARCHAR(1000)",
    "icon": "VARCHAR(80)",
    "cover_style": "VARCHAR(32)",
    "accent_color": "CHAR(7)",
    "exam_label": "VARCHAR(80)",
    "target_date": "DATE",
    "position": "INT",
    "category_count": "INT UNSIGNED",
    "entry_count": "INT UNSIGNED",
    "archived_at": "DATETIME(6)",
    "deleted_at": "DATETIME(6)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_categories": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "subject_id": "CHAR(36)",
    "parent_id": "CHAR(36)",
    "name": "VARCHAR(140)",
    "icon": "VARCHAR(80)",
    "color": "CHAR(7)",
    "position": "INT",
    "entry_count": "INT UNSIGNED",
    "archived_at": "DATETIME(6)",
    "deleted_at": "DATETIME(6)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_entries": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "subject_id": "CHAR(36)",
    "category_id": "CHAR(36)",
    "title": "VARCHAR(220)",
    "entry_type": "VARCHAR(40)",
    "content": "JSON",
    "importance": "VARCHAR(32)",
    "revision_status": "VARCHAR(32)",
    "bookmarked": "TINYINT(1)",
    "source_count": "INT UNSIGNED",
    "personal_remarks": "TEXT",
    "search_text": "LONGTEXT",
    "position": "INT",
    "archived_at": "DATETIME(6)",
    "deleted_at": "DATETIME(6)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_entry_blocks": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "entry_id": "CHAR(36)",
    "block_type": "VARCHAR(32)",
    "content": "JSON",
    "position": "INT",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_sources": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "entry_id": "CHAR(36)",
    "title": "VARCHAR(300)",
    "author_organization": "VARCHAR(240)",
    "publication_year": "VARCHAR(40)",
    "page_number": "VARCHAR(60)",
    "web_address": "VARCHAR(2048)",
    "accessed_on": "DATE",
    "verification_note": "VARCHAR(2000)",
    "position": "INT",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_tags": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "name": "VARCHAR(60)",
    "color": "CHAR(7)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_entry_tags": {
    "user_id": "CHAR(36)",
    "entry_id": "CHAR(36)",
    "tag_id": "CHAR(36)",
    "created_at": "DATETIME(6)"
  },
  "factbook_collections": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "name": "VARCHAR(100)",
    "description": "VARCHAR(1000)",
    "color": "CHAR(7)",
    "position": "INT",
    "archived_at": "DATETIME(6)",
    "deleted_at": "DATETIME(6)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_collection_entries": {
    "user_id": "CHAR(36)",
    "collection_id": "CHAR(36)",
    "entry_id": "CHAR(36)",
    "position": "INT",
    "created_at": "DATETIME(6)"
  },
  "factbook_media": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "entry_id": "CHAR(36)",
    "storage_path": "VARCHAR(900)",
    "file_name": "VARCHAR(240)",
    "mime_type": "VARCHAR(80)",
    "byte_size": "INT UNSIGNED",
    "width": "INT UNSIGNED",
    "height": "INT UNSIGNED",
    "caption": "VARCHAR(1000)",
    "alt_text": "VARCHAR(500)",
    "source": "VARCHAR(1000)",
    "sha256": "CHAR(64)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  },
  "factbook_revisions": {
    "id": "CHAR(36)",
    "user_id": "CHAR(36)",
    "entry_id": "CHAR(36)",
    "snapshot": "JSON",
    "created_at": "DATETIME(6)"
  },
  "factbook_preferences": {
    "user_id": "CHAR(36)",
    "default_view": "VARCHAR(24)",
    "default_print_layout": "VARCHAR(24)",
    "source_reminders": "TINYINT(1)",
    "autosave_enabled": "TINYINT(1)",
    "revision_labels": "TINYINT(1)",
    "created_at": "DATETIME(6)",
    "updated_at": "DATETIME(6)"
  }
}
JSON, true, 16, JSON_THROW_ON_ERROR);
