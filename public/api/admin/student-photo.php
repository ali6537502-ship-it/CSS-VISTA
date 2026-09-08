<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_admin_auth.php';
cssv_require_method('GET');

$pdo = cssv_db();
cssv_require_separate_admin($pdo);

$userId = strtolower(trim((string)($_GET['user_id'] ?? '')));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $userId)) {
    cssv_fail('A valid student account is required.', 422, 'invalid_student');
}

$stmt = $pdo->prepare('SELECT profile_photo_path,profile_photo_mime FROM student_profiles WHERE user_id=? LIMIT 1');
$stmt->execute([$userId]);
$row = $stmt->fetch();
if (!$row || !$row['profile_photo_path'] || str_contains((string)$row['profile_photo_path'], '..')) {
    cssv_fail('Photo not found.', 404, 'photo_not_found');
}

$base = cssv_env('CSSV_PRIVATE_STORAGE_DIR');
$path = $base
    ? rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string)$row['profile_photo_path'])
    : '';
if ($path === '' || !is_file($path)) {
    cssv_fail('Photo not found.', 404, 'photo_not_found');
}

$mime = (string)($row['profile_photo_mime'] ?: 'image/jpeg');
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    cssv_fail('Photo format is unavailable.', 415, 'invalid_photo_format');
}

header_remove('Content-Type');
header('Content-Type: ' . $mime);
header('Content-Length: ' . (string)filesize($path));
header('Cache-Control: private, max-age=300');
header('Content-Disposition: inline; filename="student-photo"');
header('X-Content-Type-Options: nosniff');
readfile($path);
exit;
