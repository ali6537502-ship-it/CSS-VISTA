<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_workspace.php';
cssv_require_method('GET');
header('Cache-Control: private, no-store');
header('X-Robots-Tag: noindex, nofollow');
try {
    $pdo=cssv_db();$session=cssv_require_user($pdo);
    cssv_json(cssv_workspace_project($pdo,(string)$session['user_id'],cssv_workspace_filters($_GET)));
}catch(Throwable $e){
    if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'workspace_invalid');
    error_log('CSSV workspace read failed: '.get_class($e));
    cssv_fail('Your saved work could not be loaded. Retry this read; your records have not changed.',503,'workspace_unavailable');
}
