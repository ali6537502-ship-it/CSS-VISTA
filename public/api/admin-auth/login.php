<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('POST');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$body = cssv_request_json();
$email = cssv_normalize_email($body['email'] ?? '');
$password = (string)($body['password'] ?? '');
if (!cssv_is_owner_email($email)) cssv_fail('Incorrect email or password.', 401, 'invalid_credentials');
cssv_enforce_rate_limit($pdo, 'admin_login_failed', $email, 8, 900);
$stmt = $pdo->prepare('SELECT * FROM admin_accounts WHERE email=? AND disabled_at IS NULL LIMIT 1');
$stmt->execute([$email]);
$admin = $stmt->fetch();
if (!$admin || ($admin['locked_until'] && strtotime((string)$admin['locked_until']) > time()) || !password_verify($password, (string)$admin['password_hash'])) {
    if ($admin) {
        $attempts = (int)$admin['failed_attempts'] + 1;
        $lockedUntil = $attempts >= 8 ? gmdate('Y-m-d H:i:s', time() + 15 * 60) : null;
        $pdo->prepare('UPDATE admin_accounts SET failed_attempts=?,locked_until=? WHERE id=?')->execute([$attempts, $lockedUntil, $admin['id']]);
    }
    cssv_log_security_event($pdo, 'admin_login_failed', $admin['id'] ?? null, $email);
    cssv_fail('Incorrect email or password.', 401, 'invalid_credentials');
}
$pdo->prepare('UPDATE admin_accounts SET failed_attempts=0,locked_until=NULL,last_login_at=NOW(6) WHERE id=?')->execute([$admin['id']]);
cssv_admin_revoke_session($pdo);
cssv_admin_issue_session($pdo, (string)$admin['id']);
$secret = $admin['totp_enabled_at'] === null ? cssv_admin_decrypt((string)$admin['totp_secret_cipher']) : null;
cssv_json(['ok' => true, 'stage' => $secret ? 'totp_setup' : 'totp_challenge', 'secret' => $secret]);
