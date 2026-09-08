<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('GET');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$configured = (bool)$pdo->query("SELECT 1 FROM admin_accounts WHERE email='" . CSSV_OWNER_EMAIL . "' AND disabled_at IS NULL LIMIT 1")->fetchColumn();
$session = cssv_admin_current_session($pdo, true);
cssv_json(['ok' => true, 'configured' => $configured, 'authenticated' => (bool)$session, 'email' => CSSV_OWNER_EMAIL]);
