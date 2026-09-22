<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_journal.php';
cssv_require_method('GET');

$pdo = cssv_db();
cssv_journal_ensure_schema($pdo);

$id = trim((string)($_GET['id'] ?? ''));
$kind = trim((string)($_GET['kind'] ?? ''));
if (!preg_match('/^[a-f0-9-]{36}$/i', $id) || !in_array($kind, ['cover', 'author'], true)) {
    cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');
}

$column = $kind === 'cover' ? 'cover_path' : 'author_photo_path';
$stmt = $pdo->prepare("SELECT $column FROM journal_articles WHERE id=? AND published=1 LIMIT 1");
$stmt->execute([$id]);
$relative = trim((string)($stmt->fetchColumn() ?: ''));
$pattern = '~^journal-media/' . preg_quote($id, '~') . '/(?:cover|author)-[a-f0-9]{48}\.(?:jpg|png|webp)$~i';
if ($relative === '' || str_contains($relative, '..') || !preg_match($pattern, $relative)) {
    cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');
}

$file = cssv_private_storage_dir() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
if (!is_file($file) || is_link($file)) {
    cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = (string)$finfo->file($file);
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    cssv_fail('This Journal image is unavailable.', 404, 'journal_image_unavailable');
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string)filesize($file));
header('Content-Disposition: inline');
header('Cache-Control: public, max-age=31536000, immutable');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; sandbox");
readfile($file);
exit;
