<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_expression.php';
$pdo=cssv_db();cssv_handwriting_ensure($pdo);$action=$argv[1]??'';
if($action==='config'){
 $pdo->exec("DELETE FROM login_security_events WHERE event_type='expression_write'");
 $path=getenv('CSSV_CONFIG_FILE');if(!$path || !str_starts_with($path,'/tmp/cssv-pro-private/'))throw new RuntimeException('Disposable private configuration required.');
 $config=is_file($path)?require $path:[];$on=($argv[2]??'off')==='on';$config=array_merge($config,['CSSV_AI_ENABLED'=>$on?'1':'0','CSSV_AI_APPROVED'=>'1','CSSV_AI_MODEL_VERIFIED'=>'1','CSSV_OPENAI_API_KEY'=>'TEST-ONLY-NO-PROVIDER-NETWORK','CSSV_EXPRESSION_ENABLED'=>$on?'1':'0','CSSV_AI_LIMIT_PARAGRAPH'=>$argv[3]??'2','CSSV_AI_LIMIT_SENTENCE'=>'3','CSSV_EXPRESSION_POLICY_VERSION'=>$argv[4]??'TEST-expression-v1','CSSV_EXPRESSION_PROCESSING_NOTICE'=>'TEST ONLY: this disposable environment uses explicitly labelled synthetic feedback. No text is sent to a real external provider.']);
 file_put_contents($path,"<?php\nreturn ".var_export($config,true).";\n");chmod($path,0600);
}elseif($action==='reserve'){
 $body=json_decode($argv[3],true,32,JSON_THROW_ON_ERROR);try{echo json_encode(['id'=>cssv_expression_reserve($pdo,$argv[2],$body,new DateTimeImmutable($argv[4]??'now'))],JSON_THROW_ON_ERROR);}catch(Throwable $e){echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()],JSON_THROW_ON_ERROR);}
}elseif($action==='snapshot'){
 $q=$pdo->prepare('SELECT feature,bucket_date,used,reserved,accepted,provider_calls FROM ai_daily_usage WHERE user_id=?');$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);
}elseif($action==='age-evidence'){
 $pdo->prepare('UPDATE ai_operations SET created_at=DATE_SUB(NOW(6),INTERVAL 31 DAY) WHERE user_id=?')->execute([$argv[2]]);
}elseif($action==='bind-handwriting'){
 $v=cssv_learning_version($pdo,$argv[4],$argv[2]);if($v['writing_id']!==$argv[3])throw new RuntimeException('Owned fixture version required.');
 $pdo->prepare("INSERT INTO handwriting_pages(id,user_id,attempt_id,title,state,image_sha256,image_bytes,image_width,image_height,image_expires_at,image_deleted_at,policy_version,writing_id,confirmed_text_version_id) VALUES(?,?,?,'TEST ONLY confirmed handwriting fixture','confirmed',?,1,320,320,NOW(6),NOW(6),'TEST-only',?,?)")->execute([cssv_uuid_v4(),$argv[2],$v['attempt_id'],hash('sha256','TEST ONLY image'),$argv[3],$argv[4]]);
}elseif($action==='execute'){require __DIR__.'/transport.php';cssv_expression_execute($pdo,$argv[2]);}
else throw new RuntimeException('Unknown fixture action.');
