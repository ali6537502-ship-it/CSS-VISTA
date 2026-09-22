<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_native_admin.php';
require_once dirname(__DIR__) . '/_journal.php';

cssv_require_method('GET', 'POST', 'DELETE');
$pdo = cssv_db();
native_owner($pdo);
cssv_journal_ensure_schema($pdo);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

function journal_media_id(mixed $value): string {
    $id = trim((string)$value);
    if (!preg_match('/^[a-f0-9-]{36}$/i', $id)) cssv_fail('Journal article ID is invalid.', 422, 'invalid_journal_id');
    return $id;
}

function journal_media_kind(mixed $value): string {
    $kind = trim((string)$value);
    if (!in_array($kind, ['cover', 'author'], true)) cssv_fail('Choose a valid Journal image type.', 422, 'invalid_journal_image_kind');
    return $kind;
}

function journal_media_row(PDO $pdo, string $id): array {
    $stmt = $pdo->prepare('SELECT id,cover_path,author_photo_path,updated_at FROM journal_articles WHERE id=? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) cssv_fail('This Journal article could not be found.', 404, 'journal_article_not_found');
    return $row;
}

function journal_media_absolute(string $relative): string {
    if ($relative === '' || str_contains($relative, '..')) return '';
    return cssv_private_storage_dir() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
}

if ($method === 'GET') {
    $id = journal_media_id($_GET['id'] ?? '');
    $kind = journal_media_kind($_GET['kind'] ?? '');
    $row = journal_media_row($pdo, $id);
    $relative = trim((string)($kind === 'cover' ? $row['cover_path'] : $row['author_photo_path']));
    $pattern = '~^journal-media/' . preg_quote($id, '~') . '/(?:cover|author)-[a-f0-9]{48}\.(?:jpg|png|webp)$~i';
    if ($relative === '' || !preg_match($pattern, $relative)) cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');
    $file = journal_media_absolute($relative);
    if ($file === '' || !is_file($file) || is_link($file)) cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string)filesize($file));
    header('Content-Disposition: inline');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'; sandbox");
    readfile($file);
    exit;
}

if ($method === 'DELETE') {
    $payload = cssv_request_json(8192);
    $id = journal_media_id($payload['id'] ?? '');
    $kind = journal_media_kind($payload['kind'] ?? '');
    $row = journal_media_row($pdo, $id);
    $pathColumn = $kind === 'cover' ? 'cover_path' : 'author_photo_path';
    $mimeColumn = $kind === 'cover' ? 'cover_mime' : 'author_photo_mime';
    $oldRelative = trim((string)$row[$pathColumn]);

    $stmt = $pdo->prepare("UPDATE journal_articles SET $pathColumn='', $mimeColumn='', updated_at=NOW(6) WHERE id=?");
    $stmt->execute([$id]);

    $oldFile = journal_media_absolute($oldRelative);
    if ($oldFile !== '' && is_file($oldFile)) @unlink($oldFile);
    cssv_json(['ok' => true, 'removed' => $kind]);
}

$id = journal_media_id($_POST['article_id'] ?? '');
$kind = journal_media_kind($_POST['kind'] ?? '');
$row = journal_media_row($pdo, $id);
$file = $_FILES['image'] ?? null;
if (!is_array($file) || !isset($file['error'], $file['tmp_name'], $file['size']) || (int)$file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file((string)$file['tmp_name'])) {
    cssv_fail('Choose a valid JPG, PNG, or WebP image.', 422, 'invalid_journal_image');
}

$tmp = (string)$file['tmp_name'];
$bytes = @filesize($tmp);
$limit = $kind === 'cover' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
if (!is_int($bytes) || $bytes < 512 || $bytes > $limit) {
    cssv_fail($kind === 'cover' ? 'Cover image must be 5 MB or smaller.' : 'Author photo must be 2 MB or smaller.', 422, 'journal_image_size_invalid');
}

$info = @getimagesize($tmp);
if (!is_array($info) || !isset($info[0], $info[1])) cssv_fail('The uploaded file is not a valid image.', 422, 'journal_image_decode_failed');
$width = (int)$info[0];
$height = (int)$info[1];
$maxPixels = $kind === 'cover' ? 24000000 : 16000000;
if ($width < 120 || $height < 120 || $width > 10000 || $height > 10000 || ($width * $height) > $maxPixels) {
    cssv_fail('The image dimensions are not suitable.', 422, 'journal_image_dimensions_invalid');
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
$extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
if (!isset($extensions[$mime])) cssv_fail('Journal images must be JPG, PNG, or WebP.', 422, 'journal_image_type_invalid');

$pathColumn = $kind === 'cover' ? 'cover_path' : 'author_photo_path';
$mimeColumn = $kind === 'cover' ? 'cover_mime' : 'author_photo_mime';
$oldRelative = trim((string)$row[$pathColumn]);
$folder = 'journal-media/' . $id;
$name = $kind . '-' . bin2hex(random_bytes(24)) . '.' . $extensions[$mime];
$dir = cssv_private_storage_dir($folder);
$absolute = $dir . DIRECTORY_SEPARATOR . $name;
$relative = $folder . '/' . $name;

if (!move_uploaded_file($tmp, $absolute)) cssv_fail('The Journal image could not be stored.', 503, 'journal_image_storage_failed');
@chmod($absolute, 0600);

try {
    $stmt = $pdo->prepare("UPDATE journal_articles SET $pathColumn=?, $mimeColumn=?, updated_at=NOW(6) WHERE id=?");
    $stmt->execute([$relative, $mime, $id]);
} catch (Throwable $error) {
    @unlink($absolute);
    error_log('CSSV Journal media update failed: ' . $error->getMessage());
    cssv_fail('The Journal image could not be saved.', 500, 'journal_image_save_failed');
}

$oldFile = journal_media_absolute($oldRelative);
if ($oldFile !== '' && is_file($oldFile) && $oldFile !== $absolute) @unlink($oldFile);

cssv_json([
    'ok' => true,
    'kind' => $kind,
    'url' => '/api/journal-media.php?id=' . rawurlencode($id) . '&kind=' . rawurlencode($kind) . '&v=' . rawurlencode(gmdate('Y-m-d H:i:s')),
]);
