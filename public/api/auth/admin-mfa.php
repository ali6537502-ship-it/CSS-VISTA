<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');

const CSSV_SOLE_OWNER_EMAIL_SHA256 = '55af0a4424841b6a49060e86cda107340025814fd5913c4db67c0bc049baaf97';

$pdo = cssv_db();
cssv_enforce_rate_limit($pdo, 'admin-mfa', null, 15, 900);
$body = cssv_request_json(16384);
$accessToken = trim((string)($body['access_token'] ?? ''));
if ($accessToken === '' || strlen($accessToken) > 8192) {
    cssv_fail('The owner session is invalid.', 401, 'invalid_owner_session');
}

$parts = explode('.', $accessToken);
if (count($parts) !== 3) {
    cssv_fail('The owner session is invalid.', 401, 'invalid_owner_session');
}
$jwtPayloadRaw = base64_decode(strtr($parts[1], '-_', '+/'), true);
$jwtPayload = is_string($jwtPayloadRaw) ? json_decode($jwtPayloadRaw, true) : null;
if (!is_array($jwtPayload) || !hash_equals('aal2', (string)($jwtPayload['aal'] ?? ''))) {
    cssv_fail('Complete two-factor verification to continue.', 403, 'admin_mfa_required');
}

$baseUrl = rtrim((string)cssv_env('CSSV_SUPABASE_URL', ''), '/');
$publishableKey = trim((string)cssv_env('CSSV_SUPABASE_PUBLISHABLE_KEY', ''));
if ($baseUrl === '' || $publishableKey === '' || !function_exists('curl_init')) {
    cssv_fail('Owner verification is temporarily unavailable.', 503, 'owner_verification_unavailable');
}
$curl = curl_init($baseUrl . '/auth/v1/user');
if ($curl === false) {
    cssv_fail('The owner session could not be verified.', 503, 'owner_verification_failed');
}
curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'apikey: ' . $publishableKey,
        'Authorization: Bearer ' . $accessToken,
    ],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 15,
]);
$response = curl_exec($curl);
$status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
if (!is_string($response) || $status !== 200) {
    cssv_fail('The owner session is invalid or expired.', 401, 'invalid_owner_session');
}
$verified = json_decode($response, true);
if (!is_array($verified) || empty($verified['id']) || empty($verified['email'])) {
    cssv_fail('The owner identity could not be verified.', 401, 'invalid_owner_identity');
}
$userId = strtolower(trim((string)$verified['id']));
$email = cssv_normalize_email($verified['email']);
if (!hash_equals(CSSV_SOLE_OWNER_EMAIL_SHA256, hash('sha256', $email))) {
    cssv_log_security_event($pdo, 'admin-mfa-denied', $userId, $email);
    cssv_fail('This account is not the owner account.', 403, 'owner_account_required');
}

$stmt = $pdo->prepare('SELECT id,disabled_at FROM users WHERE id=? AND email=? LIMIT 1');
$stmt->execute([$userId, $email]);
$user = $stmt->fetch();
if (!$user || $user['disabled_at'] !== null) {
    cssv_fail('The owner account is not available in the migrated database.', 403, 'owner_account_unavailable');
}
$session = cssv_current_session($pdo);
if (!$session || !hash_equals($userId, (string)$session['user_id'])) {
    cssv_fail('Refresh the owner login before completing verification.', 401, 'owner_session_refresh_required');
}

$pdo->beginTransaction();
try {
    $pdo->exec('DELETE FROM admin_users');
    $insert = $pdo->prepare('INSERT INTO admin_users (user_id,created_at,created_by) VALUES (?,NOW(6),?)');
    $insert->execute([$userId, $userId]);
    $pdo->commit();
} catch (Throwable $error) {
    $pdo->rollBack();
    error_log('CSSV sole-owner assignment failed: ' . $error->getMessage());
    cssv_fail('Owner access could not be assigned.', 503, 'owner_assignment_failed');
}

cssv_issue_admin_mfa($session);
cssv_log_security_event($pdo, 'admin-mfa-success', $userId, $email);
cssv_json(['ok' => true, 'owner' => true, 'mfa' => 'verified']);
