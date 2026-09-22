<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_journal.php';
cssv_require_method('GET');

$pdo = cssv_db();
cssv_journal_ensure_schema($pdo);
header('Cache-Control: public, max-age=30, stale-while-revalidate=120');
cssv_json([
    'ok' => true,
    'articles' => cssv_journal_rows($pdo, false, 100),
]);
