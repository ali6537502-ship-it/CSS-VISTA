<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); $body=cssv_request_json(16384);
$token=(string)($body['token']??''); $password=account_password($body['password']??null);
if (!preg_match('/^[A-Za-z0-9_-]{64}$/',$token)) cssv_fail('Reset link is invalid or expired.',400,'invalid_reset_token');
cssv_enforce_rate_limit($pdo,'reset-failed',null,10,900);
$hash=account_hash_password($password);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT t.id,t.user_id FROM password_reset_tokens t JOIN users u ON u.id=t.user_id WHERE token_hash=? AND t.used_at IS NULL AND t.expires_at>NOW(6) AND u.disabled_at IS NULL FOR UPDATE'); $query->execute([cssv_hash_secret($token)]); $reset=$query->fetch();
    if (!$reset) { $pdo->rollBack(); cssv_log_security_event($pdo,'reset-failed'); cssv_fail('Reset link is invalid or expired.',400,'invalid_reset_token'); }
    $pdo->prepare("UPDATE users SET password_hash=?,auth_source='local',auth_migrated_at=NOW(6),email_verified_at=COALESCE(email_verified_at,NOW(6)) WHERE id=?")->execute([$hash,$reset['user_id']]);
    $pdo->prepare('UPDATE password_reset_tokens SET used_at=NOW(6) WHERE user_id=? AND used_at IS NULL')->execute([$reset['user_id']]);
    $pdo->prepare('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE user_id=?')->execute([$reset['user_id']]);
    $pdo->commit(); cssv_revoke_current_session($pdo);
    cssv_log_security_event($pdo,'reset-success',$reset['user_id']);
    cssv_json(['ok'=>true,'message'=>'Password updated. Sign in with your new password.']);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); account_log_failure($error,'password reset'); }
