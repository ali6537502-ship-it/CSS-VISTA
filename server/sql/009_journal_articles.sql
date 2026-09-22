CREATE TABLE IF NOT EXISTS journal_articles (
  id CHAR(36) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  title VARCHAR(240) NOT NULL,
  category VARCHAR(80) NOT NULL,
  author VARCHAR(180) NOT NULL,
  author_role VARCHAR(180) NOT NULL DEFAULT '',
  excerpt VARCHAR(1200) NOT NULL,
  body LONGTEXT NOT NULL,
  published_on DATE NOT NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY journal_articles_slug_uidx (slug),
  KEY journal_articles_publish_idx (published,published_on,updated_at),
  KEY journal_articles_featured_idx (featured,published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
