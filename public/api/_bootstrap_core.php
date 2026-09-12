<?php
declare(strict_types=1);

const CSSV_MAX_PROFILE_PHOTO_BYTES = 25600; // 25 KiB hard server limit.
const CSSV_MAX_PROFILE_PHOTO_PIXELS = 16000000;
const CSSV_SESSION_COOKIE = 'cssv_session';
const CSSV_CSRF_COOKIE = 'cssv_csrf';
const CSSV_ADMIN_MFA_COOKIE = 'cssv_admin_mfa';

$GLOBALS['CSSV_RUNTIME_CONFIG'] = [];
$documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
$defaultConfig = $documentRoot !== '' ? dirname($documentRoot) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php' : '';
$configPath = getenv('CSSV_CONFIG_FILE') ?: $defaultConfig;
if ($configPath && is_file($configPath)) {
    $loadedConfig = require $configPath;
    if (is_array($loadedConfig)) {
        $GLOBALS['CSSV_RUNTIME_CONFIG'] = $loadedConfig;
    }
}

function cssv_security_headers(): void
{
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
}

cssv_security_headers();

if (basename((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === '_bootstrap.php') {
    http_response_code(404);
    exit;
}

function cssv_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function cssv_fail(string $message, int $status = 400, string $code = 'request_failed'): never
{
    cssv_json(['ok' => false, 'error' => $code, 'message' => $message], $status);
}

function cssv_env(string $name, ?string $default = null): ?string
{
    $value = getenv($name);
    if ($value !== false && trim((string)$value) !== '') {
        return trim((string)$value);
    }
    $runtime = $GLOBALS['CSSV_RUNTIME_CONFIG'] ?? [];
    if (is_array($runtime) && array_key_exists($name, $runtime) && trim((string)$runtime[$name]) !== '') {
        return trim((string)$runtime[$name]);
    }
    return $default;
}

function cssv_require_method(string ...$allowed): void
{
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        cssv_fail('Method not allowed.', 405, 'method_not_allowed');
    }
}

function cssv_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = cssv_env('CSSV_DB_HOST');
    $name = cssv_env('CSSV_DB_NAME');
    $user = cssv_env('CSSV_DB_USER');
    $pass = cssv_env('CSSV_DB_PASSWORD');
    $port = cssv_env('CSSV_DB_PORT', '3306');

    if (!$host || !$name || !$user || $pass === null) {
        cssv_fail('Backend database is not configured yet.', 503, 'backend_not_configured');
    }

    try {
        $pdo = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name),
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]
        );
        $pdo->exec("SET time_zone = '+00:00'");
        return $pdo;
    } catch (Throwable $error) {
        error_log('CSSV database connection failed: ' . $error->getMessage());
        cssv_fail('Backend database is temporarily unavailable.', 503, 'database_unavailable');
    }
}

function cssv_uuid_v4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20, 12));
}

function cssv_request_json(int $maxBytes = 65536): array
{
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $maxBytes) {
        cssv_fail('Request is too large.', 413, 'request_too_large');
    }
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if (is_string($raw) && strlen($raw) > $maxBytes) cssv_fail('Request is too large.', 413, 'request_too_large');
    if ($raw === false || $raw === '') {
        return [];
    }
    try {
        $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        cssv_fail('Invalid JSON request.', 400, 'invalid_json');
    }
    if (!is_array($decoded) || !str_starts_with(ltrim($raw), '{')) {
        cssv_fail('Invalid request body.', 400, 'invalid_body');
    }
    return $decoded;
}

function cssv_normalize_email(mixed $value): string
{
    $email = strtolower(trim((string)$value));
    if ($email === '' || strlen($email) > 320 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        cssv_fail('Enter a valid email address.', 422, 'invalid_email');
    }
    return $email;
}

function cssv_secret(): string
{
    $secret = cssv_env('CSSV_APP_SECRET');
    if (!$secret || strlen($secret) < 32) {
        cssv_fail('Backend security key is not configured yet.', 503, 'backend_not_configured');
    }
    return $secret;
}

