<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('POST');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$session = cssv_admin_current_session($pdo, false);
if (!$session) cssv_fail('Start the admin sign-in again.', 401, 'admin_authentication_required');
$body = cssv_request_json();
$code = trim((string)($body['code'] ?? ''));
cssv_enforce_rate_limit($pdo, 'admin_totp_failed', (string)$session['email'], 10, 900);
if (!cssv_totp_valid(cssv_admin_decrypt((string)$session['totp_secret_cipher']), $code)) {
    cssv_log_security_event($pdo, 'admin_totp_failed', (string)$session['admin_id'], (string)$session['email']);
    cssv_fail('That authenticator code is incorrect. Wait for a new code and try again.', 422, 'invalid_totp');
}
if ($session['totp_enabled_at'] === null) $pdo->prepare('UPDATE admin_accounts SET totp_enabled_at=NOW(6) WHERE id=?')->execute([$session['admin_id']]);
cssv_admin_mark_mfa($pdo, $session);
cssv_json(['ok' => true, 'authenticated' => true, 'email' => $session['email']]);
