<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap_core.php';
require_once dirname(__DIR__).'/_workspace_preview.php';
cssv_require_method('GET');
header('Vary: Cookie');
$pdo = cssv_db();
$session = cssv_require_user($pdo, false);
cssv_json(['enabled' => cssv_workspace_enabled(), 'user_id' => (string)$session['user_id']]);
