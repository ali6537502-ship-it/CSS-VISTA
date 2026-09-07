<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');
$pdo = cssv_db();
$body = cssv_request_json(8192);
$email = cssv_normalize_email($body['email'] ?? '');
cssv_enforce_rate_limit($pdo, 'reset-request', $email, 4, 3600);
cssv_log_security_event($pdo, 'reset-request', null, $email);

$stmt = $pdo->prepare('SELECT id,email FROM users WHERE email=? AND disabled_at IS NULL LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if ($user) {
    $token = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    $id = cssv_uuid_v4();
    $expiresAt = gmdate('Y-m-d H:i:s', time() + 1800);
    $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id=? AND used_at IS NULL')->execute([(string)$user['id']]);
    $insert = $pdo->prepare('INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)');
    $insert->execute([$id, (string)$user['id'], cssv_hash_secret($token), $expiresAt]);

    $base = rtrim((string)cssv_env('CSSV_PASSWORD_RESET_URL', 'https://www.css-vista.com/account/reset-password'), '?&');
    $link = $base . (str_contains($base, '?') ? '&' : '?') . 'token=' . rawurlencode($token);
    $message = "A password reset was requested for your CSS Vista account.\n\nReset your password:\n" . $link . "\n\nThis link expires in 30 minutes and can be used once. If you did not request this, ignore this email.";
    if (!cssv_send_mail((string)$user['email'], 'Reset your CSS Vista password', $message)) {
        error_log('CSSV password reset mail failed for user ' . $user['id']);
    }
}

cssv_json(['ok' => true, 'message' => 'If an account exists for that email, a reset link will be sent.']);
