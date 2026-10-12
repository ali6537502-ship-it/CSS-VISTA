<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_skills_ai.php';
$pdo=cssv_db();cssv_skills_ensure($pdo);$action=$argv[1]??'';
if($action==='config'){
 $pdo->exec("DELETE FROM login_security_events WHERE event_type='skills_write'");
 $path=getenv('CSSV_CONFIG_FILE');if(!$path||!str_starts_with($path,'/tmp/cssv-pro-private/'))throw new RuntimeException('Disposable private configuration required.');
 $config=is_file($path)?require $path:[];$on=($argv[2]??'off')==='on';
 $config=array_merge($config,[
 'CSSV_AI_MODEL'=>$argv[4]??'TEST-only-model','CSSV_AI_ENABLED'=>$on?'1':'0','CSSV_AI_APPROVED'=>'1','CSSV_AI_MODEL_VERIFIED'=>'1','CSSV_OPENAI_API_KEY'=>'TEST-ONLY-NO-PROVIDER-NETWORK','CSSV_SKILLS_AI_ENABLED'=>$on?'1':'0','CSSV_SKILLS_POLICY_VERSION'=>'TEST-skills-v1','CSSV_SKILLS_PROCESSING_NOTICE'=>'TEST ONLY: synthetic isolated feedback exercises persistence and accounting; no real provider receives this writing.'.($argv[3]??''),'CSSV_AI_LIMIT_ARGUMENTATION'=>'2','CSSV_AI_LIMIT_ANALYSIS'=>'2','CSSV_AI_LIMIT_ESSAY'=>'2','CSSV_AI_LIMIT_SENTENCE'=>'3']);
 file_put_contents($path,"<?php\nreturn ".var_export($config,true).";\n");chmod($path,0600);
}elseif($action==='reserve'){
 try{echo json_encode(['id'=>cssv_skills_ai_reserve($pdo,$argv[2],json_decode($argv[3],true,32,JSON_THROW_ON_ERROR))],JSON_THROW_ON_ERROR);}catch(Throwable $e){echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()],JSON_THROW_ON_ERROR);}
}elseif(in_array($action,['normalize-workspace','normalize-operation','normalize-topic'],true)){
 $table=$action==='normalize-workspace'?'skills_workspaces':($action==='normalize-topic'?'pro_topic_versions':'skills_ai_inputs');$column=$action==='normalize-workspace'?'source_snapshot':($action==='normalize-topic'?'content':'input');$key=$action==='normalize-operation'?'operation_id':'id';
 $q=$pdo->prepare("SELECT $column FROM $table WHERE $key=?");$q->execute([$argv[2]]);$raw=$q->fetchColumn();if(!$raw)throw new RuntimeException('Synthetic snapshot not found.');
 $sort=static function(mixed $v)use(&$sort):mixed{if(!is_array($v))return $v;if(!array_is_list($v))ksort($v);foreach($v as &$child)$child=$sort($child);unset($child);return $v;};
 $pdo->prepare("UPDATE $table SET $column=? WHERE $key=?")->execute([json_encode($sort(json_decode($raw,true,64,JSON_THROW_ON_ERROR)),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$argv[2]]);
}elseif($action==='input-stage'){
 $q=$pdo->prepare('SELECT input FROM skills_ai_inputs WHERE operation_id=?');$q->execute([$argv[2]]);$input=json_decode((string)$q->fetchColumn(),true,64,JSON_THROW_ON_ERROR);echo $input['stage'];
}elseif($action==='snapshot'){
 $q=$pdo->prepare('SELECT feature,used,reserved,accepted,provider_calls FROM ai_daily_usage WHERE user_id=?');$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);
}elseif($action==='tie-linked'){
 $user=cssv_pro_id($argv[2]??null);$parent=cssv_skills_workspace($pdo,$user,cssv_pro_id($argv[3]??null));
 $q=$pdo->prepare("UPDATE skills_workspaces SET updated_at='2026-01-01 00:00:00.000000' WHERE user_id=? AND parent_id=?");$q->execute([$user,$parent['id']]);
}else throw new RuntimeException('Unknown fixture action.');
