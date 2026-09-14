<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); $body=cssv_request_json(16384);
$email=cssv_normalize_email($body['email']??'');
$password=$body['password']??'';
cssv_enforce_rate_limit($pdo,'login-failed',$email,8,900);
$query=$pdo->prepare('SELECT id,email,password_hash,disabled_at FROM users WHERE email=? LIMIT 1'); $query->execute([$email]); $user=$query->fetch();
$hash=$user['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
$valid=is_string($password)&&strlen($password)>=1&&strlen($password)<=1024&&!str_contains($password,"\0")&&password_verify($password,$hash);
if (!$valid||!$user||$user['disabled_at']!==null) {
    cssv_log_security_event($pdo,'login-failed',$user['id']??null,$email);
    cssv_fail('Email or password is incorrect.',401,'invalid_credentials');
}
if (strlen($password)<=72 && password_needs_rehash($hash,defined('PASSWORD_ARGON2ID')?PASSWORD_ARGON2ID:PASSWORD_BCRYPT)) $pdo->prepare("UPDATE users SET password_hash=?,auth_source='local' WHERE id=?")->execute([account_hash_password($password),$user['id']]);
cssv_revoke_current_session($pdo);
$session=cssv_issue_session($pdo,$user['id']);
$pdo->prepare('UPDATE users SET last_sign_in_at=NOW(6),last_seen_at=NOW(6) WHERE id=?')->execute([$user['id']]);
cssv_log_security_event($pdo,'login-success',$user['id'],$email);
cssv_json(['ok'=>true,'user'=>account_user($pdo,$user['id']),'csrf_token'=>$session['csrf_token']]);
