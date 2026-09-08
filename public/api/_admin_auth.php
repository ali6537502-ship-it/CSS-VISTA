<?php
declare(strict_types=1);

const CSSV_ADMIN_SESSION_COOKIE = 'cssv_owner_session';
const CSSV_ADMIN_CSRF_COOKIE = 'cssv_owner_csrf';
const CSSV_OWNER_EMAIL = 'alihassansargana1@gmail.com';

function cssv_admin_ensure_schema(PDO $pdo): void
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_accounts (
            id CHAR(36) NOT NULL PRIMARY KEY,
            email VARCHAR(320) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            totp_secret_cipher TEXT NOT NULL,
            totp_enabled_at DATETIME(6) NULL,
            disabled_at DATETIME(6) NULL,
            failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
            locked_until DATETIME(6) NULL,
            last_login_at DATETIME(6) NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_email_codes (
            id CHAR(36) NOT NULL PRIMARY KEY,
            email VARCHAR(320) NOT NULL,
            purpose VARCHAR(20) NOT NULL,
            code_hash CHAR(64) NOT NULL,
            attempts INT UNSIGNED NOT NULL DEFAULT 0,
            expires_at DATETIME(6) NOT NULL,
            used_at DATETIME(6) NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            INDEX idx_admin_codes_lookup (email, purpose, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_sessions (
            id CHAR(36) NOT NULL PRIMARY KEY,
            admin_id CHAR(36) NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            csrf_hash CHAR(64) NOT NULL,
            user_agent_hash CHAR(64) NULL,
            ip_prefix_hash CHAR(64) NULL,
            mfa_verified_at DATETIME(6) NULL,
            expires_at DATETIME(6) NOT NULL,
            revoked_at DATETIME(6) NULL,
            last_used_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            INDEX idx_admin_sessions_admin (admin_id),
            INDEX idx_admin_sessions_expiry (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $error) {
        error_log('CSSV admin schema setup failed: ' . $error->getMessage());
        cssv_fail('The private admin system is temporarily unavailable.', 503, 'admin_unavailable');
    }
}

function cssv_is_owner_email(string $email): bool
{
    return hash_equals(CSSV_OWNER_EMAIL, strtolower(trim($email)));
}

function cssv_admin_encrypt(string $plain): string
{
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', hash('sha256', cssv_secret(), true), OPENSSL_RAW_DATA, $iv, $tag);
    if (!is_string($cipher)) {
        cssv_fail('Could not protect the two-factor key.', 503, 'encryption_failed');
    }
    return base64_encode($iv . $tag . $cipher);
}

function cssv_admin_decrypt(string $encoded): string
{
    $raw = base64_decode($encoded, true);
    if (!is_string($raw) || strlen($raw) < 29) {
        cssv_fail('The two-factor key is unavailable.', 503, 'encryption_failed');
    }
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', hash('sha256', cssv_secret(), true), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    if (!is_string($plain)) {
        cssv_fail('The two-factor key is unavailable.', 503, 'encryption_failed');
    }
    return $plain;
}

function cssv_base32_encode(string $bytes): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split($bytes) as $byte) {
        $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 5) as $chunk) {
        $out .= $alphabet[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
    }
    return $out;
}

function cssv_base32_decode(string $value): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split(strtoupper(preg_replace('/[^A-Z2-7]/', '', $value) ?? '')) as $char) {
        $position = strpos($alphabet, $char);
        if ($position === false) return '';
        $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 8) as $chunk) {
        if (strlen($chunk) === 8) $out .= chr(bindec($chunk));
    }
    return $out;
}

function cssv_totp_valid(string $secret, string $code): bool
{
    if (!preg_match('/^\d{6}$/', $code)) return false;
    $key = cssv_base32_decode($secret);
    if ($key === '') return false;
    $counter = intdiv(time(), 30);
    for ($offset = -1; $offset <= 1; $offset++) {
        $moving = $counter + $offset;
        $binary = pack('N2', intdiv($moving, 4294967296), $moving % 4294967296);
        $hash = hash_hmac('sha1', $binary, $key, true);
        $index = ord($hash[19]) & 0x0f;
        $number = ((ord($hash[$index]) & 0x7f) << 24)
            | ((ord($hash[$index + 1]) & 0xff) << 16)
            | ((ord($hash[$index + 2]) & 0xff) << 8)
            | (ord($hash[$index + 3]) & 0xff);
        if (hash_equals(str_pad((string)($number % 1000000), 6, '0', STR_PAD_LEFT), $code)) return true;
    }
    return false;
}

