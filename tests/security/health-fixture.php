<?php
declare(strict_types=1);
if (getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') {
    throw new RuntimeException('Disposable CI database required.');
}
require_once dirname(__DIR__, 2) . '/public/api/_bootstrap_core.php';
require_once dirname(__DIR__, 2) . '/public/api/_admin_auth.php';
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$id = cssv_uuid_v4();
$pdo->prepare('INSERT INTO admin_accounts(id,email,password_hash,totp_secret_cipher,totp_enabled_at) VALUES(?,?,?,?,NOW(6))')
    ->execute([$id, 'health-test-' . $id . '@example.invalid', password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT), 'test-only-unused']);
$sessions = [];
foreach (['pending', 'verified', 'expired', 'revoked'] as $state) {
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('INSERT INTO admin_sessions(id,admin_id,token_hash,csrf_hash,mfa_verified_at,expires_at,revoked_at) VALUES(?,?,?,?,?,?,?)')
        ->execute([cssv_uuid_v4(), $id, cssv_hash_secret($token), cssv_hash_secret(bin2hex(random_bytes(32))), $state === 'pending' ? null : gmdate('Y-m-d H:i:s'), gmdate('Y-m-d H:i:s', time() + ($state === 'expired' ? -3600 : 3600)), $state === 'revoked' ? gmdate('Y-m-d H:i:s') : null]);
    $sessions[$state] = $token;
}
$userId = cssv_uuid_v4();
$pdo->prepare("INSERT INTO users(id,email,password_hash,auth_source,email_verified_at,created_at) VALUES(?,?,?,'local',NOW(6),NOW(6))")
    ->execute([$userId, 'health-student-' . $userId . '@example.invalid', password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT)]);
$pdo->prepare('INSERT INTO student_profiles(user_id,display_name) VALUES(?,?)')->execute([$userId, 'Test only']);
// Return a separate student token without ever granting that user an admin role.
$studentToken = bin2hex(random_bytes(32));
$pdo->prepare('INSERT INTO auth_sessions(id,user_id,token_hash,csrf_hash,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(6),INTERVAL 1 HOUR))')
    ->execute([cssv_uuid_v4(), $userId, cssv_hash_secret($studentToken), cssv_hash_secret(bin2hex(random_bytes(32)))]);
echo json_encode(['admin_cookie' => CSSV_ADMIN_SESSION_COOKIE, 'sessions' => $sessions, 'student' => $studentToken], JSON_THROW_ON_ERROR);
