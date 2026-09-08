<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('POST');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
cssv_admin_revoke_session($pdo);
cssv_json(['ok' => true]);
