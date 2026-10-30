<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap_core.php';
require_once dirname(__DIR__).'/_workspace_preview.php';
cssv_require_method('GET');
header('Vary: Cookie');
$pdo = cssv_db();
$session = cssv_require_user($pdo, false);
$query = $pdo->prepare('SELECT email FROM users WHERE id=? AND disabled_at IS NULL');
$query->execute([$session['user_id']]);
$user = $query->fetch();
$enabled = cssv_env('CSSV_WORKSPACE_PREVIEW_ENABLED', '1') === '1' && $user
    && cssv_workspace_preview_matches((string)$user['email'], cssv_workspace_preview_target($pdo));
cssv_json(['enabled' => (bool)$enabled, 'user_id' => (string)$session['user_id']]);
