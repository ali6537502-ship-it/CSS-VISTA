<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_expression.php';
cssv_require_method('GET','POST');
try {
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_handwriting_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'expression_write',$user,120,3600);cssv_log_security_event($pdo,'expression_write',$user,$user);
  $operation=cssv_expression_reserve($pdo,$user,cssv_request_json(12000));cssv_expression_execute($pdo,$operation);cssv_json(['ok'=>true,'operation'=>cssv_ai_owned_operation($pdo,$operation,$user)]);
 }
 $date=cssv_ai_bucket(new DateTimeImmutable('now',new DateTimeZone('UTC')));$q=$pdo->prepare("SELECT feature,used,reserved,accepted FROM ai_daily_usage WHERE user_id=? AND bucket_date=? AND feature IN ('paragraph','sentence')");$q->execute([$user,$date]);$rows=array_column($q->fetchAll(),null,'feature');$usage=[];
 foreach(['paragraph','sentence'] as $f){$row=$rows[$f]??[];$usage[$f]=['limit'=>cssv_ai_limit($f),'used'=>(int)($row['used']??0),'reserved'=>(int)($row['reserved']??0),'accepted'=>(int)($row['accepted']??0)];}
 $meta=['configuration'=>cssv_expression_configuration(),'membership'=>cssv_pro_membership($pdo,$user),'date'=>$date,'usage'=>$usage,'skills'=>cssv_expression_skills()];
 if(isset($_GET['before'],$_GET['after']))cssv_json(['ok'=>true,...$meta,'comparison'=>cssv_expression_compare(cssv_expression_evaluated_version($pdo,cssv_pro_id($_GET['before']),$user),cssv_expression_evaluated_version($pdo,cssv_pro_id($_GET['after']),$user))]);
 if(isset($_GET['writing_id'])){
  $w=cssv_learning_writing($pdo,cssv_pro_id($_GET['writing_id']),$user);$selected=isset($_GET['version_id'])?cssv_pro_id($_GET['version_id']):$w['versions'][0]['id'];$v=cssv_expression_evaluated_version($pdo,$selected,$user);if($v['writing_id']!==$w['id'])throw new InvalidArgumentException('Choose a version of this writing.');
  $q=$pdo->prepare('SELECT id FROM ai_operations WHERE user_id=? AND version_id=? AND feature=? ORDER BY created_at DESC,id DESC LIMIT 20');$q->execute([$user,$selected,$w['kind']]);$ops=array_map(fn($id)=>cssv_ai_owned_operation($pdo,$id,$user),$q->fetchAll(PDO::FETCH_COLUMN));
  cssv_json(['ok'=>true,...$meta,'writing'=>$w,'version'=>$v,'operations'=>$ops]);
 }
 $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid writing history page.');
 cssv_json(['ok'=>true,...$meta,...cssv_expression_overview($pdo,$user,(int)$offset)]);
}catch(Throwable $e){cssv_expression_problem($e);}
