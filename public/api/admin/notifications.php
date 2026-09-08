<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_admin_auth.php';
require_once dirname(__DIR__) . '/_notifications.php';

$pdo = cssv_db();
$session = cssv_require_separate_admin($pdo);
cssv_notifications_ensure_schema($pdo);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    cssv_json(['ok' => true, 'updates' => cssv_notification_rows($pdo, 200)]);
}

if (!in_array($method, ['POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    cssv_fail('Method not allowed.', 405, 'method_not_allowed');
}

$csrfCookie = (string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE] ?? '');
$csrfHeader = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if (
    $csrfCookie === ''
    || $csrfHeader === ''
    || !hash_equals($csrfCookie, $csrfHeader)
    || !hash_equals((string)$session['csrf_hash'], cssv_hash_secret($csrfHeader))
) {
    cssv_fail('Admin security token is missing or expired. Refresh the admin page and try again.', 403, 'admin_csrf_failed');
}

$payload = cssv_request_json();

if ($method === 'POST') {
    $update = cssv_validate_site_update($payload['update'] ?? $payload);
    $stmt = $pdo->prepare(
        'INSERT INTO site_notifications (id,title,body,tag,notify,published_at) VALUES (?,?,?,?,?,?) '
        . 'ON DUPLICATE KEY UPDATE title=VALUES(title),body=VALUES(body),tag=VALUES(tag),notify=VALUES(notify),published_at=VALUES(published_at),updated_at=NOW(6)'
    );
    $stmt->execute([
        $update['id'], $update['title'], $update['body'], $update['tag'], $update['notify'], $update['published_at'],
    ]);
    cssv_json(['ok' => true, 'update' => $update]);
}

$id = trim((string)($payload['id'] ?? ''));
if (!preg_match('/^[A-Za-z0-9_-]{1,80}$/', $id)) {
    cssv_fail('Notification ID is invalid.', 422, 'invalid_notification_id');
}
$stmt = $pdo->prepare('DELETE FROM site_notifications WHERE id=?');
$stmt->execute([$id]);
cssv_json(['ok' => true, 'deleted' => $id]);
