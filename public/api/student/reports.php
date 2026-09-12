<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_native_admin.php';cssv_require_method('POST');account_require_json_origin();$pdo=cssv_db();$session=cssv_require_user($pdo);cssv_require_csrf($session);$body=cssv_request_json(8192);
$question=native_text($body['question_id']??null,160,true);$note=native_text($body['note']??'',1000);
cssv_enforce_rate_limit($pdo,'mcq-report',$session['email'],20,3600);cssv_log_security_event($pdo,'mcq-report',$session['user_id'],$session['email']);
$pdo->prepare('INSERT INTO mcq_error_reports(id,user_id,question_id,note,created_at) VALUES(?,?,?,?,NOW(6))')->execute([cssv_uuid_v4(),$session['user_id'],$question,$note]);cssv_json(['ok'=>true],201);
