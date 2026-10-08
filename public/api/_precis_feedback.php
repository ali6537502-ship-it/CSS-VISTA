<?php
declare(strict_types=1);
require_once __DIR__.'/_precis.php';require_once __DIR__.'/_ai.php';require_once __DIR__.'/_precis_feedback_core.php';require_once __DIR__.'/_precis_feedback_schema.php';
function cssv_precis_feedback_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_precis_ensure($pdo);$pdo->exec(cssv_precis_feedback_schema_statements()[0]);$ready=true;
}
function cssv_precis_feedback_configuration(): array {
 $notice=cssv_env('CSSV_PRECIS_PROCESSING_NOTICE','');$policy=cssv_env('CSSV_PRECIS_POLICY_VERSION','');
 $policyValid=is_string($policy)&&preg_match('/^[a-zA-Z0-9._-]{1,80}$/D',$policy)===1;$noticeValid=is_string($notice)&&mb_check_encoding($notice,'UTF-8')&&mb_strlen($notice)>=30&&mb_strlen($notice)<=3000;
 return ['enabled'=>cssv_env('CSSV_PRECIS_ENABLED','0')==='1'&&cssv_ai_configuration()['configured']&&function_exists('curl_init')&&$policyValid&&$noticeValid&&cssv_ai_limit('precis')>0,'policy_version'=>$policyValid?$policy:null,'processing_notice'=>$noticeValid?$notice:null,'max_source_words'=>2000,'max_draft_words'=>700,'max_draft_characters'=>6000];
}
function cssv_precis_feedback_input(PDO $pdo,string $user,string $version): array {
 $v=cssv_learning_version($pdo,$version,$user);$d=cssv_precis_detail($pdo,$user,$v['writing_id'],$version);if(!$d['context'])throw new InvalidArgumentException('Save a Précis Lab version with its title and source before evaluation.');
 $config=cssv_precis_feedback_configuration();if(cssv_learning_words($d['source']['text'])>$config['max_source_words']||$v['word_count']>$config['max_draft_words']||mb_strlen($v['text'])>$config['max_draft_characters']||preg_match('/\n\s*\n/u',$v['text']))throw new InvalidArgumentException('Use an original of at most 2,000 words and one connected précis paragraph of at most 700 words / 6,000 characters.');
 $q=$pdo->prepare("SELECT DISTINCT f.code FROM writing_findings f JOIN ai_operations o ON o.id=f.operation_id JOIN writing_versions v ON v.id=f.version_id JOIN writing_records w ON w.id=v.writing_id WHERE o.user_id=? AND w.user_id=? AND w.attempt_id=? AND o.state='succeeded' AND o.created_at>=DATE_SUB(NOW(6),INTERVAL 30 DAY) ORDER BY f.code LIMIT 16");$q->execute([$user,$user,$v['attempt_id']]);
 return ['original'=>$d['source']['text'],'attribution'=>$d['source']['source'],'source_id'=>$d['source']['id'],'explicit_word_limit'=>$d['source']['limit'],'title'=>$d['context']['title'],'central_idea_note'=>$d['context']['scratch']['central_idea'],'student_text'=>$v['text'],'version_id'=>$v['id'],'source_hash'=>hash('sha256',$d['source']['text']),'text_hash'=>$v['text_hash'],'rubric'=>cssv_precis_evaluation_rubric(),'weakness_codes'=>$q->fetchAll(PDO::FETCH_COLUMN)];
}
function cssv_precis_feedback_reserve(PDO $pdo,string $user,array $body,?DateTimeImmutable $now=null): string {
 cssv_pro_fields($body,['action','request_id','version_id','policy_version','accepted']);if(($body['action']??null)!=='evaluate'||($body['accepted']??null)!==true)throw new InvalidArgumentException('Review and accept the processing notice first.');
 $request=cssv_pro_id($body['request_id']??null);$version=cssv_pro_id($body['version_id']??null);$policy=$body['policy_version']??null;if(!is_string($policy)||!preg_match('/^[a-zA-Z0-9._-]{1,80}$/D',$policy))throw new InvalidArgumentException('Review the current processing notice.');
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);$v=cssv_learning_version($pdo,$version,$user);cssv_precis_detail($pdo,$user,$v['writing_id'],$version);
  $intent=hash('sha256',json_encode(['precis-evaluate-v1',$version,$v['text_hash'],$policy],JSON_THROW_ON_ERROR));
  $q=$pdo->prepare('SELECT id,payload_hash FROM ai_operations WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$intent))throw new DomainException('This feedback identity was used for different work or processing terms.');$pdo->commit();return $prior['id'];}
  if(!cssv_profile_status(cssv_profile_for_user($pdo,$user))['complete'])throw new DomainException('Complete your profile before new feedback.');
  if(cssv_pro_membership($pdo,$user)['status']!=='active')throw new DomainException('Active Pro access is required for new feedback.');$config=cssv_precis_feedback_configuration();if(!$config['enabled'])throw new LogicException('Personal Précis feedback is not open yet.');if($policy!==$config['policy_version'])throw new DomainException('The processing notice changed. Refresh and review it.');
  $q=$pdo->prepare("SELECT id FROM ai_operations WHERE user_id=? AND version_id=? AND feature='precis' AND state IN ('reserved','in_flight','unknown','succeeded') LIMIT 1");$q->execute([$user,$version]);if($q->fetchColumn())throw new DomainException('This saved version already has feedback or a pending request. Refresh its saved status.');
  $input=cssv_precis_feedback_input($pdo,$user,$version);$json=json_encode($input,JSON_THROW_ON_ERROR);$ai=cssv_ai_configuration();$ai['prompt_version']=$input['rubric']['version'];
  $id=cssv_ai_reserve_usage($pdo,$user,$request,$intent,'precis',$version,$ai,$now??new DateTimeImmutable('now',new DateTimeZone('UTC')));
  $pdo->prepare('INSERT INTO precis_evaluations(operation_id,input,input_hash) VALUES(?,?,?)')->execute([$id,$json,cssv_precis_input_hash($input)]);$pdo->commit();return $id;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_precis_feedback_snapshot(PDO $pdo,array $op): array {
 if($op['feature']!=='precis')throw new InvalidArgumentException('Choose a Précis feedback operation.');$q=$pdo->prepare('SELECT input,input_hash FROM precis_evaluations WHERE operation_id=?');$q->execute([$op['id']]);$r=$q->fetch();if(!$r)throw new LogicException('Saved Précis evaluation context is unavailable.');
 $input=json_decode($r['input'],true,32,JSON_THROW_ON_ERROR);if(!hash_equals($r['input_hash'],cssv_precis_input_hash($input)))throw new LogicException('Saved Précis evaluation context is unavailable.');
 $v=cssv_learning_version($pdo,$op['version_id'],$op['user_id']);if($input['version_id']!==$v['id']||!hash_equals($input['text_hash'],$v['text_hash'])||$input['student_text']!==$v['text']||!hash_equals($input['source_hash'],hash('sha256',$input['original']))||$input['rubric']['version']!==$op['prompt_version'])throw new LogicException('Saved feedback context does not match this version.');return $input;
}
function cssv_precis_feedback_settle(PDO $pdo,array $op,string $state,?array $result): ?array {
 return $state==='succeeded'?cssv_precis_feedback_result($result??[],cssv_precis_feedback_snapshot($pdo,$op)):$result;
}
function cssv_precis_feedback_execute(PDO $pdo,string $id): void {
 $q=$pdo->prepare('SELECT * FROM ai_operations WHERE id=?');$q->execute([$id]);$candidate=$q->fetch();if(!$candidate||$candidate['feature']!=='precis')throw new InvalidArgumentException('Choose a Précis feedback operation.');
 $transport=$GLOBALS['CSSV_TEST_PRECIS_TRANSPORT']??null;if($transport&&(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test'))throw new LogicException('Test transport is unavailable.');
 $valid=true;try{$input=cssv_precis_feedback_snapshot($pdo,$candidate);}catch(Throwable){$valid=false;}
 $op=cssv_ai_start($pdo,$id,$valid&&cssv_precis_feedback_configuration()['enabled'], 'cssv_precis_feedback_settle');if(!$op)return;
 try{$response=$transport?$transport($op,$input):cssv_ai_openai_send(cssv_precis_feedback_payload($op,$input));}
 catch(CssvAiRejected $e){cssv_ai_finish($pdo,$id,'failed',null,null,$e->getMessage(),'cssv_precis_feedback_settle');return;}
 catch(Throwable){cssv_ai_finish($pdo,$id,'unknown',null,null,'provider_outcome_unknown','cssv_precis_feedback_settle');return;}
 if(!in_array($response['status']??null,['completed','failed','incomplete','cancelled'],true)){cssv_ai_finish($pdo,$id,'unknown',$response,null,'provider_outcome_unknown','cssv_precis_feedback_settle');return;}
 try{$result=cssv_precis_feedback_result(cssv_ai_response_result($response),$input);}catch(Throwable){cssv_ai_finish($pdo,$id,'failed',$response,null,'feedback_validation_failed','cssv_precis_feedback_settle');return;}
 cssv_ai_finish($pdo,$id,'succeeded',$response,$result,'','cssv_precis_feedback_settle');
}
function cssv_precis_feedback_version(PDO $pdo,string $user,string $version): array {
 $q=$pdo->prepare("SELECT id FROM ai_operations WHERE user_id=? AND version_id=? AND feature='precis' ORDER BY created_at DESC,id DESC LIMIT 20");$q->execute([$user,$version]);$ops=array_map(fn($id)=>cssv_ai_owned_operation($pdo,$id,$user),$q->fetchAll(PDO::FETCH_COLUMN));$feedback=null;
 foreach($ops as $op)if($op['state']==='succeeded'){$feedback=$op['result'];break;}return ['feedback'=>$feedback,'operations'=>$ops];
}
function cssv_precis_feedback_meta(PDO $pdo,string $user): array {
 $now=new DateTimeImmutable('now',new DateTimeZone('Asia/Karachi'));$date=$now->format('Y-m-d');$q=$pdo->prepare("SELECT used,reserved,accepted FROM ai_daily_usage WHERE user_id=? AND feature='precis' AND bucket_date=?");$q->execute([$user,$date]);$row=$q->fetch()?:[];
 return ['grammar_skills'=>cssv_expression_skills(),'configuration'=>cssv_precis_feedback_configuration(),'date'=>$date,'reset_at'=>$now->modify('tomorrow')->setTime(0,0)->format(DateTimeInterface::ATOM),'usage'=>['limit'=>cssv_ai_limit('precis'),'used'=>(int)($row['used']??0),'reserved'=>(int)($row['reserved']??0),'accepted'=>(int)($row['accepted']??0)]];
}
function cssv_precis_feedback_profile(PDO $pdo,string $user,string $attempt): array {
 cssv_learning_attempt($pdo,$attempt,$user);$q=$pdo->prepare("SELECT JSON_UNQUOTE(JSON_EXTRACT(e.input,'$.source_hash')) source_hash,JSON_EXTRACT(o.result,'$.skills') skills FROM ai_operations o JOIN precis_evaluations e ON e.operation_id=o.id JOIN writing_versions v ON v.id=o.version_id JOIN writing_records w ON w.id=v.writing_id WHERE o.user_id=? AND w.user_id=? AND w.attempt_id=? AND o.feature='precis' AND o.state='succeeded' AND o.created_at>=DATE_SUB(NOW(6),INTERVAL 30 DAY) ORDER BY o.created_at DESC,o.id DESC LIMIT 200");$q->execute([$user,$user,$attempt]);$rows=$q->fetchAll();foreach($rows as &$r)$r['skills']=json_decode($r['skills'],true,32,JSON_THROW_ON_ERROR);unset($r);return cssv_precis_writing_profile($rows);
}