function cssv_admin_issue_session(PDO $pdo, string $adminId): array
{
    $token = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    $csrf = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $id = cssv_uuid_v4();
    $expiresTs = time() + 15 * 60;
    $stmt = $pdo->prepare('INSERT INTO admin_sessions (id,admin_id,token_hash,csrf_hash,user_agent_hash,ip_prefix_hash,expires_at) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([$id, $adminId, cssv_hash_secret($token), cssv_hash_secret($csrf), cssv_user_agent_hash(), cssv_hash_secret(cssv_ip_prefix()), gmdate('Y-m-d H:i:s', $expiresTs)]);
    cssv_set_cookie(CSSV_ADMIN_SESSION_COOKIE, $token, $expiresTs, true);
    cssv_set_cookie(CSSV_ADMIN_CSRF_COOKIE, $csrf, $expiresTs, false);
    return ['session_id' => $id, 'csrf_token' => $csrf];
}

function cssv_admin_current_session(PDO $pdo, bool $requireMfa = false): ?array
{
    $token = (string)($_COOKIE[CSSV_ADMIN_SESSION_COOKIE] ?? '');
    if ($token === '' || strlen($token) > 256) return null;
    $stmt = $pdo->prepare('SELECT s.id session_id,s.admin_id,s.csrf_hash,s.mfa_verified_at,s.expires_at,s.revoked_at,a.email,a.disabled_at,a.totp_enabled_at,a.totp_secret_cipher FROM admin_sessions s JOIN admin_accounts a ON a.id=s.admin_id WHERE s.token_hash=? LIMIT 1');
    $stmt->execute([cssv_hash_secret($token)]);
    $row = $stmt->fetch();
    if (!$row || $row['revoked_at'] !== null || $row['disabled_at'] !== null || strtotime((string)$row['expires_at']) <= time()) return null;
    if ($requireMfa && $row['mfa_verified_at'] === null) return null;
    $touch = $pdo->prepare('UPDATE admin_sessions SET last_used_at=NOW(6) WHERE id=? AND last_used_at < DATE_SUB(NOW(6), INTERVAL 5 MINUTE)');
    $touch->execute([$row['session_id']]);
    return $row;
}

function cssv_require_separate_admin(PDO $pdo): array
{
    cssv_admin_ensure_schema($pdo);
    $session = cssv_admin_current_session($pdo, true);
    if (!$session) cssv_fail('Sign in through the private admin login and complete two-factor verification.', 401, 'admin_authentication_required');
    return $session;
}

function cssv_admin_mark_mfa(PDO $pdo, array $session): void
{
    $expiresTs = time() + 12 * 60 * 60;
    $stmt = $pdo->prepare('UPDATE admin_sessions SET mfa_verified_at=NOW(6),expires_at=? WHERE id=?');
    $stmt->execute([gmdate('Y-m-d H:i:s', $expiresTs), $session['session_id']]);
    $token = (string)($_COOKIE[CSSV_ADMIN_SESSION_COOKIE] ?? '');
    $csrf = (string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE] ?? '');
    cssv_set_cookie(CSSV_ADMIN_SESSION_COOKIE, $token, $expiresTs, true);
    cssv_set_cookie(CSSV_ADMIN_CSRF_COOKIE, $csrf, $expiresTs, false);
}

function cssv_admin_revoke_session(PDO $pdo): void
{
    $token = (string)($_COOKIE[CSSV_ADMIN_SESSION_COOKIE] ?? '');
    if ($token !== '') {
        $stmt = $pdo->prepare('UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE token_hash=?');
        $stmt->execute([cssv_hash_secret($token)]);
    }
    cssv_set_cookie(CSSV_ADMIN_SESSION_COOKIE, '', time() - 3600, true);
    cssv_set_cookie(CSSV_ADMIN_CSRF_COOKIE, '', time() - 3600, false);
}

function cssv_admin_create_code(PDO $pdo, string $email, string $purpose): void
{
    cssv_enforce_rate_limit($pdo, 'admin_code_request', $email, 5, 3600);
    cssv_log_security_event($pdo, 'admin_code_request', null, $email);
    $code = (string)random_int(100000, 999999);
    $pdo->prepare('UPDATE admin_email_codes SET used_at=NOW(6) WHERE email=? AND purpose=? AND used_at IS NULL')->execute([$email, $purpose]);
    $stmt = $pdo->prepare('INSERT INTO admin_email_codes (id,email,purpose,code_hash,expires_at) VALUES (?,?,?,?,?)');
    $stmt->execute([cssv_uuid_v4(), $email, $purpose, cssv_hash_secret($purpose . ':' . $code), gmdate('Y-m-d H:i:s', time() + 15 * 60)]);
    $subject = $purpose === 'setup' ? 'CSS Vista private admin setup code' : 'CSS Vista admin password reset code';
    $body = "Your CSS Vista private admin verification code is: {$code}\n\nIt expires in 15 minutes. Do not share this code with anyone.\n\nThis message was generated by the CSS Vista website server.";
    if (!cssv_send_mail($email, $subject, $body)) {
        $pdo->prepare('UPDATE admin_email_codes SET used_at=NOW(6) WHERE email=? AND purpose=? AND used_at IS NULL')->execute([$email, $purpose]);
        cssv_fail('The website server could not send the email. Please check the Hostinger email/SMTP configuration.', 503, 'email_unavailable');
    }
}

function cssv_admin_consume_code(PDO $pdo, string $email, string $purpose, string $code): void
{
    if (!preg_match('/^\d{6}$/', $code)) cssv_fail('Enter the six-digit email code.', 422, 'invalid_code');
    $stmt = $pdo->prepare('SELECT id,code_hash,attempts,expires_at FROM admin_email_codes WHERE email=? AND purpose=? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$email, $purpose]);
    $row = $stmt->fetch();
    if (!$row || strtotime((string)$row['expires_at']) <= time() || (int)$row['attempts'] >= 6 || !hash_equals((string)$row['code_hash'], cssv_hash_secret($purpose . ':' . $code))) {
        if ($row) $pdo->prepare('UPDATE admin_email_codes SET attempts=attempts+1 WHERE id=?')->execute([$row['id']]);
        cssv_fail('The email code is incorrect or expired.', 422, 'invalid_code');
    }
    $pdo->prepare('UPDATE admin_email_codes SET used_at=NOW(6) WHERE id=?')->execute([$row['id']]);
}

function cssv_admin_validate_password(mixed $value): string
{
    $password = (string)$value;
    if (strlen($password) < 12 || strlen($password) > 200 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
        cssv_fail('Use at least 12 characters with letters and numbers.', 422, 'weak_password');
    }
    return $password;
}
