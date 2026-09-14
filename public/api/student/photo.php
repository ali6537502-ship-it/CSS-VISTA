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

function cssv_ensure_student_photo_60kb_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }

    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-student-photo-60kb',5)")->fetchColumn() !== 1) {
        throw new RuntimeException('student_photo_schema_lock_failed');
    }

    try {
        $constraint = $pdo->prepare(
            "SELECT cc.CHECK_CLAUSE
             FROM information_schema.TABLE_CONSTRAINTS tc
             JOIN information_schema.CHECK_CONSTRAINTS cc
               ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA
              AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME
             WHERE tc.CONSTRAINT_SCHEMA=DATABASE()
               AND tc.TABLE_NAME='student_profiles'
               AND tc.CONSTRAINT_NAME='student_profiles_photo_size_chk'
               AND tc.CONSTRAINT_TYPE='CHECK'
             LIMIT 1"
        );
        $constraint->execute();
        $clause = $constraint->fetchColumn();

        if (!is_string($clause) || !preg_match('/(?:^|[^0-9])61440(?:[^0-9]|$)/', $clause)) {
            if (is_string($clause)) {
                $version = (string)$pdo->query('SELECT VERSION()')->fetchColumn();
                if (stripos($version, 'MariaDB') !== false) {
                    $pdo->exec('ALTER TABLE student_profiles DROP CONSTRAINT student_profiles_photo_size_chk');
                } else {
                    $pdo->exec('ALTER TABLE student_profiles DROP CHECK student_profiles_photo_size_chk');
                }
            }
            $pdo->exec(
                'ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_photo_size_chk '
                . 'CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 61440)'
            );
        }

        $ready = true;
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('cssvista-student-photo-60kb')");
    }
}

$photoUpload = $_FILES['photo'] ?? null;
if (!is_array($photoUpload) || !isset($photoUpload['error'], $photoUpload['tmp_name'], $photoUpload['size'])) {
    cssv_fail('Choose a profile photo and try again.', 422, 'photo_required');
}

$uploadError = (int)$photoUpload['error'];
if ($uploadError !== UPLOAD_ERR_OK) {
    if (in_array($uploadError, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        cssv_fail('Profile photo must be 60 KB or smaller.', 422, 'photo_size_invalid');
    }
    error_log('CSSV student photo upload failed before validation. PHP upload error=' . $uploadError);
    cssv_fail('The photo upload did not complete. Please choose the photo again and retry.', 422, 'photo_upload_failed');
}

$tmp = (string)$photoUpload['tmp_name'];
if ($tmp === '' || !is_uploaded_file($tmp)) {
    cssv_fail('The selected photo could not be validated. Please choose it again.', 422, 'invalid_upload');
}

$actualSize = @filesize($tmp);
if (!is_int($actualSize) || $actualSize < 512 || $actualSize > CSSV_MAX_STUDENT_PROFILE_PHOTO_BYTES) {
    cssv_fail('Profile photo must be 60 KB or smaller.', 422, 'photo_size_invalid');
}

$dimensions = @getimagesize($tmp);
if (!is_array($dimensions) || !isset($dimensions[0], $dimensions[1])) {
    cssv_fail('The uploaded file is not a valid image.', 422, 'photo_decode_failed');
}

$width = (int)$dimensions[0];
$height = (int)$dimensions[1];
if ($width < 120 || $height < 120 || $width > 4000 || $height > 4000 || ($width * $height) > CSSV_MAX_PROFILE_PHOTO_PIXELS) {
    cssv_fail('Profile photo dimensions are not suitable. Use a photo between 120 and 4000 pixels on each side.', 422, 'photo_dimensions_invalid');
}

$mime = '';
if (class_exists('finfo')) {
    try {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = (string)$finfo->file($tmp);
    } catch (Throwable $error) {
        error_log('CSSV photo MIME inspection fallback: ' . $error->getMessage());
    }
}
if ($mime === '' && isset($dimensions['mime'])) {
    $mime = (string)$dimensions['mime'];
}

$extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
if (!isset($extensions[$mime])) {
    cssv_fail('Profile photo must be JPG, PNG, or WebP.', 422, 'photo_type_invalid');
}

$sha256 = @hash_file('sha256', $tmp);
if (!is_string($sha256) || $sha256 === '') {
    cssv_fail('The photo could not be validated. Please try again.', 422, 'photo_hash_failed');
}

$absolutePath = null;
$relativePath = null;
try {
    cssv_ensure_student_photo_60kb_schema($pdo);

    $name = bin2hex(random_bytes(24)) . '.' . $extensions[$mime];
    $dir = cssv_private_storage_dir('student-photos');
    $absolutePath = $dir . DIRECTORY_SEPARATOR . $name;
    $relativePath = 'student-photos/' . $name;

    if (!move_uploaded_file($tmp, $absolutePath)) {
        cssv_fail('The photo could not be stored. Please try again.', 503, 'photo_storage_failed');
    }
    @chmod($absolutePath, 0600);

    $oldStmt = $pdo->prepare('SELECT profile_photo_path FROM student_profiles WHERE user_id=? LIMIT 1');
    $oldStmt->execute([$userId]);
    $oldPath = $oldStmt->fetchColumn();

    $stmt = $pdo->prepare('UPDATE student_profiles SET profile_photo_path=?,profile_photo_mime=?,profile_photo_bytes=?,profile_photo_width=?,profile_photo_height=?,profile_photo_sha256=?,profile_photo_updated_at=NOW(6) WHERE user_id=?');
    $stmt->execute([$relativePath, $mime, $actualSize, $width, $height, $sha256, $userId]);

    if ($stmt->rowCount() < 1) {
        @unlink($absolutePath);
        cssv_fail('Your profile could not be updated. Refresh the page and try again.', 409, 'profile_update_failed');
    }

    if (is_string($oldPath) && $oldPath !== '' && $oldPath !== $relativePath) {
        cssv_remove_private_file($oldPath);
    }

    try {
        $completion = cssv_refresh_profile_completion($pdo, $userId);
    } catch (Throwable $refreshError) {
        error_log('CSSV profile completion refresh failed after photo save: ' . $refreshError->getMessage());
        $completion = null;
    }

    cssv_json([
        'ok' => true,
        'completion' => $completion,
        'photo' => [
            'bytes' => $actualSize,
            'width' => $width,
            'height' => $height,
            'mime' => $mime,
        ],
    ]);
} catch (Throwable $error) {
    if (is_string($absolutePath) && $absolutePath !== '' && is_file($absolutePath)) {
        @unlink($absolutePath);
    }
    error_log('CSSV student photo save failed: ' . $error->getMessage());
    cssv_fail('Your photo could not be saved right now. Please try again.', 500, 'photo_save_failed');
}
