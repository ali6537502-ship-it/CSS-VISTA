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

$stmt = $pdo->prepare('SELECT profile_photo_path,profile_photo_mime,avatar_url FROM student_profiles WHERE user_id=? LIMIT 1');
$stmt->execute([$userId]);
$row = $stmt->fetch();
if (!$row) {
    cssv_fail('Photo not found.', 404, 'photo_not_found');
}

$allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
$relativePath = trim((string)($row['profile_photo_path'] ?? ''));
if ($relativePath !== '' && !str_contains($relativePath, '..')) {
    $base = cssv_env('CSSV_PRIVATE_STORAGE_DIR');
    $path = $base
        ? rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath)
        : '';
    if ($path !== '' && is_file($path)) {
        $mime = (string)($row['profile_photo_mime'] ?: 'image/jpeg');
        if (!in_array($mime, $allowedMimes, true)) {
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
    }
}

// Legacy/migrated accounts may still carry their original HTTPS avatar URL.
// Proxy only existing Google-hosted account avatars;
// never allow this endpoint to become an arbitrary server-side URL fetcher.
$avatarUrl = trim((string)($row['avatar_url'] ?? ''));
if ($avatarUrl !== '' && function_exists('curl_init')) {
    $parts = parse_url($avatarUrl);
    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    $host = strtolower((string)($parts['host'] ?? ''));
    $allowedHost = $scheme === 'https' && $host !== '' && (
        $host === 'googleusercontent.com'
        || str_ends_with($host, '.googleusercontent.com')
    );

    if ($allowedHost) {
        $body = '';
        $tooLarge = false;
        $curl = curl_init($avatarUrl);
        if ($curl !== false) {
            curl_setopt_array($curl, [
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_USERAGENT => 'CSS-Vista-Admin-Photo/1.0',
                CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body, &$tooLarge): int {
                    if (strlen($body) + strlen($chunk) > 2 * 1024 * 1024) {
                        $tooLarge = true;
                        return 0;
                    }
                    $body .= $chunk;
                    return strlen($chunk);
                },
            ]);
            $ok = curl_exec($curl);
            $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $mime = strtolower(trim((string)curl_getinfo($curl, CURLINFO_CONTENT_TYPE)));
            if (str_contains($mime, ';')) $mime = trim(explode(';', $mime, 2)[0]);
            curl_close($curl);

            if ($ok !== false && !$tooLarge && $status === 200 && $body !== '' && in_array($mime, $allowedMimes, true)) {
                header_remove('Content-Type');
                header('Content-Type: ' . $mime);
                header('Content-Length: ' . (string)strlen($body));
                header('Cache-Control: private, max-age=300');
                header('Content-Disposition: inline; filename="student-photo"');
                header('X-Content-Type-Options: nosniff');
                echo $body;
                exit;
            }
        }
    }
}

cssv_fail('Photo not found.', 404, 'photo_not_found');
