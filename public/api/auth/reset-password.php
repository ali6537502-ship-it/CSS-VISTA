<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');
$pdo = cssv_db();
$body = cssv_request_json(16384);
$token = trim((string)($body['token'] ?? ''));
$password = (string)($body['password'] ?? '');
if (strlen($token) < 32 || strlen($token) > 256) {
    cssv_fail('Reset link is invalid or expired.', 400, 'invalid_reset_token');
}
if (strlen($password) < 8 || strlen($password) > 1024) {
    cssv_fail('Password must contain at least 8 characters.', 422, 'password_too_short');
}
cssv_enforce_rate_limit($pdo, 'reset-failed', null, 10, 900);
$stmt = $pdo->prepare('SELECT id,user_id,expires_at,used_at FROM password_reset_tokens WHERE token_hash=? LIMIT 1');
$stmt->execute([cssv_hash_secret($token)]);
$reset = $stmt->fetch();
if (!$reset || $reset['used_at'] !== null || strtotime((string)$reset['expires_at']) <= time()) {
    cssv_log_security_event($pdo, 'reset-failed');
    cssv_fail('Reset link is invalid or expired.', 400, 'invalid_reset_token');
}
$hash = password_hash($password, PASSWORD_DEFAULT);
if (!is_string($hash)) {
    cssv_fail('Could not secure the new password.', 503, 'password_hash_failed');
}

$pdo->beginTransaction();
try {
    $pdo->prepare("UPDATE users SET password_hash=?,auth_source='local',auth_migrated_at=NOW(6) WHERE id=?")->execute([$hash, (string)$reset['user_id']]);
    $pdo->prepare('UPDATE password_reset_tokens SET used_at=NOW(6) WHERE id=? AND used_at IS NULL')->execute([(string)$reset['id']]);
    $pdo->prepare('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE user_id=?')->execute([(string)$reset['user_id']]);
    $pdo->commit();
} catch (Throwable $error) {
    $pdo->rollBack();
    error_log('CSSV password reset transaction failed: ' . $error->getMessage());
    cssv_fail('Could not reset the password right now.', 503, 'reset_failed');
}
cssv_log_security_event($pdo, 'reset-success', (string)$reset['user_id']);
cssv_json(['ok' => true, 'message' => 'Password updated. You can now sign in.']);
