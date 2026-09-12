<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_native_admin.php';cssv_require_method('GET','POST');$pdo=cssv_db();native_owner($pdo);account_auth_schema($pdo);
$delivery=$_SERVER['REQUEST_METHOD']==='POST'?account_deliver_mail($pdo,10):null;
cssv_json(['ok'=>true,'transport'=>cssv_env('CSSV_SMTP_HOST')?'smtp':'hostinger-php-mail','transport_available'=>cssv_env('CSSV_SMTP_HOST')?(bool)cssv_env('CSSV_SMTP_USER')&&cssv_env('CSSV_SMTP_PASSWORD')!==null:function_exists('mail'),'queue'=>$pdo->query('SELECT status,COUNT(*) AS count FROM account_mail_outbox GROUP BY status')->fetchAll(),'delivery'=>$delivery,'note'=>'Accepted means the Hostinger mail transport accepted the message; it does not prove inbox delivery.']);
