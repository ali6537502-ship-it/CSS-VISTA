<?php
declare(strict_types=1);

function cssv_journal_ensure_schema(PDO $pdo): void
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS journal_articles (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $error) {
        error_log('CSSV journal schema setup failed: ' . $error->getMessage());
        cssv_fail('VISTA Journal is temporarily unavailable.', 503, 'journal_unavailable');
    }
}

function cssv_journal_rows(PDO $pdo, bool $includeDrafts = false, int $limit = 100): array
{
    $limit = max(1, min(500, $limit));
    $where = $includeDrafts ? '' : 'WHERE published=1';
    $rows = $pdo->query(
        "SELECT id,slug,title,category,author,author_role,excerpt,body,published_on,featured,published,created_at,updated_at
         FROM journal_articles
         $where
         ORDER BY featured DESC,published_on DESC,updated_at DESC
         LIMIT $limit"
    )->fetchAll();

    foreach ($rows as &$row) {
        $row['featured'] = (bool)($row['featured'] ?? false);
        $row['published'] = (bool)($row['published'] ?? false);
        $row['published_on'] = substr((string)($row['published_on'] ?? ''), 0, 10);
    }
    unset($row);
    return $rows;
}

function cssv_journal_slug_base(string $title): string
{
    $value = trim($title);
    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (is_string($ascii) && $ascii !== '') $value = $ascii;
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    if ($value === '') $value = 'article';
    return substr($value, 0, 140);
}

function cssv_journal_unique_slug(PDO $pdo, string $title): string
{
    $base = cssv_journal_slug_base($title);
    $slug = $base;
    $counter = 2;
    $stmt = $pdo->prepare('SELECT 1 FROM journal_articles WHERE slug=? LIMIT 1');
    while (true) {
        $stmt->execute([$slug]);
        if (!$stmt->fetchColumn()) return $slug;
        $suffix = '-' . $counter++;
        $slug = substr($base, 0, 140 - strlen($suffix)) . $suffix;
    }
}

function cssv_journal_valid_date(string $value): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)) return false;
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

function cssv_journal_validate_article(mixed $value): array
{
    if (!is_array($value)) cssv_fail('A valid journal article is required.', 422, 'invalid_journal_article');

    $id = trim((string)($value['id'] ?? ''));
    $title = trim((string)($value['title'] ?? ''));
    $category = trim((string)($value['category'] ?? ''));
    $author = trim((string)($value['author'] ?? ''));
    $authorRole = trim((string)($value['author_role'] ?? ''));
    $excerpt = trim((string)($value['excerpt'] ?? ''));
    $body = trim((string)($value['body'] ?? ''));
    $publishedOn = trim((string)($value['published_on'] ?? gmdate('Y-m-d')));
    $featured = (bool)($value['featured'] ?? false);
    $published = (bool)($value['published'] ?? true);

    if ($id !== '' && !preg_match('/^[a-f0-9-]{36}$/i', $id)) cssv_fail('Journal article ID is invalid.', 422, 'invalid_journal_id');
    if ($title === '' || mb_strlen($title) > 240) cssv_fail('Title is required and must be under 240 characters.', 422, 'invalid_journal_title');
    if ($category === '' || mb_strlen($category) > 80) cssv_fail('Category is required and must be under 80 characters.', 422, 'invalid_journal_category');
    if ($author === '' || mb_strlen($author) > 180) cssv_fail('Author name is required and must be under 180 characters.', 422, 'invalid_journal_author');
    if (mb_strlen($authorRole) > 180) cssv_fail('Author designation must be under 180 characters.', 422, 'invalid_journal_author_role');
    if ($excerpt === '' || mb_strlen($excerpt) > 1200) cssv_fail('Short summary is required and must be under 1200 characters.', 422, 'invalid_journal_excerpt');
    if ($body === '' || mb_strlen($body) > 120000) cssv_fail('Full article text is required and must be under 120,000 characters.', 422, 'invalid_journal_body');
    if (!cssv_journal_valid_date($publishedOn)) cssv_fail('Publication date is invalid.', 422, 'invalid_journal_date');

    return [
        'id' => $id,
        'title' => $title,
        'category' => $category,
        'author' => $author,
        'author_role' => $authorRole,
        'excerpt' => $excerpt,
        'body' => $body,
        'published_on' => $publishedOn,
        'featured' => $featured ? 1 : 0,
        'published' => $published ? 1 : 0,
    ];
}
