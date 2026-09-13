<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('GET');
$pdo = cssv_db();
$session = cssv_require_user($pdo, false);
$requested = trim((string)($_GET['user_id'] ?? $session['user_id']));
if ($requested !== (string)$session['user_id'] && !cssv_is_admin($pdo, (string)$session['user_id'])) {
    cssv_fail('You cannot view this photo.', 403, 'forbidden');
}
$stmt = $pdo->prepare('SELECT profile_photo_path,profile_photo_mime FROM student_profiles WHERE user_id=? LIMIT 1');
$stmt->execute([$requested]);
$row = $stmt->fetch();
if (!$row || !$row['profile_photo_path'] || str_contains((string)$row['profile_photo_path'], '..')) {
    cssv_fail('Photo not found.', 404, 'photo_not_found');
}
$base = cssv_env('CSSV_PRIVATE_STORAGE_DIR');
$path = $base ? rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string)$row['profile_photo_path']) : '';
if ($path === '' || !is_file($path)) {
    cssv_fail('Photo not found.', 404, 'photo_not_found');
}
header_remove('Content-Type');
header('Content-Type: ' . (string)$row['profile_photo_mime']);
header('Content-Length: ' . (string)filesize($path));
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
readfile($path);
exit;
