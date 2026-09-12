<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$root=$argv[1]??dirname(__DIR__,2).'/public';
require_once rtrim($root,'/').'/api/_account_auth.php';
$pdo=cssv_db();account_auth_schema($pdo);$result=account_deliver_mail($pdo,10);
echo json_encode($result,JSON_THROW_ON_ERROR).PHP_EOL;
exit($result['failed']>0?1:0);
