<?php
declare(strict_types=1);

// Single-account presentation pilot. No membership or academic permissions change.
const CSSV_WORKSPACE_PREVIEW_EMAIL_SHA256 = '7a74ecfd0ec869aef291a0af8a44569fdda016bfe7b22bda60dc0c0eeac199a3';
function cssv_workspace_preview_matches(string $email, string $targetHash): bool {
    return preg_match('/^[a-f0-9]{64}$/D', $targetHash) === 1
        && hash_equals($targetHash, hash('sha256', strtolower(trim($email))));
}
function cssv_workspace_preview_target(PDO $pdo): string {
    // The injectable fixture target is ignored by every non-test database/runtime.
    if (getenv('CI') === 'true' && getenv('CSSV_DB_NAME') === 'cssvista_briefing_test'
        && $pdo->query('SELECT DATABASE()')->fetchColumn() === 'cssvista_briefing_test') {
        $fixture = cssv_env('CSSV_WORKSPACE_PREVIEW_TEST_EMAIL_SHA256');
        if (is_string($fixture) && preg_match('/^[a-f0-9]{64}$/D', $fixture) === 1) return $fixture;
    }
    return CSSV_WORKSPACE_PREVIEW_EMAIL_SHA256;
}
