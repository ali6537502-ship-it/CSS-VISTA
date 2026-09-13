<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');
$pdo = cssv_db();
$session = cssv_require_user($pdo, false);
cssv_require_csrf($session);
cssv_revoke_current_session($pdo);
cssv_log_security_event($pdo, 'logout', (string)$session['user_id'], (string)$session['email']);
cssv_json(['ok' => true]);
