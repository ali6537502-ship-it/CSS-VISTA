<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); account_auth_schema($pdo); $body=cssv_request_json(16384);
$token=(string)($body['token']??''); $password=account_password($body['password']??null);
$usingCode = array_key_exists('code',$body);
$email = $usingCode ? cssv_normalize_email($body['email'] ?? '') : '';
$code = $body['code'] ?? '';
if ($usingCode && (!is_string($code) || !preg_match('/^[0-9]{6}$/',$code))) cssv_fail('Enter the six-digit code from your email.',400,'invalid_reset_code');
if (!$usingCode && !preg_match('/^[A-Za-z0-9_-]{64}$/',$token)) cssv_fail('Reset link is invalid or expired.',400,'invalid_reset_token');
cssv_enforce_rate_limit($pdo,'reset-failed',null,10,900);
$hash=account_hash_password($password);
try {
    $pdo->beginTransaction();
    if ($usingCode) {
        $query=$pdo->prepare('SELECT id FROM users WHERE email=? AND disabled_at IS NULL FOR UPDATE'); $query->execute([$email]); $id=$query->fetchColumn();
        $query=$pdo->prepare('SELECT * FROM account_reset_codes WHERE user_id=? FOR UPDATE'); $query->execute([$id ?: '']); $challenge=$query->fetch();
        $fingerprint=cssv_hash_secret('account-reset-code:'.$code);
        $valid=$challenge && (int)$challenge['attempts']<5 && strtotime($challenge['expires_at'].' UTC')>time()
            && hash_equals($challenge['code_hash'],cssv_hash_secret($id.':'.$code))
            && ($challenge['code_fingerprint']===null || hash_equals($challenge['code_fingerprint'],$fingerprint));
        if (!$valid) {
            if ($challenge) $pdo->prepare('UPDATE account_reset_codes SET attempts=LEAST(attempts+1,5) WHERE user_id=?')->execute([$id]);
            $pdo->commit(); cssv_log_security_event($pdo,'reset-failed'); cssv_fail('This code is invalid or expired. Request a new recovery email.',400,'invalid_reset_code');
        }
        $reset=['user_id'=>$id];
    } else {
        $query=$pdo->prepare('SELECT t.id,t.user_id FROM password_reset_tokens t JOIN users u ON u.id=t.user_id WHERE token_hash=? AND t.used_at IS NULL AND t.expires_at>NOW(6) AND u.disabled_at IS NULL FOR UPDATE'); $query->execute([cssv_hash_secret($token)]); $reset=$query->fetch();
        if (!$reset) { $pdo->rollBack(); cssv_log_security_event($pdo,'reset-failed'); cssv_fail('Reset link is invalid or expired.',400,'invalid_reset_token'); }
    }
    $pdo->prepare('DELETE FROM account_reset_codes WHERE user_id=?')->execute([$reset['user_id']]);
    $pdo->prepare("UPDATE users SET password_hash=?,auth_source='local',auth_migrated_at=NOW(6),email_verified_at=COALESCE(email_verified_at,NOW(6)) WHERE id=?")->execute([$hash,$reset['user_id']]);
    $pdo->prepare('UPDATE password_reset_tokens SET used_at=NOW(6) WHERE user_id=? AND used_at IS NULL')->execute([$reset['user_id']]);
    $pdo->prepare('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE user_id=?')->execute([$reset['user_id']]);
    $pdo->commit(); cssv_revoke_current_session($pdo);
    cssv_log_security_event($pdo,'reset-success',$reset['user_id']);
    cssv_json(['ok'=>true,'message'=>'Password updated. Sign in with your new password.']);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); account_log_failure($error,'password reset'); }
