<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';require_once __DIR__.'/_ai_openai.php';require_once __DIR__.'/_profile.php';
function cssv_ai_limit(string $feature): int {
 $defaults=cssv_ai_features();if(!isset($defaults[$feature]))throw new InvalidArgumentException('This AI scope is not permitted.');
 $raw=cssv_env('CSSV_AI_LIMIT_'.strtoupper($feature),(string)$defaults[$feature]);
 return is_string($raw) && preg_match('/^(?:0|[1-9][0-9]{0,2})$/D',$raw) ? (int)$raw : 0;
}
function cssv_ai_owned_operation(PDO $pdo,string $id,string $userId): array {
 $q=$pdo->prepare('SELECT id,feature,version_id,bucket_date,state,accounting,result,error_code,created_at,completed_at FROM ai_operations WHERE id=? AND user_id=?');$q->execute([$id,$userId]);$op=$q->fetch();if(!$op)throw new OutOfBoundsException('AI operation not found.');
 $op['result']=$op['result'] ? json_decode($op['result'],true,32,JSON_THROW_ON_ERROR) : null;foreach(['created_at','completed_at'] as $k)$op[$k]=cssv_pro_iso($op[$k]);return $op;
}
function cssv_ai_reserve(PDO $pdo,string $userId,string $request,string $feature,string $versionId,?DateTimeImmutable $now=null,?string $policyVersion=null): string {
 $request=cssv_pro_id($request);$versionId=cssv_pro_id($versionId);$limit=cssv_ai_limit($feature);$now ??=new DateTimeImmutable('now',new DateTimeZone('UTC'));
 $pdo->beginTransaction();
 try {
  cssv_learning_owner_lock($pdo,$userId);$version=cssv_learning_version($pdo,$versionId,$userId);
  if(in_array($feature,['paragraph','sentence','precis'],true) && $version['kind']!==$feature)throw new InvalidArgumentException('Writing type does not match this AI scope.');
  $intent=[$feature,$versionId,$version['text_hash']];if($policyVersion!==null)$intent[]=['expression_policy'=>$policyVersion];
  $hash=hash('sha256',json_encode($intent,JSON_THROW_ON_ERROR));
  $q=$pdo->prepare('SELECT id,payload_hash FROM ai_operations WHERE user_id=? AND request_id=?');$q->execute([$userId,$request]);
  if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This AI request was used for different writing.');$pdo->commit();return $prior['id'];}
  if($policyVersion!==null){$q=$pdo->prepare("SELECT id FROM ai_operations WHERE user_id=? AND version_id=? AND feature=? AND state IN ('reserved','in_flight','unknown','succeeded') LIMIT 1");$q->execute([$userId,$versionId,$feature]);if($q->fetchColumn())throw new DomainException('This saved version already has feedback or a pending request. Open its saved status.');}
  if(!cssv_profile_status(cssv_profile_for_user($pdo,$userId))['complete'])throw new DomainException('Complete your profile before requesting new AI work.');
  if(cssv_pro_membership($pdo,$userId)['status']!=='active')throw new DomainException('Active Pro access is required for new AI work.');
  $config=cssv_ai_configuration();if(!$config['configured'])throw new LogicException('AI assistance is not enabled.');
  if($limit===0)throw new LogicException('This AI scope is not enabled.');
  // Only version-bound writing scopes are wired in this foundation. Other policy
  // buckets exist, but tutoring/Précis/OCR need their own validated context first.
  if(!in_array($feature,['paragraph','sentence'],true))throw new LogicException('This AI learning feature is not wired yet.');
  if($feature==='paragraph' && preg_match('/\n\s*\n/u',$version['text']))throw new InvalidArgumentException('Submit a single paragraph for paragraph feedback.');
  if(cssv_learning_words($version['text'])>($feature==='sentence'?80:450))throw new InvalidArgumentException('Use a short sentence or one paragraph for this scope.');
  $id=cssv_ai_reserve_usage($pdo,$userId,$request,$hash,$feature,$versionId,$config,$now);$pdo->commit();return $id;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
/** Caller holds the account lock in a transaction. */
function cssv_ai_reserve_usage(PDO $pdo,string $userId,string $request,string $hash,string $feature,?string $versionId,array $config,DateTimeImmutable $now,?string $handwritingId=null): string {
 $limit=cssv_ai_limit($feature);
 $bucket=cssv_ai_bucket($now);
 $pdo->prepare('INSERT IGNORE INTO ai_daily_usage(user_id,feature,bucket_date) VALUES(?,?,?)')->execute([$userId,$feature,$bucket]);
 $q=$pdo->prepare('SELECT * FROM ai_daily_usage WHERE user_id=? AND feature=? AND bucket_date=? FOR UPDATE');$q->execute([$userId,$feature,$bucket]);$usage=$q->fetch();
 if((int)$usage['used']+(int)$usage['reserved'] >= $limit)throw new DomainException('Your daily allowance is already used or reserved by pending work.');
 if((int)$usage['accepted'] >= ($feature==='handwriting_extract'?$limit:$limit*3))throw new DomainException('The daily request-attempt limit has been reached.');
 $id=cssv_uuid_v4();$fields='id,user_id,request_id,payload_hash,feature,version_id,bucket_date,model,prompt_version';$values=[$id,$userId,$request,$hash,$feature,$versionId,$bucket,$config['model'],$config['prompt_version']];if($handwritingId!==null){$fields.=',handwriting_id';$values[]=$handwritingId;}
 $pdo->prepare('INSERT INTO ai_operations('.$fields.') VALUES('.implode(',',array_fill(0,count($values),'?')).')')->execute($values);
 $pdo->prepare('UPDATE ai_daily_usage SET reserved=reserved+1,accepted=accepted+1 WHERE user_id=? AND feature=? AND bucket_date=?')->execute([$userId,$feature,$bucket]); return $id;
}
function cssv_ai_operation_lock(PDO $pdo,string $id): array {
 $q=$pdo->prepare('SELECT user_id FROM ai_operations WHERE id=?');$q->execute([$id]);$user=$q->fetchColumn();if(!$user)throw new OutOfBoundsException('AI operation not found.');cssv_learning_owner_lock($pdo,$user,false);
 $q=$pdo->prepare('SELECT * FROM ai_operations WHERE id=? FOR UPDATE');$q->execute([$id]);return $q->fetch();
}
function cssv_ai_release_reservation(PDO $pdo,array $op,int $used): void {
 $q=$pdo->prepare('UPDATE ai_daily_usage SET reserved=reserved-1,used=used+? WHERE user_id=? AND feature=? AND bucket_date=? AND reserved>0');
 $q->execute([$used,$op['user_id'],$op['feature'],$op['bucket_date']]);
 if($q->rowCount()!==1)throw new RuntimeException('AI reservation accounting is inconsistent.');
}
function cssv_ai_start(PDO $pdo,string $id,bool $dispatchAllowed=true,?callable $transition=null): ?array {
 $pdo->beginTransaction();try {
  $op=cssv_ai_operation_lock($pdo,$id);if($op['state']!=='reserved'){$pdo->commit();return null;}
  if(!$dispatchAllowed){
   if($transition)$transition($pdo,$op,'failed',null);
   cssv_ai_release_reservation($pdo,$op,0);
   $pdo->prepare("UPDATE ai_operations SET state='failed',accounting='released',error_code='ai_preflight_unavailable',completed_at=NOW(6) WHERE id=?")->execute([$id]);$pdo->commit();return null;
  }
  $pdo->prepare("UPDATE ai_operations SET state='in_flight',provider_started_at=NOW(6) WHERE id=?")->execute([$id]);
  $pdo->prepare('UPDATE ai_daily_usage SET provider_calls=provider_calls+1 WHERE user_id=? AND feature=? AND bucket_date=?')->execute([$op['user_id'],$op['feature'],$op['bucket_date']]);$pdo->commit();return $op;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_ai_finish(PDO $pdo,string $id,string $state,?array $response=null,?array $result=null,string $error='',?callable $transition=null): void {
 if(!in_array($state,['succeeded','failed','unknown'],true))throw new InvalidArgumentException('Invalid AI completion state.');
 $pdo->beginTransaction();try {
  $op=cssv_ai_operation_lock($pdo,$id);if(in_array($op['state'],['succeeded','failed'],true)){$pdo->commit();return;}
  if($state==='succeeded' && $op['feature']!=='handwriting_extract') {if(!$result)throw new InvalidArgumentException('Validated feedback is required.');$v=cssv_learning_version($pdo,$op['version_id'],$op['user_id']);$result=cssv_writing_result($result,$v['text']);}
  if(in_array($op['feature'],['handwriting','handwriting_extract'],true) && !$transition)throw new LogicException('Extraction requires its persisted workflow transition.');
  if($transition)$result=$transition($pdo,$op,$state,$result);
  $usage=$response ? cssv_ai_usage_parse($response) : ['input_tokens'=>null,'output_tokens'=>null,'cached_tokens'=>null];
  $responseId=is_string($response['id'] ?? null) ? mb_substr($response['id'],0,180) : null;$model=is_string($response['model'] ?? null)?mb_substr($response['model'],0,120):null;
  $terminal=$state!=='unknown';$accounting=$terminal ? ($state==='succeeded'?'consumed':'released') : 'reserved';
  if($terminal && $op['accounting']==='reserved')cssv_ai_release_reservation($pdo,$op,$state==='succeeded'?1:0);
  $pdo->prepare('UPDATE ai_operations SET state=?,accounting=?,provider_response_id=COALESCE(?,provider_response_id),reported_model=COALESCE(?,reported_model),input_tokens=COALESCE(?,input_tokens),cached_tokens=COALESCE(?,cached_tokens),output_tokens=COALESCE(?,output_tokens),result=?,error_code=?,completed_at=? WHERE id=?')->execute([$state,$accounting,$responseId,$model,$usage['input_tokens'],$usage['cached_tokens'],$usage['output_tokens'],$result?json_encode($result,JSON_THROW_ON_ERROR):null,$error!==''?substr($error,0,80):null,$terminal?gmdate('Y-m-d H:i:s'):null,$id]);
  if($state==='succeeded' && $op['feature']!=='handwriting_extract')foreach($result['findings'] as $f)$pdo->prepare('INSERT INTO writing_findings(id,operation_id,version_id,code,severity,excerpt,explanation,hint) VALUES(?,?,?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$id,$op['version_id'],$f['code'],$f['severity'],$f['excerpt'],$f['explanation'],$f['hint']]);
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_ai_execute(PDO $pdo,string $id,?callable $testTransport=null,bool $featureAllowed=true): void {
 $q=$pdo->prepare('SELECT feature FROM ai_operations WHERE id=?');$q->execute([$id]);if(in_array($q->fetchColumn(),['handwriting','handwriting_extract'],true))throw new LogicException('Use the confirmation-bound handwriting workflow.');
 if($testTransport && (getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test'))throw new LogicException('Test transport is unavailable.');
 $allowed=$featureAllowed && ($testTransport!==null || (cssv_ai_configuration()['configured'] && function_exists('curl_init')));
 $op=cssv_ai_start($pdo,$id,$allowed);if(!$op)return;
 try {
  $v=cssv_learning_version($pdo,$op['version_id'],$op['user_id']);
  $response=$testTransport ? $testTransport($op,$v['text']) : cssv_ai_openai_request($op,$v['text']);
 }catch(CssvAiRejected $e){cssv_ai_finish($pdo,$id,'failed',null,null,$e->getMessage());return;}
 catch(Throwable){cssv_ai_finish($pdo,$id,'unknown',null,null,'provider_outcome_unknown');return;}
 if(!in_array($response['status'] ?? null,['completed','failed','incomplete','cancelled'],true)){cssv_ai_finish($pdo,$id,'unknown',$response,null,'provider_outcome_unknown');return;}
 try {$result=cssv_writing_result(cssv_ai_response_result($response),$v['text']);}
 catch(Throwable){cssv_ai_finish($pdo,$id,'failed',$response,null,'feedback_validation_failed');return;}
 cssv_ai_finish($pdo,$id,'succeeded',$response,$result);
}

/** Conservative recovery: never re-dispatch or release an unknown billed outcome. */
function cssv_ai_sweep(PDO $pdo, ?DateTimeImmutable $now=null): array {
 $now ??=new DateTimeImmutable('now',new DateTimeZone('UTC'));
 $cutoff=$now->modify('-5 minutes')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
 $q=$pdo->prepare("SELECT id FROM ai_operations WHERE state IN ('reserved','in_flight') AND created_at<? ORDER BY created_at LIMIT 100");$q->execute([$cutoff]);$ids=$q->fetchAll(PDO::FETCH_COLUMN);$counts=['released'=>0,'unknown'=>0];
 foreach($ids as $id){
  $pdo->beginTransaction();
  try{
   $op=cssv_ai_operation_lock($pdo,$id);
   if($op['state']==='reserved'){
    $pdo->prepare("UPDATE ai_operations SET state='failed',accounting='released',error_code='not_dispatched',completed_at=NOW(6) WHERE id=?")->execute([$id]);
    cssv_ai_release_reservation($pdo,$op,0);$counts['released']++;
   }elseif($op['state']==='in_flight' && $op['provider_started_at']<$cutoff){
    $pdo->prepare("UPDATE ai_operations SET state='unknown',error_code='provider_outcome_unknown' WHERE id=?")->execute([$id]);$counts['unknown']++;
   }
   $pdo->commit();
  }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 }return $counts;
}
