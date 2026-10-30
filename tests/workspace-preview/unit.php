<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_workspace_preview.php';
function check(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$target = hash('sha256', 'pilot@example.invalid');
check(cssv_workspace_preview_matches('Pilot@Example.Invalid', $target), 'Email matching is case insensitive');
check(cssv_workspace_preview_matches(' pilot@example.invalid ', $target), 'Stored email whitespace is normalized');
check(!cssv_workspace_preview_matches('other@example.invalid', $target), 'Other accounts are excluded');
check(!cssv_workspace_preview_matches('pilot@example.invalid', ''), 'Missing target fails closed');
check(!cssv_workspace_preview_matches('pilot@example.invalid', str_repeat('x',64)), 'Malformed target fails closed');
// A production runtime must not consult injectable test configuration or a database name.
class UnusedPreviewPDO extends PDO { public function __construct() {} public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false { throw new RuntimeException('Unexpected fixture lookup'); } }
putenv('CI=false'); putenv('CSSV_DB_NAME=cssvista_briefing_test');
check(cssv_workspace_preview_target(new UnusedPreviewPDO()) === CSSV_WORKSPACE_PREVIEW_EMAIL_SHA256, 'Test override unavailable outside CI');
putenv('CI=true'); putenv('CSSV_DB_NAME=production');
check(cssv_workspace_preview_target(new UnusedPreviewPDO()) === CSSV_WORKSPACE_PREVIEW_EMAIL_SHA256, 'Test override unavailable with non-test database');
echo "PASS workspace preview: 7 identity and production fixture-isolation checks.\n";
