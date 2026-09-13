<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_native_admin.php';cssv_require_method('GET','DELETE');$pdo=cssv_db();native_owner($pdo);
if($_SERVER['REQUEST_METHOD']==='GET')cssv_json(['reports'=>$pdo->query("SELECT id,question_id,note,created_at FROM mcq_error_reports WHERE status='open' ORDER BY created_at DESC LIMIT 500")->fetchAll()]);
$body=cssv_request_json();$id=native_text($body['id']??null,36,true);$pdo->prepare('DELETE FROM mcq_error_reports WHERE id=?')->execute([$id]);cssv_json(['ok'=>true]);
