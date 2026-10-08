<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_handwriting_provider.php';
cssv_require_method('GET','POST');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_handwriting_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'handwriting_write',$user,60,3600);cssv_log_security_event($pdo,'handwriting_write',$user,$user);
  $multipart=str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE']??'')),'multipart/form-data');
  if($multipart){
   cssv_pro_fields($_FILES,['image']);$result=cssv_handwriting_upload($pdo,$user,$_POST,$_FILES['image']??[]);cssv_json(['ok'=>true,...$result]);
  }
  $body=cssv_request_json(30000);$action=$body['action']??'';
  if(in_array($action,['edit','confirm'],true))cssv_json(['ok'=>true,...cssv_handwriting_mutation($pdo,$user,$body)]);
  $operation=cssv_handwriting_reserve($pdo,$user,$body);cssv_handwriting_execute($pdo,$operation);cssv_json(['ok'=>true,'operation_id'=>$operation,'operation'=>cssv_ai_owned_operation($pdo,$operation,$user)]);
 }
 $config=cssv_handwriting_configuration();$membership=cssv_pro_membership($pdo,$user);$date=cssv_ai_bucket(new DateTimeImmutable('now',new DateTimeZone('UTC')));
 $q=$pdo->prepare("SELECT feature,used,reserved,accepted FROM ai_daily_usage WHERE user_id=? AND bucket_date=? AND feature IN ('handwriting','handwriting_extract')");$q->execute([$user,$date]);$usage=array_column($q->fetchAll(),null,'feature');
 $buckets=[];foreach(['handwriting_extract','handwriting'] as $f){$row=$usage[$f]??[];$buckets[$f]=['limit'=>cssv_ai_limit($f),'used'=>(int)($row['used']??0),'reserved'=>(int)($row['reserved']??0),'accepted'=>(int)($row['accepted']??0)];}
 $meta=['configuration'=>$config,'membership'=>$membership,'date'=>$date,'usage'=>$buckets];
 if(isset($_GET['page_id']))cssv_json(['ok'=>true,...$meta,'page'=>cssv_handwriting_owned($pdo,cssv_pro_id($_GET['page_id']),$user)]);
 $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid history page.');
 $q=$pdo->prepare('SELECT id,title,state,transcription_version,created_at FROM handwriting_pages WHERE user_id=? ORDER BY created_at DESC,id LIMIT 51 OFFSET '.(int)$offset);$q->execute([$user]);$rows=$q->fetchAll();$more=count($rows)>50;foreach($rows as &$r){$r['transcription_version']=(int)$r['transcription_version'];$r['created_at']=cssv_pro_iso($r['created_at']);}unset($r);
 $q=$pdo->prepare('SELECT id,target_year FROM preparation_attempts WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 50');$q->execute([$user]);
 cssv_json(['ok'=>true,...$meta,'pages'=>array_slice($rows,0,50),'has_more'=>$more,'attempts'=>$q->fetchAll()]);
}catch(Throwable $e){cssv_handwriting_problem($e);}
