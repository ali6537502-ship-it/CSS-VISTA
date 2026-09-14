<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_profile.php';
cssv_require_method('POST');
$pdo = cssv_db();
$session = cssv_require_user($pdo, false);
cssv_require_csrf($session);
$userId = (string)$session['user_id'];

const CSSV_MAX_STUDENT_PROFILE_PHOTO_BYTES = 60 * 1024;

function cssv_store_student_profile_photo(array $file, string $folder = 'student-photos'): array
{
    if (!isset($file['error'], $file['tmp_name'], $file['size']) || (int)$file['error'] !== UPLOAD_ERR_OK) {
        cssv_fail('Upload a valid profile photo.', 422, 'photo_required');
    }

    $size = (int)$file['size'];
    if ($size < 512 || $size > CSSV_MAX_STUDENT_PROFILE_PHOTO_BYTES) {
        cssv_fail('Profile photo must be 60 KB or smaller.', 422, 'photo_size_invalid');
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

$photoUpload = $_FILES['photo'] ?? [];
if (isset($photoUpload['size']) && (int)$photoUpload['size'] > CSSV_MAX_STUDENT_PROFILE_PHOTO_BYTES) {
    cssv_fail('Profile photo must be 60 KB or smaller.', 422, 'photo_size_invalid');
}
$photo = cssv_store_student_profile_photo($photoUpload, 'student-photos');
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