function cssv_hash_secret(string $value): string
{
    return hash_hmac('sha256', $value, cssv_secret());
}

function cssv_ip_prefix(): string
{
    $ip = trim((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $parts = explode('.', $ip);
        return sprintf('%s.%s.%s.0/24', $parts[0], $parts[1], $parts[2]);
    }
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $packed = inet_pton($ip);
        return $packed === false ? 'ipv6-unknown' : bin2hex(substr($packed, 0, 7)) . '/56';
    }
    return 'unknown';
}

function cssv_user_agent_hash(): ?string
{
    $ua = trim((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    return $ua === '' ? null : cssv_hash_secret(substr($ua, 0, 1000));
}

function cssv_log_security_event(PDO $pdo, string $eventType, ?string $userId = null, ?string $email = null): void
{
    try {
        $stmt = $pdo->prepare('INSERT INTO login_security_events (user_id,email_hash,ip_prefix_hash,event_type) VALUES (?,?,?,?)');
        $stmt->execute([
            $userId,
            $email ? cssv_hash_secret(strtolower($email)) : null,
            cssv_hash_secret(cssv_ip_prefix()),
            substr($eventType, 0, 40),
        ]);
    } catch (Throwable $error) {
        error_log('CSSV security event write failed: ' . $error->getMessage());
    }
}

function cssv_enforce_rate_limit(PDO $pdo, string $eventType, ?string $email, int $maxAttempts, int $windowSeconds): void
{
    $emailHash = $email ? cssv_hash_secret(strtolower($email)) : null;
    $ipHash = cssv_hash_secret(cssv_ip_prefix());
    $since = gmdate('Y-m-d H:i:s', time() - $windowSeconds);

    if ($emailHash !== null) {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_security_events WHERE event_type = ? AND occurred_at >= ? AND (email_hash = ? OR ip_prefix_hash = ?)');
        $stmt->execute([$eventType, $since, $emailHash, $ipHash]);
    } else {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_security_events WHERE event_type = ? AND occurred_at >= ? AND ip_prefix_hash = ?');
        $stmt->execute([$eventType, $since, $ipHash]);
    }

    if ((int)$stmt->fetchColumn() >= $maxAttempts) {
        cssv_fail('Too many attempts. Please try again later.', 429, 'rate_limited');
    }
}

function cssv_set_cookie(string $name, string $value, int $expires, bool $httpOnly): void
{
    setcookie($name, $value, [
        'expires' => $expires,
        'path' => '/',
        'secure' => true,
        'httponly' => $httpOnly,
        'samesite' => 'Lax',
    ]);
}

function cssv_issue_session(PDO $pdo, string $userId): array
{
    $sessionToken = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    $csrfToken = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $sessionId = cssv_uuid_v4();
    $expiresAt = gmdate('Y-m-d H:i:s', time() + 60 * 60 * 24 * 14);

    $stmt = $pdo->prepare('INSERT INTO auth_sessions (id,user_id,token_hash,csrf_hash,user_agent_hash,ip_prefix_hash,expires_at) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([
        $sessionId,
        $userId,
        cssv_hash_secret($sessionToken),
        cssv_hash_secret($csrfToken),
        cssv_user_agent_hash(),
        cssv_hash_secret(cssv_ip_prefix()),
        $expiresAt,
    ]);

    $expiresTs = time() + 60 * 60 * 24 * 14;
    cssv_set_cookie(CSSV_SESSION_COOKIE, $sessionToken, $expiresTs, true);
    cssv_set_cookie(CSSV_CSRF_COOKIE, $csrfToken, $expiresTs, false);

    return ['session_id' => $sessionId, 'csrf_token' => $csrfToken, 'expires_at' => $expiresAt];
}

function cssv_current_session(PDO $pdo): ?array
{
    $token = (string)($_COOKIE[CSSV_SESSION_COOKIE] ?? '');
    if ($token === '' || strlen($token) > 256) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT s.id session_id,s.user_id,s.csrf_hash,s.expires_at,s.revoked_at,u.email,u.disabled_at,u.auth_source,p.display_name '
        . 'FROM auth_sessions s JOIN users u ON u.id=s.user_id LEFT JOIN student_profiles p ON p.user_id=u.id '
        . 'WHERE s.token_hash=? LIMIT 1'
    );
    $stmt->execute([cssv_hash_secret($token)]);
    $row = $stmt->fetch();
    if (!$row || $row['revoked_at'] !== null || $row['disabled_at'] !== null || strtotime((string)$row['expires_at']) <= time()) {
        return null;
    }

    $uaHash = cssv_user_agent_hash();
    $stored = $pdo->prepare('SELECT user_agent_hash FROM auth_sessions WHERE id=?');
    $stored->execute([$row['session_id']]);
    $storedUa = $stored->fetchColumn();
    if ($storedUa && $uaHash && !hash_equals((string)$storedUa, $uaHash)) {
        return null;
    }

    $touch = $pdo->prepare('UPDATE auth_sessions SET last_used_at=NOW(6) WHERE id=? AND last_used_at < DATE_SUB(NOW(6), INTERVAL 5 MINUTE)');
    $touch->execute([$row['session_id']]);
    return $row;
}

