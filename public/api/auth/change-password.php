<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); $session=cssv_require_user($pdo, false); cssv_require_csrf($session);
$body=cssv_request_json(16384); $password=account_password($body['password']??null);
$current=$body['current_password']??'';
cssv_enforce_rate_limit($pdo,'password-change-failed',$session['email'],8,900);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT password_hash FROM users WHERE id=? AND disabled_at IS NULL FOR UPDATE'); $query->execute([$session['user_id']]); $hash=$query->fetchColumn();
    if (!is_string($current)||strlen($current)>1024||str_contains($current,"\0")||!is_string($hash)||!password_verify($current,$hash)) {
        $pdo->rollBack(); cssv_log_security_event($pdo,'password-change-failed',$session['user_id'],$session['email']); cssv_fail('Your current password is incorrect.',422,'invalid_current_password');
    }
    $pdo->prepare("UPDATE users SET password_hash=?,auth_source='local' WHERE id=?")->execute([account_hash_password($password),$session['user_id']]);
    $pdo->prepare('UPDATE password_reset_tokens SET used_at=NOW(6) WHERE user_id=? AND used_at IS NULL')->execute([$session['user_id']]);
    $pdo->prepare('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE user_id=?')->execute([$session['user_id']]);
    $pdo->commit(); cssv_issue_session($pdo,$session['user_id']);
    cssv_log_security_event($pdo,'password-change-success',$session['user_id']);
    cssv_json(['ok'=>true]);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); account_log_failure($error,'password change'); }
