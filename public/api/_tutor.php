<?php
declare(strict_types=1);
require_once __DIR__.'/_handwriting.php';
require_once __DIR__.'/_tutor_context.php';
require_once __DIR__.'/_tutor_schema.php';
function cssv_tutor_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_handwriting_ensure($pdo);ca_ensure_schema($pdo);
 $pdo->exec(cssv_tutor_schema_statements()[0]);$ready=true;
}
function cssv_tutor_configuration(): array {
 $notice=cssv_env('CSSV_TUTOR_PROCESSING_NOTICE','');$policy=cssv_env('CSSV_TUTOR_POLICY_VERSION','');
 $valid=is_string($policy)&&preg_match('/^[a-zA-Z0-9._-]{1,80}$/D',$policy)&&is_string($notice)&&mb_check_encoding($notice,'UTF-8')&&mb_strlen($notice)>=30&&mb_strlen($notice)<=3000;
 return ['enabled'=>cssv_env('CSSV_TUTOR_ENABLED','0')==='1'&&cssv_ai_configuration()['configured']&&function_exists('curl_init')&&$valid,'policy_version'=>$valid?$policy:null,'policy_hash'=>$valid?hash('sha256',$policy."\n".$notice):null,'processing_notice'=>$valid?$notice:null,'max_question_characters'=>1000,'max_question_words'=>150];
}
function cssv_tutor_meta(PDO $pdo,string $user): array {
 $now=new DateTimeImmutable('now',new DateTimeZone('Asia/Karachi'));$date=$now->format('Y-m-d');$q=$pdo->prepare("SELECT feature,used,reserved,accepted FROM ai_daily_usage WHERE user_id=? AND bucket_date=? AND feature IN ('tutor','maths','current_affairs')");$q->execute([$user,$date]);$rows=array_column($q->fetchAll(),null,'feature');$usage=[];
 foreach(['tutor','maths','current_affairs'] as $feature){$r=$rows[$feature]??[];$usage[$feature]=['limit'=>cssv_ai_limit($feature),'used'=>(int)($r['used']??0),'reserved'=>(int)($r['reserved']??0),'accepted'=>(int)($r['accepted']??0)];}
 return ['configuration'=>cssv_tutor_configuration(),'active'=>cssv_pro_membership($pdo,$user)['status']==='active','date'=>$date,'reset_at'=>$now->modify('tomorrow')->setTime(0,0)->format(DateTimeInterface::ATOM),'usage'=>$usage];
}
function cssv_tutor_snapshot(PDO $pdo,array $op): array {
 if(!in_array($op['feature'],['tutor','maths','current_affairs'],true))throw new InvalidArgumentException('Choose an Ask VISTA operation.');
 $q=$pdo->prepare('SELECT t.*,o.prompt_version FROM tutor_requests t JOIN ai_operations o ON o.id=t.operation_id WHERE t.operation_id=? AND t.user_id=?');$q->execute([$op['id'],$op['user_id']]);$row=$q->fetch();if(!$row)throw new OutOfBoundsException('Tutor context not found.');
 $input=json_decode($row['input'],true,32,JSON_THROW_ON_ERROR);
 if(!hash_equals($row['input_hash'],cssv_tutor_hash($input))||$input['question']!==$row['question']||$input['intent']!==$row['intent']||$input['context']['id']!==$row['context_id']||$input['context']['feature']!==$op['feature']||$input['attempt']['id']!==$row['attempt_id']||$input['parent_id']!==$row['parent_id']||$input['prompt_version']!==$row['prompt_version'])throw new LogicException('Saved tutor context is inconsistent.');
 return $input;
}
function cssv_tutor_reserve(PDO $pdo,string $user,array $body,?DateTimeImmutable $now=null): string {
 cssv_pro_fields($body,['action','request_id','attempt_id','context_id','context_hash','parent_id','intent','question','policy_version','policy_hash','accepted']);
 if(($body['action']??null)!=='ask'||($body['accepted']??null)!==true)throw new InvalidArgumentException('Review and accept processing before asking.');
 $request=cssv_pro_id($body['request_id']??null);$attempt=cssv_pro_id($body['attempt_id']??null);$parent=isset($body['parent_id'])?cssv_pro_id($body['parent_id']):null;
 $context=cssv_learning_string($body['context_id']??null,180,'learning context');$question=cssv_tutor_question($body['question']??null);$intent=$body['intent']??null;
 if(!in_array($intent,['explain','misconception','hint','check_understanding'],true))throw new InvalidArgumentException('Choose conceptual help, misconception, hint or understanding check.');
 $policy=cssv_learning_string($body['policy_version']??null,80,'processing version');
 foreach(['policy_hash','context_hash'] as $key)if(!is_string($body[$key]??null)||!preg_match('/^[a-f0-9]{64}$/D',$body[$key]))throw new InvalidArgumentException('Refresh and review the selected source and processing notice.');
 $hash=cssv_tutor_hash(['scope'=>'ask-vista-v1','attempt'=>$attempt,'context'=>$context,'context_hash'=>$body['context_hash'],'parent'=>$parent,'intent'=>$intent,'question'=>$question,'policy'=>$policy,'policy_hash'=>$body['policy_hash']]);
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);cssv_learning_attempt($pdo,$attempt,$user);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
  if($receipt=$q->fetch()){if(!hash_equals($receipt['payload_hash'],$hash))throw new DomainException('This request was already used for different work or terms.');$id=json_decode($receipt['result'],true,16,JSON_THROW_ON_ERROR)['operation_id'];cssv_tutor_owned($pdo,$user,$id);$pdo->commit();return $id;}
  $q=$pdo->prepare('SELECT id FROM ai_operations WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);if($q->fetchColumn())throw new DomainException('This request identity belongs to another AI action.');
  if(!cssv_profile_status(cssv_profile_for_user($pdo,$user))['complete'])throw new DomainException('Complete your profile before new tutoring.');
  if(cssv_pro_membership($pdo,$user)['status']!=='active')throw new DomainException('Active Pro access is required for new tutoring.');
  $config=cssv_tutor_configuration();if(!$config['enabled'])throw new LogicException('Ask VISTA assistance is not open yet.');
  if($policy!==$config['policy_version']||!hash_equals($config['policy_hash'],$body['policy_hash']))throw new DomainException('The processing notice changed. Refresh and review it.');
  $selected=cssv_tutor_context($pdo,$context);if(!hash_equals(cssv_tutor_hash($selected),$body['context_hash']))throw new DomainException('The learning source changed. Refresh it before asking.');
  if(cssv_ai_limit($selected['feature'])===0)throw new LogicException('Assistance for this learning area is not open yet.');
  $previous=null;
  if($parent){$prior=cssv_tutor_owned($pdo,$user,$parent);if($prior['attempt_id']!==$attempt||$prior['context']['id']!==$context||$prior['operation']['state']!=='succeeded')throw new DomainException('Follow up a completed exchange from the same attempt and source.');if(!hash_equals(cssv_tutor_hash($prior['context']),cssv_tutor_hash($selected)))throw new DomainException('The source changed since this exchange. Start a fresh question.');$previous=['question'=>$prior['question'],'reply'=>$prior['operation']['result']];}
  $q=$pdo->prepare("SELECT t.operation_id FROM tutor_requests t JOIN ai_operations o ON o.id=t.operation_id WHERE t.user_id=? AND t.intent_hash=? AND o.state IN ('reserved','in_flight','unknown','succeeded') ORDER BY t.created_at DESC LIMIT 1");$q->execute([$user,$hash]);$id=$q->fetchColumn();
  if(!$id){
   $a=cssv_learning_attempt($pdo,$attempt,$user);$input=['prompt_version'=>CSSV_TUTOR_PROMPT_VERSION,'context'=>$selected,'question'=>$question,'intent'=>$intent,'parent_id'=>$parent,'previous'=>$previous,'attempt'=>['id'=>$a['id'],'stage'=>$a['stage'],'daily_minutes'=>$a['daily_minutes']],'policy_version'=>$policy,'policy_hash'=>$body['policy_hash']];
   $ai=cssv_ai_configuration();$ai['prompt_version']=CSSV_TUTOR_PROMPT_VERSION;$id=cssv_ai_reserve_usage($pdo,$user,$request,$hash,$selected['feature'],null,$ai,$now??new DateTimeImmutable('now',new DateTimeZone('UTC')));
   $pdo->prepare('INSERT INTO tutor_requests(operation_id,user_id,attempt_id,context_id,parent_id,intent,question,intent_hash,input,input_hash) VALUES(?,?,?,?,?,?,?,?,?,?)')->execute([$id,$user,$attempt,$context,$parent,$intent,$question,$hash,json_encode($input,JSON_THROW_ON_ERROR),cssv_tutor_hash($input)]);
  }
  $pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode(['operation_id'=>$id],JSON_THROW_ON_ERROR)]);
  $pdo->commit();return $id;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_tutor_settle(PDO $pdo,array $op,string $state,?array $result): ?array {return $state==='succeeded'?cssv_tutor_result($result??[],cssv_tutor_snapshot($pdo,$op)):$result;}
