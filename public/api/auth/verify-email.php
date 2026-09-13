<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); account_auth_schema($pdo); $body=cssv_request_json(8192);
$token=(string)($body['token']??'');
if (!preg_match('/^[A-Za-z0-9_-]{64}$/',$token)) cssv_fail('This confirmation link is invalid or expired.',400,'invalid_verification_token');
cssv_enforce_rate_limit($pdo,'verification-failed',null,12,900);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT t.id,t.user_id FROM account_verification_tokens t JOIN users u ON u.id=t.user_id WHERE token_hash=? AND t.used_at IS NULL AND t.expires_at>NOW(6) AND u.disabled_at IS NULL FOR UPDATE'); $query->execute([cssv_hash_secret($token)]); $record=$query->fetch();
    if (!$record) { $pdo->rollBack(); cssv_log_security_event($pdo,'verification-failed'); cssv_fail('This confirmation link is invalid or expired.',400,'invalid_verification_token'); }
    $pdo->prepare('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW(6)) WHERE id=?')->execute([$record['user_id']]);
    $pdo->prepare('UPDATE account_verification_tokens SET used_at=NOW(6) WHERE user_id=? AND used_at IS NULL')->execute([$record['user_id']]);
    $pdo->commit();
    cssv_json(['ok'=>true,'message'=>'Your email is confirmed. You can now sign in.']);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); account_log_failure($error,'email confirmation'); }