function cssv_require_user(PDO $pdo): array
{
    $session = cssv_current_session($pdo);
    if (!$session) {
        cssv_fail('Sign in to continue.', 401, 'authentication_required');
    }
    $expected = (string)($_SERVER['HTTP_X_CSSV_USER'] ?? '');
    if ($expected !== '' && !hash_equals($session['user_id'], $expected)) cssv_fail('Your account changed. Please refresh this page.', 409, 'account_changed');
    return $session;
}

function cssv_is_admin(PDO $pdo, string $userId): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM admin_users WHERE user_id=? LIMIT 1');
    $stmt->execute([$userId]);
    return (bool)$stmt->fetchColumn();
}

function cssv_admin_mfa_payload(array $session): ?array
{
    $token = (string)($_COOKIE[CSSV_ADMIN_MFA_COOKIE] ?? '');
    if ($token === '' || strlen($token) > 1024 || !str_contains($token, '.')) {
        return null;
    }
    [$encoded, $signature] = explode('.', $token, 2);
    $expected = hash_hmac('sha256', $encoded, cssv_secret());
    if (!hash_equals($expected, $signature)) {
        return null;
    }
    $decoded = base64_decode(strtr($encoded, '-_', '+/'), true);
    $payload = is_string($decoded) ? json_decode($decoded, true) : null;
    if (!is_array($payload)
        || !isset($payload['sid'], $payload['uid'], $payload['exp'])
        || !hash_equals((string)$session['session_id'], (string)$payload['sid'])
        || !hash_equals((string)$session['user_id'], (string)$payload['uid'])
        || (int)$payload['exp'] <= time()) {
        return null;
    }
    return $payload;
}

function cssv_issue_admin_mfa(array $session): void
{
    $expires = time() + 60 * 60 * 12;
    $payload = json_encode([
        'sid' => (string)$session['session_id'],
        'uid' => (string)$session['user_id'],
        'exp' => $expires,
    ], JSON_UNESCAPED_SLASHES);
    if (!is_string($payload)) {
        cssv_fail('Could not establish owner verification.', 503, 'mfa_session_failed');
    }
    $encoded = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    $token = $encoded . '.' . hash_hmac('sha256', $encoded, cssv_secret());
    cssv_set_cookie(CSSV_ADMIN_MFA_COOKIE, $token, $expires, true);
}

function cssv_require_admin(PDO $pdo): array
{
    $session = cssv_require_user($pdo);
    if (!cssv_is_admin($pdo, (string)$session['user_id'])) {
        cssv_fail('Administrator access required.', 403, 'administrator_required');
    }
    if (!cssv_admin_mfa_payload($session)) {
        cssv_fail('Two-factor owner verification required.', 403, 'admin_mfa_required');
    }
    return $session;
}

