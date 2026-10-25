<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_admin_auth.php';
require_once dirname(__DIR__) . '/_health.php';
cssv_require_method('GET');
$pdo = cssv_db();
cssv_require_separate_admin($pdo);
$status = cssv_health_diagnostics();
cssv_json($status, $status['ok'] ? 200 : 503);
