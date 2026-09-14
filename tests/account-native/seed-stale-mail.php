<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli'||getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test') exit(1);
require_once dirname(__DIR__,2).'/public/api/_account_auth.php';
$email=$argv[1]??'';
if (!str_ends_with($email,'@example.invalid')) exit(1);
$pdo=cssv_db(); account_auth_schema($pdo);
$query=$pdo->prepare('SELECT id,email FROM users WHERE email=?'); $query->execute([$email]); $user=$query->fetch();
if (!$user) exit(1);
$pdo->prepare("INSERT INTO account_mail_outbox(id,user_id,purpose,message_cipher,status,expires_at,created_at) VALUES(?,?,?,?,'pending',DATE_ADD(NOW(6),INTERVAL 10 MINUTE),DATE_SUB(NOW(6),INTERVAL 1 MINUTE))")
    ->execute([cssv_uuid_v4(),$user['id'],'reset',account_encrypt_mail(['to'=>$user['email'],'subject'=>'STALE QUEUE TEST','text'=>'STALE QUEUE TEST'])]);
