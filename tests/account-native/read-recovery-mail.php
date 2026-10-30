<?php
declare(strict_types=1);

// Only exposes a disposable fixture's captured message to the local test runner.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') exit(1);
require __DIR__.'/../../public/api/_bootstrap_core.php';
if (cssv_db()->query('SELECT DATABASE()')->fetchColumn() !== 'cssvista_briefing_test') exit(1);
$email = $argv[1] ?? '';
if (!preg_match('/^recovery-browser-[a-z0-9-]+@example\.invalid$/D', $email)) exit(1);
$previous = $argv[2] ?? '';
if ($previous !== '' && !preg_match('/^[A-Za-z0-9_-]{64}$/D', $previous)) exit(1);
$files = glob(__DIR__.'/../../test-artifacts/account-mail/*.eml') ?: [];
usort($files, static fn($a, $b) => filemtime($b) <=> filemtime($a));
foreach ($files as $file) {
    $raw = file_get_contents($file);
    if (!preg_match('/^To:\s*'.preg_quote($email, '/').'\s*$/mi', $raw)) continue;
    if (preg_match('/#token=([A-Za-z0-9_-]{64})/', $raw, $token) && preg_match('/Your password reset code:\s*(\d{6})/', $raw, $code)) {
        if ($token[1] === $previous) continue;
        echo json_encode(['token' => $token[1], 'code' => $code[1]], JSON_THROW_ON_ERROR);
        exit;
    }
}
throw new RuntimeException('Recovery message was not captured for this fixture.');
