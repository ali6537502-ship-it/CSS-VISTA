<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('GET');
$pdo = cssv_db();
$session = cssv_current_session($pdo);
if (!$session) {
    cssv_json(['ok' => true, 'authenticated' => false]);
}
$profileStmt = $pdo->prepare('SELECT display_name,profile_photo_path,profile_completed_at FROM student_profiles WHERE user_id=?');
$profileStmt->execute([(string)$session['user_id']]);
$profile = $profileStmt->fetch() ?: [];
cssv_json([
    'ok' => true,
    'authenticated' => true,
    'user' => [
        'id' => (string)$session['user_id'],
        'email' => (string)$session['email'],
        'display_name' => (string)($profile['display_name'] ?? ''),
        'is_admin' => cssv_is_admin($pdo, (string)$session['user_id']),
        'profile_complete' => !empty($profile['profile_completed_at']),
        'photo_complete' => !empty($profile['profile_photo_path']),
    ],
]);
