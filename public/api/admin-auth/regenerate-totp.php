<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('POST');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$session = cssv_admin_current_session($pdo, false);
if (!$session) {
    cssv_fail('Start the private admin sign-in again.', 401, 'admin_authentication_required');
}
if ($session['totp_enabled_at'] !== null) {
    cssv_fail('Two-factor security is already active.', 409, 'totp_already_enabled');
}
$secret = cssv_base32_encode(random_bytes(20));
$stmt = $pdo->prepare('UPDATE admin_accounts SET totp_secret_cipher=? WHERE id=? AND totp_enabled_at IS NULL');
$stmt->execute([cssv_admin_encrypt($secret), (string)$session['admin_id']]);
cssv_json(['ok' => true, 'secret' => $secret]);
