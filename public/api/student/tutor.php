<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_tutor.php';
cssv_require_method('GET','POST');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_tutor_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'tutor_write',$user,120,3600);cssv_log_security_event($pdo,'tutor_write',$user,$user);
  $id=cssv_tutor_reserve($pdo,$user,cssv_request_json(8000));cssv_tutor_execute($pdo,$id);cssv_json(['ok'=>true,'exchange'=>cssv_tutor_owned($pdo,$user,$id)]);
 }
 cssv_pro_fields($_GET,['id','request_id','context','category','offset','attempt']);
 if(isset($_GET['request_id'])){$q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,cssv_pro_id($_GET['request_id'])]);$r=$q->fetch();$id=$r?json_decode($r['result'],true,16,JSON_THROW_ON_ERROR)['operation_id']??null:null;if(!$id)throw new OutOfBoundsException('No accepted tutor request found.');cssv_json(['ok'=>true,'exchange'=>cssv_tutor_owned($pdo,$user,$id)]);}
 if(isset($_GET['id']))cssv_json(['ok'=>true,'exchange'=>cssv_tutor_owned($pdo,$user,cssv_pro_id($_GET['id']))]);
 $meta=cssv_tutor_meta($pdo,$user);
 if(isset($_GET['context'])){if(!$meta['active'])cssv_fail('Active Pro access is required to open new tutoring sources.',403,'tutor_pro_required');$context=cssv_tutor_context($pdo,cssv_learning_string($_GET['context'],180,'learning context'));cssv_json(['ok'=>true,...$meta,'context'=>$context,'context_hash'=>cssv_tutor_hash($context)]);}
 $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid history page.');
 if(isset($_GET['category'])){if(!$meta['active'])cssv_fail('Active Pro access is required to open new tutoring sources.',403,'tutor_pro_required');cssv_json(['ok'=>true,...cssv_tutor_catalog($pdo,cssv_learning_string($_GET['category'],30,'learning area'),$offset)]);}
 $where='';$params=[$user];if(isset($_GET['attempt'])){$attempt=cssv_pro_id($_GET['attempt']);cssv_learning_attempt($pdo,$attempt,$user);$where=' AND t.attempt_id=?';$params[]=$attempt;}
 $q=$pdo->prepare('SELECT t.operation_id,t.attempt_id,t.question,t.context_id,t.created_at,o.state,o.feature FROM tutor_requests t JOIN ai_operations o ON o.id=t.operation_id WHERE t.user_id=?'.$where.' ORDER BY t.created_at DESC,t.operation_id LIMIT 51 OFFSET '.$offset);$q->execute($params);$rows=$q->fetchAll();$more=count($rows)>50;$rows=array_slice($rows,0,50);foreach($rows as &$row)$row['created_at']=cssv_pro_iso($row['created_at']);unset($row);
 cssv_json(['ok'=>true,...$meta,'history'=>$rows,'has_more'=>$more]);
}catch(Throwable $e){
 if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'tutor_invalid');if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'tutor_not_found');if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'tutor_conflict');if($e instanceof LogicException)cssv_fail($e->getMessage(),503,'tutor_unavailable');
 error_log('CSSV tutor request failed: '.get_class($e));cssv_fail('Tutoring could not be updated. Recover the saved request before asking again.',503,'tutor_unavailable');
}