function cssv_tutor_execute(PDO $pdo,string $id): void {
 $q=$pdo->prepare('SELECT * FROM ai_operations WHERE id=?');$q->execute([$id]);$candidate=$q->fetch();if(!$candidate||!in_array($candidate['feature'],['tutor','maths','current_affairs'],true))throw new InvalidArgumentException('Choose an Ask VISTA operation.');
 $transport=$GLOBALS['CSSV_TEST_TUTOR_TRANSPORT']??null;if($transport&&(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test'))throw new LogicException('Test transport is unavailable.');
 $valid=true;try{$input=cssv_tutor_snapshot($pdo,$candidate);}catch(Throwable){$valid=false;}
 $allowed=$valid&&$candidate['prompt_version']===CSSV_TUTOR_PROMPT_VERSION&&cssv_tutor_configuration()['enabled']&&cssv_ai_limit($candidate['feature'])>0;
 $op=cssv_ai_start($pdo,$id,$allowed,'cssv_tutor_settle');if(!$op)return;
 try{$response=$transport?$transport($op,$input):cssv_ai_openai_send(cssv_tutor_payload($op,$input));}
 catch(CssvAiRejected $e){cssv_ai_finish($pdo,$id,'failed',null,null,$e->getMessage(),'cssv_tutor_settle');return;}
 catch(Throwable){cssv_ai_finish($pdo,$id,'unknown',null,null,'provider_outcome_unknown','cssv_tutor_settle');return;}
 if(!in_array($response['status']??null,['completed','failed','incomplete','cancelled'],true)){cssv_ai_finish($pdo,$id,'unknown',$response,null,'provider_outcome_unknown','cssv_tutor_settle');return;}
 try{$result=cssv_tutor_result(cssv_ai_response_result($response),$input);}catch(Throwable){cssv_ai_finish($pdo,$id,'failed',$response,null,'tutor_validation_failed','cssv_tutor_settle');return;}
 cssv_ai_finish($pdo,$id,'succeeded',$response,$result,'','cssv_tutor_settle');
}
function cssv_tutor_owned(PDO $pdo,string $user,string $id): array {
 $op=cssv_ai_owned_operation($pdo,$id,$user);$input=cssv_tutor_snapshot($pdo,[...$op,'user_id'=>$user,'prompt_version'=>CSSV_TUTOR_PROMPT_VERSION]);
 $resume=null;if($op['state']==='reserved'){$q=$pdo->prepare('SELECT request_id FROM ai_operations WHERE id=? AND user_id=?');$q->execute([$id,$user]);$resume=['action'=>'ask','request_id'=>$q->fetchColumn(),'attempt_id'=>$input['attempt']['id'],'context_id'=>$input['context']['id'],'context_hash'=>cssv_tutor_hash($input['context']),'intent'=>$input['intent'],'question'=>$input['question'],'policy_version'=>$input['policy_version'],'policy_hash'=>$input['policy_hash'],'accepted'=>true];if($input['parent_id']!==null)$resume['parent_id']=$input['parent_id'];}
 return ['operation'=>$op,'context'=>$input['context'],'question'=>$input['question'],'intent'=>$input['intent'],'attempt_id'=>$input['attempt']['id'],'parent_id'=>$input['parent_id'],'resume_body'=>$resume];
}
