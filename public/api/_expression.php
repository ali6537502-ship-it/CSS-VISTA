<?php
declare(strict_types=1);
require_once __DIR__.'/_handwriting.php';require_once __DIR__.'/_expression_core.php';
function cssv_expression_configuration(): array {
 $notice=cssv_env('CSSV_EXPRESSION_PROCESSING_NOTICE','');$policy=cssv_env('CSSV_EXPRESSION_POLICY_VERSION','');
 $policyValid=is_string($policy) && preg_match('/^[a-zA-Z0-9._-]{1,80}$/D',$policy)===1;
 $noticeValid=is_string($notice) && mb_check_encoding($notice,'UTF-8') && mb_strlen($notice)>=30 && mb_strlen($notice)<=3000;
 return ['enabled'=>cssv_env('CSSV_EXPRESSION_ENABLED','0')==='1' && cssv_ai_configuration()['configured'] && function_exists('curl_init') && $policyValid && $noticeValid && (cssv_ai_limit('paragraph')>0 || cssv_ai_limit('sentence')>0),'policy_version'=>$policyValid?$policy:null,'processing_notice'=>$noticeValid?$notice:null,'max_words'=>['paragraph'=>450,'sentence'=>80],'max_characters'=>6000];
}
function cssv_expression_version(PDO $pdo,string $id,string $user): array {
 $v=cssv_learning_version($pdo,$id,$user);if(!in_array($v['kind'],['sentence','paragraph'],true))throw new InvalidArgumentException('Expression Lab supports sentences and single paragraphs.');
 $q=$pdo->prepare('SELECT id FROM handwriting_pages WHERE writing_id=? LIMIT 1');$q->execute([$v['writing_id']]);if($q->fetchColumn())throw new DomainException('Open the handwriting workspace for this page and its confirmed wording.');
 return $v;
}
function cssv_expression_evaluated_version(PDO $pdo,string $id,string $user): array {
 $v=cssv_expression_version($pdo,$id,$user);
 $q=$pdo->prepare("SELECT id FROM ai_operations WHERE user_id=? AND version_id=? AND feature=? AND state='succeeded' ORDER BY created_at DESC,id DESC LIMIT 1");$q->execute([$user,$id,$v['kind']]);$operation=$q->fetchColumn();
 $v['feedback']=$operation?cssv_expression_feedback(cssv_ai_owned_operation($pdo,$operation,$user)['result']):null;return $v;
}
function cssv_expression_reserve(PDO $pdo,string $user,array $body,?DateTimeImmutable $now=null): string {
 cssv_pro_fields($body,['action','request_id','version_id','policy_version','accepted']);
 if(($body['action']??null)!=='evaluate' || ($body['accepted']??null)!==true)throw new InvalidArgumentException('Review and accept processing before requesting feedback.');
 $policy=$body['policy_version']??null;if(!is_string($policy) || !preg_match('/^[a-zA-Z0-9._-]{1,80}$/D',$policy))throw new InvalidArgumentException('Review the current processing notice.');
 $request=cssv_pro_id($body['request_id']??null);$id=cssv_pro_id($body['version_id']??null);$v=cssv_expression_version($pdo,$id,$user);$config=cssv_expression_configuration();
 $q=$pdo->prepare('SELECT payload_hash FROM ai_operations WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);$prior=$q->fetchColumn();
 if(!$prior){
  if(!$config['enabled'] || cssv_ai_limit($v['kind'])===0)throw new LogicException('Expression feedback is not open yet.');
  if(($body['policy_version']??null)!==$config['policy_version'])throw new DomainException('The processing notice changed. Refresh and review it before continuing.');
  if(mb_strlen($v['text'])>$config['max_characters'] || preg_match('/\n\s*\n/u',$v['text']))throw new InvalidArgumentException('Use one short expression or a single paragraph within the displayed limits.');
 }
 return cssv_ai_reserve($pdo,$user,$request,$v['kind'],$id,$now,$policy);
}
function cssv_expression_execute(PDO $pdo,string $id): void {
 $transport=$GLOBALS['CSSV_TEST_EXPRESSION_TRANSPORT']??null;
 cssv_ai_execute($pdo,$id,$transport,cssv_expression_configuration()['enabled']);
}
function cssv_expression_overview(PDO $pdo,string $user,int $offset): array {
 $q=$pdo->prepare("SELECT w.id,w.attempt_id,w.kind,w.title,w.version,w.updated_at FROM writing_records w WHERE w.user_id=? AND w.kind IN ('sentence','paragraph') AND NOT EXISTS(SELECT 1 FROM handwriting_pages h WHERE h.writing_id=w.id) ORDER BY w.updated_at DESC,w.id LIMIT 51 OFFSET ".$offset);$q->execute([$user]);$writing=$q->fetchAll();$more=count($writing)>50;$writing=array_slice($writing,0,50);foreach($writing as &$w){$w['version']=(int)$w['version'];$w['updated_at']=cssv_pro_iso($w['updated_at']);}unset($w);
 $q=$pdo->prepare('SELECT id,target_year FROM preparation_attempts WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 50');$q->execute([$user]);$attempts=$q->fetchAll();
 $q=$pdo->prepare("SELECT JSON_EXTRACT(o.result,'$.findings[*].code') AS finding_codes,o.created_at,v.text_hash,v.writing_id,w.kind FROM ai_operations o JOIN writing_versions v ON v.id=o.version_id JOIN writing_records w ON w.id=v.writing_id WHERE o.user_id=? AND w.user_id=? AND o.state='succeeded' AND o.feature IN ('paragraph','sentence','handwriting','precis') AND o.created_at>=DATE_SUB(NOW(6),INTERVAL 30 DAY) ORDER BY o.created_at DESC,o.id DESC LIMIT 200");$q->execute([$user,$user]);$rows=$q->fetchAll();foreach($rows as &$row){$codes=json_decode($row['finding_codes']?:'[]',true,32,JSON_THROW_ON_ERROR);$row['result']=['findings'=>array_map(fn($code)=>['code'=>$code],$codes)];unset($row['finding_codes']);$row['created_at']=cssv_pro_iso($row['created_at']);}unset($row);
 return ['writing'=>$writing,'has_more'=>$more,'attempts'=>$attempts,'profile'=>cssv_expression_profile($rows),'skills'=>cssv_expression_skills()];
}

function cssv_expression_problem(Throwable $e): never {
 if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'expression_invalid');
 if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'expression_not_found');
 if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'expression_conflict');
 if($e instanceof LogicException)cssv_fail($e->getMessage(),503,'expression_unavailable');
 error_log('CSSV Expression request failed: '.get_class($e));cssv_fail('Writing feedback could not be updated. Refresh the saved status before trying again.',503,'expression_unavailable');
}
