<?php
declare(strict_types=1);
// Feature flag for the current visitor (D-10). Exposes nothing else.
require_once dirname(__DIR__) . '/_mpt.php';
cssv_require_method('GET');
header('X-Robots-Tag: noindex, nofollow');
$pdo = cssv_db();
$session = cssv_current_session($pdo);
cssv_json(['ok' => true, 'enabled' => mpt_enabled_for($session), 'server_time' => mpt_iso(mpt_now_ms())]);
