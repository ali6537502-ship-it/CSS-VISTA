<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_profile.php';
cssv_require_method('POST');
$pdo = cssv_db();
$session = cssv_require_user($pdo, false);
cssv_require_csrf($session);
$userId = (string)$session['user_id'];

$photoUpload = $_FILES['photo'] ?? [];
if (isset($photoUpload['size']) && (int)$photoUpload['size'] > CSSV_MAX_PROFILE_PHOTO_BYTES) {
    cssv_fail('Profile photo must be 25 KB or smaller.', 422, 'photo_size_invalid');
}
$photo = cssv_store_profile_photo($photoUpload, 'student-photos');
$oldStmt = $pdo->prepare('SELECT profile_photo_path FROM student_profiles WHERE user_id=?');
$oldStmt->execute([$userId]);
$oldPath = $oldStmt->fetchColumn();

try {
    $stmt = $pdo->prepare('UPDATE student_profiles SET profile_photo_path=?,profile_photo_mime=?,profile_photo_bytes=?,profile_photo_width=?,profile_photo_height=?,profile_photo_sha256=?,profile_photo_updated_at=NOW(6) WHERE user_id=?');
    $stmt->execute([$photo['path'],$photo['mime'],$photo['bytes'],$photo['width'],$photo['height'],$photo['sha256'],$userId]);
} catch (Throwable $error) {
    @unlink((string)$photo['absolute_path']);
    throw $error;
}
if (is_string($oldPath) && $oldPath !== '' && $oldPath !== $photo['path']) {
    cssv_remove_private_file($oldPath);
}
$completion=cssv_refresh_profile_completion($pdo,$userId);
cssv_json(['completion'=>$completion,'ok' => true, 'photo' => ['bytes' => $photo['bytes'], 'width' => $photo['width'], 'height' => $photo['height'], 'mime' => $photo['mime']]]);
