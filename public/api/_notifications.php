<?php
declare(strict_types=1);

function cssv_notifications_ensure_schema(PDO $pdo): void
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_notifications (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $error) {
        error_log('CSSV notification schema setup failed: ' . $error->getMessage());
        cssv_fail('Notifications are temporarily unavailable.', 503, 'notifications_unavailable');
    }
}

function cssv_notification_rows(PDO $pdo, int $limit = 100): array
{
    $limit = max(1, min(200, $limit));
    $stmt = $pdo->query(
        'SELECT id,title,body,tag,notify,published_at FROM site_notifications ORDER BY published_at DESC, updated_at DESC LIMIT ' . $limit
    );
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['notify'] = (bool)($row['notify'] ?? false);
        $published = (string)($row['published_at'] ?? '');
        $row['date'] = $published !== '' ? substr($published, 0, 10) : gmdate('Y-m-d');
        unset($row['published_at']);
    }
    unset($row);
    return $rows;
}

function cssv_validate_site_update(mixed $value): array
{
    if (!is_array($value)) cssv_fail('A valid notification is required.', 422, 'invalid_notification');

    $id = trim((string)($value['id'] ?? ''));
    $title = trim((string)($value['title'] ?? ''));
    $body = trim((string)($value['body'] ?? ''));
    $tag = trim((string)($value['tag'] ?? 'General')) ?: 'General';
    $date = trim((string)($value['date'] ?? ''));
    $notify = (bool)($value['notify'] ?? true);

    if (!preg_match('/^[A-Za-z0-9_-]{1,80}$/', $id)) cssv_fail('Notification ID is invalid.', 422, 'invalid_notification_id');
    if ($title === '' || mb_strlen($title) > 180) cssv_fail('Notification title is required and must be under 180 characters.', 422, 'invalid_notification_title');
    if ($body === '' || mb_strlen($body) > 1200) cssv_fail('Notification message is required and must be under 1200 characters.', 422, 'invalid_notification_body');
    if (mb_strlen($tag) > 40) cssv_fail('Notification tag is too long.', 422, 'invalid_notification_tag');
    if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) cssv_fail('Notification date is invalid.', 422, 'invalid_notification_date');

    return [
        'id' => $id,
        'title' => $title,
        'body' => $body,
        'tag' => $tag,
        'notify' => $notify ? 1 : 0,
        'published_at' => ($date !== '' ? $date : gmdate('Y-m-d')) . ' 12:00:00',
    ];
}