function cssv_require_csrf(array $session): void
{
    $cookie = (string)($_COOKIE[CSSV_CSRF_COOKIE] ?? '');
    $header = trim((string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    if ($cookie === '' || $header === '' || !hash_equals($cookie, $header) || !hash_equals((string)$session['csrf_hash'], cssv_hash_secret($header))) {
        cssv_fail('Security token is missing or invalid.', 403, 'invalid_csrf');
    }
}

function cssv_revoke_current_session(PDO $pdo): void
{
    $token = (string)($_COOKIE[CSSV_SESSION_COOKIE] ?? '');
    if ($token !== '') {
        $stmt = $pdo->prepare('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE token_hash=?');
        $stmt->execute([cssv_hash_secret($token)]);
    }
    cssv_set_cookie(CSSV_SESSION_COOKIE, '', time() - 3600, true);
    cssv_set_cookie(CSSV_CSRF_COOKIE, '', time() - 3600, false);
    cssv_set_cookie(CSSV_ADMIN_MFA_COOKIE, '', time() - 3600, true);
}

function cssv_parse_timestamp(?string $value): ?string
{
    if (!$value) {
        return null;
    }
    try {
        return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
    } catch (Throwable) {
        return null;
    }
}


function cssv_private_storage_dir(string $child = ''): string
{
    $base = cssv_env('CSSV_PRIVATE_STORAGE_DIR');
    if (!$base) {
        cssv_fail('Private file storage is not configured yet.', 503, 'storage_not_configured');
    }
    $path = rtrim($base, DIRECTORY_SEPARATOR);
    if ($child !== '') {
        $path .= DIRECTORY_SEPARATOR . trim($child, '/\\');
    }
    if (!is_dir($path) && !mkdir($path, 0700, true) && !is_dir($path)) {
        cssv_fail('Private file storage is unavailable.', 503, 'storage_unavailable');
    }
    return $path;
}

function cssv_store_profile_photo(array $file, string $folder = 'student-photos'): array
{
    if (!isset($file['error'], $file['tmp_name'], $file['size']) || (int)$file['error'] !== UPLOAD_ERR_OK) {
        cssv_fail('Upload a valid profile photo.', 422, 'photo_required');
    }
    $size = (int)$file['size'];
    if ($size < 512 || $size > CSSV_MAX_PROFILE_PHOTO_BYTES) {
        cssv_fail('Profile photo must be 25 KB or smaller.', 422, 'photo_size_invalid');
    }
    $tmp = (string)$file['tmp_name'];
    if (!is_uploaded_file($tmp)) {
        cssv_fail('Invalid uploaded file.', 422, 'invalid_upload');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($tmp);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) {
        cssv_fail('Profile photo must be JPG, PNG, or WebP.', 422, 'photo_type_invalid');
    }

    $dimensions = @getimagesize($tmp);
    if (!is_array($dimensions) || !isset($dimensions[0], $dimensions[1])) {
        cssv_fail('The uploaded file is not a valid image.', 422, 'photo_decode_failed');
    }
    $width = (int)$dimensions[0];
    $height = (int)$dimensions[1];
    if ($width < 120 || $height < 120 || $width > 4000 || $height > 4000 || ($width * $height) > CSSV_MAX_PROFILE_PHOTO_PIXELS) {
        cssv_fail('Profile photo dimensions are not suitable.', 422, 'photo_dimensions_invalid');
    }

    $sha256 = hash_file('sha256', $tmp);
    if (!is_string($sha256)) {
        cssv_fail('Could not validate the uploaded image.', 422, 'photo_hash_failed');
    }
    $name = bin2hex(random_bytes(24)) . '.' . $extensions[$mime];
    $dir = cssv_private_storage_dir($folder);
    $destination = $dir . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($tmp, $destination)) {
        cssv_fail('Could not store the uploaded image.', 503, 'photo_storage_failed');
    }
    @chmod($destination, 0600);

    return [
        'path' => $folder . '/' . $name,
        'absolute_path' => $destination,
        'mime' => $mime,
        'bytes' => $size,
        'width' => $width,
        'height' => $height,
        'sha256' => $sha256,
    ];
}

function cssv_remove_private_file(?string $relativePath): void
{
    if (!$relativePath || str_contains($relativePath, '..')) {
        return;
    }
    $base = cssv_env('CSSV_PRIVATE_STORAGE_DIR');
    if (!$base) {
        return;
    }
    $absolute = rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath);
    if (is_file($absolute)) {
        @unlink($absolute);
    }
}

