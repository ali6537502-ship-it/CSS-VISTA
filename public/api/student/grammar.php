<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_grammar.php';
cssv_require_method('GET','POST');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_grammar_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'grammar_write',$user,360,3600);cssv_log_security_event($pdo,'grammar_write',$user,$user);
  cssv_json(['ok'=>true,...cssv_grammar_save($pdo,$user,cssv_request_json(4194304))]);
 }
 cssv_json(['ok'=>true,...cssv_grammar_read($pdo,$user,cssv_pro_id($_GET['attempt_id'] ?? null))]);
}catch(Throwable $e){
 if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'grammar_invalid');
 if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'grammar_not_found');
 if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'grammar_conflict');
 error_log('CSSV Grammar request failed: '.get_class($e));cssv_fail('Grammar account work could not be saved or loaded. Your browser copy remains available.',503,'grammar_unavailable');
}
