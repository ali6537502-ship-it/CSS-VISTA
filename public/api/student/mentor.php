<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_mentor.php';
cssv_require_method('GET','POST');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];
 if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_pro_require_active($pdo,$user);cssv_mentor_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'mentor_write',$user,240,3600);cssv_log_security_event($pdo,'mentor_write',$user,$user);
  cssv_json(['ok'=>true,...cssv_mentor_mutation($pdo,$user,cssv_request_json(30000))]);
 }
 if(isset($_GET['id'])){cssv_pro_fields($_GET,['id']);cssv_json(['ok'=>true,'answer'=>cssv_mentor_answer($pdo,cssv_pro_id($_GET['id']),$user)]);}
 cssv_json(['ok'=>true,...cssv_mentor_overview($pdo,$user,$_GET)]);
}catch(Throwable $e){cssv_pro_problem($e);}
