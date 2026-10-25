<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_health.php';
cssv_require_method('GET');

// Anonymous monitoring gets runtime liveness, never configuration or DB details.
$ok = !in_array(false, cssv_health_runtime_checks(), true);
cssv_json(['ok' => $ok], $ok ? 200 : 503);
