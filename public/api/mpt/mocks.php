<?php
declare(strict_types=1);
// Public mock listing with the viewer's state. Never returns roll numbers.
require_once dirname(__DIR__) . '/_mpt.php';
cssv_require_method('GET');
header('X-Robots-Tag: noindex, nofollow');
$pdo = cssv_db();
$session = cssv_current_session($pdo);
if (!mpt_enabled_for($session)) cssv_json(['ok' => true, 'enabled' => false, 'mocks' => []] + ['server_time' => mpt_iso(mpt_now_ms())]);
mpt_ensure_schema($pdo);
mpt_maintain($pdo);
cssv_json(['ok' => true, 'enabled' => true, 'signed_in' => $session !== null] + mpt_public_listing($pdo, $session));
