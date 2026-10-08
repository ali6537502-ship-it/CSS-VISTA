<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_precis_feedback.php';
$pdo=cssv_db();cssv_precis_feedback_ensure($pdo);$action=$argv[1]??'';
if($action==='config'){
 $pdo->exec("DELETE FROM login_security_events WHERE event_type='precis_feedback'");$path=getenv('CSSV_CONFIG_FILE');if(!$path||!str_starts_with($path,'/tmp/cssv-pro-private/'))throw new RuntimeException('Disposable private configuration required.');
 $config=is_file($path)?require $path:[];$on=($argv[2]??'off')==='on';$config=array_merge($config,['CSSV_AI_ENABLED'=>$on?'1':'0','CSSV_AI_APPROVED'=>'1','CSSV_AI_MODEL_VERIFIED'=>'1','CSSV_OPENAI_API_KEY'=>'TEST-ONLY-NO-PROVIDER-NETWORK','CSSV_PRECIS_ENABLED'=>$on?'1':'0','CSSV_AI_LIMIT_PRECIS'=>$argv[3]??'2','CSSV_PRECIS_POLICY_VERSION'=>$argv[4]??'TEST-precis-v1','CSSV_PRECIS_PROCESSING_NOTICE'=>'TEST ONLY: this disposable environment returns labelled synthetic source-bound feedback. The original, title, central-idea note and draft are not sent to a real provider.']);
 file_put_contents($path,"<?php\nreturn ".var_export($config,true).";\n");chmod($path,0600);
}elseif($action==='reserve'){
 try{echo json_encode(['id'=>cssv_precis_feedback_reserve($pdo,$argv[2],json_decode($argv[3],true,32,JSON_THROW_ON_ERROR),new DateTimeImmutable($argv[4]??'now'))],JSON_THROW_ON_ERROR);}catch(Throwable $e){echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()],JSON_THROW_ON_ERROR);}
}elseif($action==='execute'){require __DIR__.'/feedback-transport.php';cssv_precis_feedback_execute($pdo,$argv[2]);}
elseif($action==='snapshot'){$q=$pdo->prepare("SELECT feature,bucket_date,used,reserved,accepted,provider_calls FROM ai_daily_usage WHERE user_id=? ORDER BY feature,bucket_date");$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);}
elseif($action==='input'){$op=$pdo->prepare('SELECT * FROM ai_operations WHERE id=?');$op->execute([$argv[2]]);echo json_encode(cssv_precis_feedback_snapshot($pdo,$op->fetch()),JSON_THROW_ON_ERROR);}
elseif($action==='normalize-json'){$q=$pdo->prepare('SELECT input FROM precis_evaluations WHERE operation_id=?');$q->execute([$argv[2]]);$input=json_decode($q->fetchColumn(),true,32,JSON_THROW_ON_ERROR);$sort=static function(mixed $v)use(&$sort):mixed{if(!is_array($v))return $v;if(!array_is_list($v))krsort($v);foreach($v as &$item)$item=$sort($item);unset($item);return $v;};$pdo->prepare('UPDATE precis_evaluations SET input=? WHERE operation_id=?')->execute([json_encode($sort($input),JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),$argv[2]]);}
elseif($action==='corrupt-input'){$pdo->prepare("UPDATE precis_evaluations SET input=JSON_SET(input,'$.title','TEST ONLY changed snapshot') WHERE operation_id=?")->execute([$argv[2]]);}
elseif($action==='generic-execute'){try{cssv_ai_execute($pdo,$argv[2]);echo 'UNEXPECTED';}catch(LogicException){echo 'blocked';}}
elseif($action==='age-evidence')$pdo->prepare("UPDATE ai_operations SET created_at=DATE_SUB(NOW(6),INTERVAL 31 DAY) WHERE user_id=? AND feature='precis'")->execute([$argv[2]]);
else throw new RuntimeException('Unknown fixture action.');
