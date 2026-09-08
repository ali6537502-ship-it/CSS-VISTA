<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_notifications.php';
cssv_require_method('GET');

$pdo = cssv_db();
cssv_notifications_ensure_schema($pdo);
cssv_json([
    'ok' => true,
    'updates' => cssv_notification_rows($pdo, 100),
]);
