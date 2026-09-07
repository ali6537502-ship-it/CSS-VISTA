<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');

$pdo = cssv_db();
$body = cssv_request_json(16384);
$email = cssv_normalize_email($body['email'] ?? '');
$password = (string)($body['password'] ?? '');
if (strlen($password) < 8 || strlen($password) > 1024) {
    cssv_fail('Email or password is incorrect.', 401, 'invalid_credentials');
}

cssv_enforce_rate_limit($pdo, 'login-failed', $email, 8, 900);
$stmt = $pdo->prepare('SELECT id,email,password_hash,auth_source,disabled_at,created_at FROM users WHERE email=? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if ($user && $user['disabled_at'] !== null) {
    cssv_log_security_event($pdo, 'login-disabled', (string)$user['id'], $email);
    cssv_fail('This account is currently unavailable.', 403, 'account_disabled');
}

$verified = false;
$verifiedBySupabase = false;
if ($user && is_string($user['password_hash']) && $user['password_hash'] !== '') {
    $verified = password_verify($password, $user['password_hash']);
}

if (!$verified && (!$user || in_array((string)$user['auth_source'], ['supabase', 'dual'], true))) {
    $legacy = cssv_supabase_password_login($email, $password);
    if ($legacy) {
        $legacyId = (string)$legacy['id'];
        if ($user && !hash_equals((string)$user['id'], $legacyId)) {
            cssv_log_security_event($pdo, 'login-id-mismatch', (string)$user['id'], $email);
            cssv_fail('Account migration verification failed.', 409, 'migration_identity_mismatch');
        }
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        if (!is_string($newHash)) {
            cssv_fail('Could not secure the account password.', 503, 'password_hash_failed');
        }
        $createdAt = cssv_parse_timestamp((string)($legacy['created_at'] ?? '')) ?? gmdate('Y-m-d H:i:s');
        if (!$user) {
            $insert = $pdo->prepare('INSERT INTO users (id,email,password_hash,auth_source,auth_migrated_at,email_verified_at,last_sign_in_at,raw_metadata,created_at) VALUES (?,?,?,\'dual\',NOW(6),?,?,?,?)');
            $insert->execute([
                $legacyId,
                $email,
                $newHash,
                cssv_parse_timestamp((string)($legacy['email_confirmed_at'] ?? '')),
                gmdate('Y-m-d H:i:s'),
                json_encode($legacy['user_metadata'] ?? new stdClass(), JSON_UNESCAPED_SLASHES),
                $createdAt,
            ]);
            $pdo->prepare('INSERT IGNORE INTO student_profiles (user_id,display_name,created_at) VALUES (?,?,?)')->execute([
                $legacyId,
                trim((string)(($legacy['user_metadata']['full_name'] ?? ''))),
                $createdAt,
            ]);
            $user = ['id' => $legacyId, 'email' => $email, 'auth_source' => 'dual', 'disabled_at' => null, 'password_hash' => $newHash];
        } else {
            $update = $pdo->prepare('UPDATE users SET password_hash=?,auth_source=\'dual\',auth_migrated_at=NOW(6),last_sign_in_at=NOW(6) WHERE id=?');
            $update->execute([$newHash, $legacyId]);
        }
        $verified = true;
        $verifiedBySupabase = true;
    }
}

if (!$verified || !$user) {
    cssv_log_security_event($pdo, 'login-failed', $user ? (string)$user['id'] : null, $email);
    usleep(random_int(150000, 350000));
    cssv_fail('Email or password is incorrect.', 401, 'invalid_credentials');
}

$pdo->prepare('UPDATE users SET last_sign_in_at=NOW(6),last_seen_at=NOW(6) WHERE id=?')->execute([(string)$user['id']]);
$pdo->prepare('UPDATE student_profiles SET last_seen_at=NOW(6) WHERE user_id=?')->execute([(string)$user['id']]);
$session = cssv_issue_session($pdo, (string)$user['id']);
cssv_log_security_event($pdo, $verifiedBySupabase ? 'login-bridged' : 'login-success', (string)$user['id'], $email);

$profileStmt = $pdo->prepare('SELECT display_name,profile_photo_path,profile_completed_at FROM student_profiles WHERE user_id=?');
$profileStmt->execute([(string)$user['id']]);
$profile = $profileStmt->fetch() ?: [];

cssv_json([
    'ok' => true,
    'user' => [
        'id' => (string)$user['id'],
        'email' => $email,
        'display_name' => (string)($profile['display_name'] ?? ''),
        'profile_complete' => !empty($profile['profile_completed_at']),
        'photo_complete' => !empty($profile['profile_photo_path']),
    ],
    'csrf_token' => $session['csrf_token'],
]);
