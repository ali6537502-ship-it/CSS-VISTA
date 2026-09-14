<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
function account_auth_schema(PDO $pdo): void {
    static $ready = false;
    if ($ready) return;
    $pdo->exec("CREATE TABLE IF NOT EXISTS account_verification_tokens (
        id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME(6) NOT NULL, used_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY account_verification_user_idx(user_id,created_at),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS account_mail_outbox (
        id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, purpose VARCHAR(24) NOT NULL,
        message_cipher MEDIUMTEXT NULL, status VARCHAR(24) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0, next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        expires_at DATETIME(6) NOT NULL, accepted_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY account_mail_queue_idx(status,next_attempt_at),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS account_reset_codes (
    user_id CHAR(36) PRIMARY KEY, code_hash CHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0, expires_at DATETIME(6) NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready = true;
}
function account_require_json_origin(): void {
    $origin = rtrim((string)($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    $allowed = rtrim((string)cssv_env('CSSV_SITE_ORIGIN', 'https://www.css-vista.com'), '/');
    if ($origin !== '' && !hash_equals($allowed, $origin)) cssv_fail('This request must come from CSS Vista.', 403, 'invalid_origin');
    if (!preg_match('~^application/json(?:\s*;|$)~i', (string)($_SERVER['CONTENT_TYPE'] ?? ''))) cssv_fail('A JSON request is required.', 415, 'invalid_content_type');
}
function account_require_mail_transport(): void {
    if (!cssv_mail_transport_status()['ready']) {
        cssv_fail('Account email is temporarily unavailable. The website administrator has been notified.',503,'email_service_unavailable');
    }
}
function account_password(mixed $value): string {
    if (!is_string($value) || strlen($value)<8 || strlen($value)>72 || str_contains($value,"\0")) cssv_fail('Use a password between 8 and 72 bytes long.',422,'invalid_password');
    return $value;
}
function account_hash_password(string $password): string {
    return password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT);
}
function account_user(PDO $pdo, string $id): array {
    require_once __DIR__ . '/_profile.php';
    $profileStatus=cssv_profile_status(cssv_profile_for_user($pdo, $id));
    $query=$pdo->prepare('SELECT u.id,u.email,u.created_at,u.email_verified_at,p.display_name,p.profile_completed_at,p.profile_photo_path FROM users u LEFT JOIN student_profiles p ON p.user_id=u.id WHERE u.id=?');
    $query->execute([$id]); $row=$query->fetch();
    if (!$row) cssv_fail('Sign in again to continue.',401,'authentication_required');
    return ['id'=>$row['id'],'email'=>$row['email'],'created_at'=>$row['created_at'],
        'email_confirmed_at'=>$row['email_verified_at'],'display_name'=>(string)($row['display_name']??''),
        'user_metadata'=>['full_name'=>(string)($row['display_name']??'')],
        'profile_complete'=>$profileStatus['complete'],'profile_completion'=>$profileStatus,'photo_complete'=>!empty($row['profile_photo_path'])];
}
function account_encrypt_mail(array $message): string {
    $iv=random_bytes(12); $tag='';
    $cipher=openssl_encrypt(json_encode($message,JSON_THROW_ON_ERROR),'aes-256-gcm',hash('sha256',cssv_secret(),true),OPENSSL_RAW_DATA,$iv,$tag,'cssvista-account-mail-v1');
    if (!is_string($cipher)) throw new RuntimeException('mail_encryption_failed');
    return base64_encode($iv.$tag.$cipher);
}
function account_decrypt_mail(string $encoded): ?array {
    $data=base64_decode($encoded,true);
    if (!is_string($data)||strlen($data)<29) return null;
    $plain=openssl_decrypt(substr($data,28),'aes-256-gcm',hash('sha256',cssv_secret(),true),OPENSSL_RAW_DATA,substr($data,0,12),substr($data,12,16),'cssvista-account-mail-v1');
    $value=is_string($plain)?json_decode($plain,true):null;
    return is_array($value)?$value:null;
}
function account_queue_link(PDO $pdo, array $user, string $purpose): void {
    $verification=$purpose==='verify';
    $table=$verification?'account_verification_tokens':'password_reset_tokens';
    $token=rtrim(strtr(base64_encode(random_bytes(48)),'+/','-_'),'=');
    $expires=gmdate('Y-m-d H:i:s',time()+($verification?86400:1800));
    $pdo->prepare('UPDATE '.$table.' SET used_at=NOW(6) WHERE user_id=? AND used_at IS NULL')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO '.$table.'(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)')->execute([cssv_uuid_v4(),$user['id'],cssv_hash_secret($token),$expires]);
    $pdo->prepare("UPDATE account_mail_outbox SET status='cancelled',message_cipher=NULL WHERE user_id=? AND purpose=? AND status IN ('pending','failed')")->execute([$user['id'],$purpose]);
    $base=rtrim((string)cssv_env('CSSV_SITE_ORIGIN','https://www.css-vista.com'),'/');
    $link=$base.'/account?'.($verification?'verify=1':'reset=1').'#token='.rawurlencode($token);
    $code = $verification ? null : str_pad((string)random_int(0,999999),6,'0',STR_PAD_LEFT);
    if ($code !== null) $pdo->prepare('INSERT INTO account_reset_codes(user_id,code_hash,attempts,expires_at) VALUES(?,?,0,DATE_ADD(NOW(6),INTERVAL 10 MINUTE)) ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),attempts=0,expires_at=VALUES(expires_at)')->execute([$user['id'],cssv_hash_secret($user['id'].':'.$code)]);
    $subject=$verification?'Confirm your free CSS Vista account':'Reset your CSS Vista password';
    $text=$verification?"Confirm your email to start using your free CSS Vista account:\n\n":"A password reset was requested for your CSS Vista account. Choose a new password here:\n\n";
    if ($code !== null) $text.="Your password reset code: ".$code."\n\nEnter this code with your email at ".$base."/account?recovery=code\nThe code expires in 10 minutes and allows five attempts.\n\nOr use this reset link:\n";
    $text.=$link."\n\nThis link can be used once and expires in ".($verification?'24 hours':'30 minutes').". If you did not request this, you can ignore this email.\n\nCSS Vista";
    $pdo->prepare('INSERT INTO account_mail_outbox(id,user_id,purpose,message_cipher,expires_at) VALUES(?,?,?,?,?)')->execute([cssv_uuid_v4(),$user['id'],$purpose,account_encrypt_mail(['to'=>$user['email'],'subject'=>$subject,'text'=>$text]),$expires]);
}
function account_deliver_mail(PDO $pdo, int $limit=1): array {
    $result=['accepted'=>0,'failed'=>0,'transport_ready'=>cssv_mail_transport_status()['ready']];
    if (!$result['transport_ready']) return $result;
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-account-mail',0)")->fetchColumn()!==1) return $result;
    try {
        $pdo->exec("UPDATE account_mail_outbox SET status='expired',message_cipher=NULL WHERE expires_at<=NOW(6) AND message_cipher IS NOT NULL");
        $query=$pdo->prepare("SELECT id,message_cipher FROM account_mail_outbox WHERE status IN ('pending','failed') AND attempts<5 AND next_attempt_at<=NOW(6) AND expires_at>NOW(6) ORDER BY created_at LIMIT ?");
        $query->bindValue(1,max(1,min(10,$limit)),PDO::PARAM_INT); $query->execute();
        foreach ($query->fetchAll() as $row) {
            $message=account_decrypt_mail((string)$row['message_cipher']);
            $accepted=$message && cssv_send_mail($message['to'],$message['subject'],$message['text']);
            $pdo->prepare("UPDATE account_mail_outbox SET attempts=attempts+1,status=?,accepted_at=?,message_cipher=IF(?,NULL,message_cipher),next_attempt_at=DATE_ADD(NOW(6),INTERVAL 2 MINUTE) WHERE id=?")
                ->execute([$accepted?'accepted':'failed',$accepted?gmdate('Y-m-d H:i:s'):null,$accepted?1:0,$row['id']]);
            $result[$accepted?'accepted':'failed']++;
            if (!$accepted) error_log('CSSV account email was not accepted by the Hostinger mail transport.');
        }
    } finally { $pdo->query("SELECT RELEASE_LOCK('cssvista-account-mail')"); }
    return $result;
}
function account_log_failure(Throwable $error, string $event): never {
    error_log('CSSV account '.$event.' failed: '.get_class($error).' '.(string)$error->getCode());
    cssv_fail('The account service is temporarily unavailable. Please try again shortly.',503,'account_temporarily_unavailable');
}