function cssv_smtp_read($stream, int $expected): bool
{
    $response = '';
    while (($line = fgets($stream, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') {
            break;
        }
    }
    return (int)substr($response, 0, 3) === $expected;
}

function cssv_smtp_command($stream, string $command, int $expected): bool
{
    fwrite($stream, $command . "\r\n");
    return cssv_smtp_read($stream, $expected);
}

function cssv_send_mail(string $to, string $subject, string $text): bool
{
    $from = cssv_env('CSSV_MAIL_FROM', 'noreply@css-vista.com');
    $fromName = cssv_env('CSSV_MAIL_FROM_NAME', 'CSS Vista');
    $host = cssv_env('CSSV_SMTP_HOST');
    $user = cssv_env('CSSV_SMTP_USER');
    $pass = cssv_env('CSSV_SMTP_PASSWORD');
    $port = (int)(cssv_env('CSSV_SMTP_PORT', '587') ?? '587');
    $encryption = strtolower((string)cssv_env('CSSV_SMTP_ENCRYPTION', 'tls'));

    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $to . $from . $fromName . $subject)) return false;
    if ($host && (!in_array($encryption, ['ssl', 'tls'], true) || !preg_match('/^[a-z0-9.-]+$/i', $host) || $port < 1 || $port > 65535)) return false;

    if (!$host || !$user || $pass === null) {
        $headers = [
            'From: ' . $fromName . ' <' . $from . '>',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        return function_exists('mail') && @mail($to, $subject, $text, implode("\r\n", $headers));
    }

    $remote = ($encryption === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $stream = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT);
    if (!is_resource($stream)) {
        error_log('CSSV SMTP connect failed: ' . $errno . ' ' . $errstr);
        return false;
    }
    stream_set_timeout($stream, 10);
    $ok = cssv_smtp_read($stream, 220)
        && cssv_smtp_command($stream, 'EHLO css-vista.com', 250);
    if ($ok && $encryption === 'tls') {
        $ok = cssv_smtp_command($stream, 'STARTTLS', 220)
            && stream_socket_enable_crypto($stream, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)
            && cssv_smtp_command($stream, 'EHLO css-vista.com', 250);
    }
    if ($ok) {
        $ok = cssv_smtp_command($stream, 'AUTH LOGIN', 334)
            && cssv_smtp_command($stream, base64_encode($user), 334)
            && cssv_smtp_command($stream, base64_encode($pass), 235)
            && cssv_smtp_command($stream, 'MAIL FROM:<' . $from . '>', 250)
            && cssv_smtp_command($stream, 'RCPT TO:<' . $to . '>', 250)
            && cssv_smtp_command($stream, 'DATA', 354);
    }
    if ($ok) {
        $safeSubject = str_replace(["\r", "\n"], '', $subject);
        $safeFromName = str_replace(["\r", "\n"], '', (string)$fromName);
        $body = preg_replace('/^\./m', '..', str_replace(["\r\n", "\r"], "\n", $text));
        $headers = [
            'From: ' . $safeFromName . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . $safeSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        fwrite($stream, implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n", "\r\n", $body) . "\r\n.\r\n");
        $ok = cssv_smtp_read($stream, 250);
    }
    @cssv_smtp_command($stream, 'QUIT', 221);
    fclose($stream);
    return $ok;
}
