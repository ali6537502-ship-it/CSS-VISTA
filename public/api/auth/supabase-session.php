<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');

$pdo = cssv_db();
cssv_enforce_rate_limit($pdo, 'session-exchange', null, 30, 900);
$body = cssv_request_json(16384);
$accessToken = trim((string)($body['access_token'] ?? ''));
if ($accessToken === '' || strlen($accessToken) > 8192) {
    cssv_fail('The account session is invalid.', 401, 'invalid_supabase_session');
}

$baseUrl = rtrim((string)cssv_env('CSSV_SUPABASE_URL', ''), '/');
$publishableKey = trim((string)cssv_env('CSSV_SUPABASE_PUBLISHABLE_KEY', ''));
if ($baseUrl === '' || $publishableKey === '') {
    cssv_fail('The temporary account bridge is unavailable.', 503, 'account_bridge_unavailable');
}

$curl = curl_init($baseUrl . '/auth/v1/user');
if ($curl === false) {
    cssv_fail('The account session could not be verified.', 503, 'session_verification_failed');
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
$curlError = curl_error($curl);
curl_close($curl);
if (!is_string($response) || $status !== 200) {
    if ($curlError !== '') error_log('CSSV Supabase session exchange failed: ' . $curlError);
    cssv_fail('The account session is invalid or expired.', 401, 'invalid_supabase_session');
}

$legacy = json_decode($response, true);
if (!is_array($legacy) || empty($legacy['id']) || empty($legacy['email'])) {
    cssv_fail('The account session could not be verified.', 401, 'invalid_supabase_session');
}
$userId = strtolower(trim((string)$legacy['id']));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $userId)) {
    cssv_fail('The account identity is invalid.', 401, 'invalid_account_identity');
}
$email = cssv_normalize_email($legacy['email']);
$stmt = $pdo->prepare('SELECT id,disabled_at FROM users WHERE email=? OR id=? LIMIT 1');
$stmt->execute([$email, $userId]);
$existing = $stmt->fetch();
if ($existing && !hash_equals((string)$existing['id'], $userId)) {
    cssv_log_security_event($pdo, 'session-exchange-id-mismatch', (string)$existing['id'], $email);
    cssv_fail('Account migration verification failed.', 409, 'migration_identity_mismatch');
}
if ($existing && $existing['disabled_at'] !== null) {
    cssv_fail('This account is currently unavailable.', 403, 'account_disabled');
}

$createdAt = cssv_parse_timestamp((string)($legacy['created_at'] ?? '')) ?? gmdate('Y-m-d H:i:s');
$verifiedAt = cssv_parse_timestamp((string)($legacy['email_confirmed_at'] ?? ''));
$metadata = json_encode($legacy['user_metadata'] ?? new stdClass(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (!is_string($metadata)) $metadata = '{}';

$pdo->beginTransaction();
try {
    if (!$existing) {
        $insert = $pdo->prepare("INSERT INTO users (id,email,auth_source,email_verified_at,last_sign_in_at,last_seen_at,raw_metadata,created_at) VALUES (?,?,'supabase',?,NOW(6),NOW(6),?,?)");
        $insert->execute([$userId, $email, $verifiedAt, $metadata, $createdAt]);
    } else {
        $pdo->prepare('UPDATE users SET email=?,email_verified_at=COALESCE(email_verified_at,?),last_sign_in_at=NOW(6),last_seen_at=NOW(6),raw_metadata=? WHERE id=?')
            ->execute([$email, $verifiedAt, $metadata, $userId]);
    }
    $displayName = trim((string)(($legacy['user_metadata']['full_name'] ?? '')));
    $pdo->prepare('INSERT IGNORE INTO student_profiles (user_id,display_name,created_at) VALUES (?,?,?)')
        ->execute([$userId, mb_substr($displayName, 0, 180), $createdAt]);
    $pdo->prepare('UPDATE student_profiles SET last_seen_at=NOW(6) WHERE user_id=?')->execute([$userId]);
    $pdo->commit();
} catch (Throwable $error) {
    $pdo->rollBack();
    error_log('CSSV session exchange transaction failed: ' . $error->getMessage());
    cssv_fail('The account session could not be connected.', 503, 'session_exchange_failed');
}

$session = cssv_issue_session($pdo, $userId);
cssv_log_security_event($pdo, 'session-exchange-success', $userId, $email);
cssv_json(['ok' => true, 'csrf_token' => $session['csrf_token']]);
