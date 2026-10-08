<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_precis_feedback.php';
cssv_require_method('GET','POST');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_precis_feedback_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'precis_feedback',$user,120,3600);cssv_log_security_event($pdo,'precis_feedback',$user,$user);
  $id=cssv_precis_feedback_reserve($pdo,$user,cssv_request_json(12000));cssv_precis_feedback_execute($pdo,$id);cssv_json(['ok'=>true,'operation'=>cssv_ai_owned_operation($pdo,$id,$user)]);
 }
 if(isset($_GET['request_id'])){$q=$pdo->prepare("SELECT id FROM ai_operations WHERE user_id=? AND request_id=? AND feature='precis'");$q->execute([$user,cssv_pro_id($_GET['request_id'])]);$id=$q->fetchColumn();if(!$id)throw new OutOfBoundsException('No accepted feedback request found.');cssv_json(['ok'=>true,'operation'=>cssv_ai_owned_operation($pdo,$id,$user)]);}
 if(isset($_GET['attempt_id']))cssv_json(['ok'=>true,'profile'=>cssv_precis_feedback_profile($pdo,$user,cssv_pro_id($_GET['attempt_id']))]);
 if(isset($_GET['before'],$_GET['after'])){
  $a=cssv_learning_version($pdo,cssv_pro_id($_GET['before']),$user);$b=cssv_learning_version($pdo,cssv_pro_id($_GET['after']),$user);if($a['writing_id']!==$b['writing_id']||$a['version']>=$b['version'])throw new InvalidArgumentException('Choose an earlier and later version of the same Précis.');cssv_precis_owned($pdo,$user,$a['writing_id']);
  cssv_json(['ok'=>true,'grammar_skills'=>cssv_expression_skills(),'comparison'=>cssv_precis_feedback_compare(cssv_precis_feedback_version($pdo,$user,$a['id'])['feedback'],cssv_precis_feedback_version($pdo,$user,$b['id'])['feedback'])]);
 }
 if(isset($_GET['version_id'])){$v=cssv_learning_version($pdo,cssv_pro_id($_GET['version_id']),$user);cssv_precis_owned($pdo,$user,$v['writing_id']);cssv_json(['ok'=>true,...cssv_precis_feedback_meta($pdo,$user),...cssv_precis_feedback_version($pdo,$user,$v['id'])]);}
 cssv_json(['ok'=>true,...cssv_precis_feedback_meta($pdo,$user)]);
}catch(Throwable $e){
 if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'precis_feedback_invalid');
 if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'precis_feedback_not_found');
 if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'precis_feedback_conflict');
 if($e instanceof LogicException)cssv_fail($e->getMessage(),503,'precis_feedback_unavailable');
 error_log('CSSV Précis feedback failed: '.get_class($e));cssv_fail('Feedback could not be updated. Recover the saved status before requesting new work.',503,'precis_feedback_unavailable');
}
