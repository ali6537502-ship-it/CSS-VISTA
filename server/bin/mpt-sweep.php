<?php
declare(strict_types=1);
// Hostinger cron (every minute): php server/bin/mpt-sweep.php /absolute/path/to/public_html
// Creates the next daily mocks, auto-submits expired attempts, marks absences and
// computes ranks. Idempotent and lock-protected; safe to overlap with API traffic.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$root = $argv[1] ?? dirname(__DIR__, 2) . '/public';
require_once rtrim($root, '/') . '/api/_mpt.php';
// Preserve all existing records, but do not schedule or process new MPT runs while suspended.
if (CSSV_MPT_HIBERNATED) { echo "MPT mocks hibernated\\n"; exit(0); }
$pdo = cssv_db();
mpt_ensure_schema($pdo);
$result = mpt_maintain($pdo, true);
echo json_encode($result, JSON_THROW_ON_ERROR) . PHP_EOL;
