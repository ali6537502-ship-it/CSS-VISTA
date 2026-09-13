<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('GET');
$pdo=cssv_db(); $session=cssv_current_session($pdo);
if (!$session) cssv_json(['ok'=>true,'authenticated'=>false,'provider'=>'hostinger']);
cssv_json(['ok'=>true,'authenticated'=>true,'provider'=>'hostinger','user'=>account_user($pdo,$session['user_id'])]);
