<?php
declare(strict_types=1);
require_once __DIR__ . '/_account_auth.php';

/** Database-backed draws. The newest campaign is the only public campaign. */
function cssv_draw_schema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS lucky_draw_campaigns (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(140) NOT NULL,
        description VARCHAR(500) NOT NULL DEFAULT '',
        is_public TINYINT(1) NOT NULL DEFAULT 0,
        closes_at DATETIME(6) NULL,
        published_at DATETIME(6) NULL,
        drawn_at DATETIME(6) NULL,
        winner_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX lucky_draw_campaign_public_idx (is_public,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS lucky_draw_entries (
        id CHAR(36) NOT NULL PRIMARY KEY,
        campaign_id BIGINT UNSIGNED NOT NULL,
        user_id CHAR(36) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        personal_number VARCHAR(12) NOT NULL,
        applied_at DATETIME(6) NOT NULL,
        UNIQUE KEY lucky_draw_once_per_account (campaign_id,user_id),
        UNIQUE KEY lucky_draw_unique_number (campaign_id,personal_number),
        INDEX lucky_draw_entries_chronology (campaign_id,applied_at,id),
        FOREIGN KEY (campaign_id) REFERENCES lucky_draw_campaigns(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS lucky_draw_winners (
        campaign_id BIGINT UNSIGNED NOT NULL,
        position SMALLINT UNSIGNED NOT NULL,
        entry_id CHAR(36) NOT NULL,
        selected_at DATETIME(6) NOT NULL,
        PRIMARY KEY (campaign_id,position),
        UNIQUE KEY lucky_draw_entry_wins_once (campaign_id,entry_id),
        FOREIGN KEY (campaign_id) REFERENCES lucky_draw_campaigns(id),
        FOREIGN KEY (entry_id) REFERENCES lucky_draw_entries(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function cssv_draw_current(PDO $pdo, bool $lock = false): ?array {
    $sql = 'SELECT * FROM lucky_draw_campaigns ORDER BY id DESC LIMIT 1' . ($lock ? ' FOR UPDATE' : '');
    $row = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}
function cssv_draw_timestamp(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    return str_replace(' ', 'T', substr((string)$value, 0, 19)) . 'Z';
}
function cssv_draw_closes_at(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value) || strlen($value) > 40) cssv_fail('Invalid deadline.', 422, 'invalid_deadline');
    try {
        $time = new DateTimeImmutable($value);
    } catch (Throwable) {
        cssv_fail('Invalid deadline.', 422, 'invalid_deadline');
    }
    if ($time->getTimestamp() <= time()) cssv_fail('The deadline must be in the future.', 422, 'invalid_deadline');
    return $time->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
}
function cssv_draw_summary(array $row): array {
    return [
        'id' => (int)$row['id'],
        'title' => (string)$row['title'],
        'description' => (string)$row['description'],
        'public' => (bool)$row['is_public'],
        'closes_at' => cssv_draw_timestamp($row['closes_at']),
        'published_at' => cssv_draw_timestamp($row['published_at']),
        'drawn_at' => cssv_draw_timestamp($row['drawn_at']),
        'winner_count' => (int)$row['winner_count'],
    ];
}
function cssv_draw_winners(PDO $pdo, int $campaignId): array {
    $stmt = $pdo->prepare('SELECT w.position,e.full_name,e.personal_number,w.selected_at FROM lucky_draw_winners w JOIN lucky_draw_entries e ON e.id=w.entry_id WHERE w.campaign_id=? ORDER BY w.position');
    $stmt->execute([$campaignId]);
    return array_map(static fn($r) => [
        'position' => (int)$r['position'], 'name' => (string)$r['full_name'],
        'number' => (string)$r['personal_number'],
        'selected_at' => cssv_draw_timestamp($r['selected_at'])
    ], $stmt->fetchAll(PDO::FETCH_ASSOC));
}
function cssv_draw_entries(PDO $pdo, int $campaignId, int $page, int $pageSize = 50): array {
    $page = max(1, min(100000, $page));
    $count = $pdo->prepare('SELECT COUNT(*) FROM lucky_draw_entries WHERE campaign_id=?');
    $count->execute([$campaignId]);
    $total = (int)$count->fetchColumn();
    $stmt = $pdo->prepare('SELECT full_name,personal_number,applied_at FROM lucky_draw_entries WHERE campaign_id=? ORDER BY applied_at,id LIMIT ? OFFSET ?');
    $stmt->bindValue(1, $campaignId, PDO::PARAM_INT);
    $stmt->bindValue(2, $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(3, ($page - 1) * $pageSize, PDO::PARAM_INT);
    $stmt->execute();
    $rows = array_map(static fn($r) => [
        'name' => (string)$r['full_name'], 'number' => (string)$r['personal_number'],
        'applied_at' => cssv_draw_timestamp($r['applied_at'])
    ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    return ['entries' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $pageSize];
}
