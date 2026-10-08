<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable test database only.');
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_tutor.php';
$pdo=cssv_db();cssv_tutor_ensure($pdo);$action=$argv[1]??'';
if($action==='config'){
 $path=getenv('CSSV_CONFIG_FILE');if(!$path||!str_starts_with($path,'/tmp/cssv-pro-private/'))throw new RuntimeException('Disposable private configuration only.');
 $config=is_file($path)?require $path:[];$on=($argv[2]??'off')==='on';$config=array_merge($config,['CSSV_AI_ENABLED'=>$on?'1':'0','CSSV_AI_APPROVED'=>'1','CSSV_AI_MODEL_VERIFIED'=>'1','CSSV_OPENAI_API_KEY'=>'TEST-ONLY-NO-PROVIDER-NETWORK','CSSV_TUTOR_ENABLED'=>$on?'1':'0','CSSV_AI_LIMIT_TUTOR'=>$argv[3]??'20','CSSV_TUTOR_POLICY_VERSION'=>$argv[4]??'TEST-tutor-v1','CSSV_TUTOR_PROCESSING_NOTICE'=>'TEST ONLY: questions and selected context use a labelled synthetic local response. No real provider or production student data is used.'.($argv[5]??'')]);file_put_contents($path,"<?php\nreturn ".var_export($config,true).";\n");chmod($path,0600);
 $pdo->exec("DELETE FROM login_security_events WHERE event_type='tutor_write'");
}elseif($action==='edition'){
 $GLOBALS['CSSV_RUNTIME_CONFIG']['CSSV_CURRENT_AFFAIRS_ALLOW_TEST_DATA']='true';$id='TEST-TUTOR-'.cssv_uuid_v4();
 ca_publish($pdo,['schema_version'=>1,'test'=>true,'date'=>'2001-02-03','published_at'=>'2001-02-03T12:00:00Z','edition'=>'TEST ONLY tutor source edition','stories'=>[['id'=>$id,'category'=>'TEST ONLY','headline'=>'TEST ONLY dated source for contextual learning','summary'=>'TEST ONLY reviewed source content for isolation checks. This is a labelled synthetic edition, not a real current event.','sources'=>[['publisher'=>'TEST ONLY source','title'=>'TEST ONLY published fixture','url'=>'https://example.invalid/test-tutor-source']]]]]);echo $id;
}elseif($action==='reserve'){
 try{echo json_encode(['id'=>cssv_tutor_reserve($pdo,$argv[2],json_decode($argv[3],true,32,JSON_THROW_ON_ERROR),new DateTimeImmutable($argv[4]??'now'))],JSON_THROW_ON_ERROR);}catch(Throwable $e){echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()],JSON_THROW_ON_ERROR);}
}elseif($action==='execute'){require __DIR__.'/transport.php';cssv_tutor_execute($pdo,$argv[2]);}
elseif($action==='input'){$q=$pdo->prepare('SELECT * FROM ai_operations WHERE id=?');$q->execute([$argv[2]]);echo json_encode(cssv_tutor_snapshot($pdo,$q->fetch()),JSON_THROW_ON_ERROR);}
elseif($action==='usage'){$q=$pdo->prepare("SELECT feature,bucket_date,used,reserved,accepted,provider_calls FROM ai_daily_usage WHERE user_id=? ORDER BY feature,bucket_date");$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);}
elseif($action==='generic') {try{cssv_ai_execute($pdo,$argv[2]);echo 'UNEXPECTED';}catch(LogicException){echo 'blocked';}}
elseif($action==='normalize'){$q=$pdo->prepare('SELECT input FROM tutor_requests WHERE operation_id=?');$q->execute([$argv[2]]);$v=json_decode($q->fetchColumn(),true,32,JSON_THROW_ON_ERROR);$sort=static function(mixed $x)use(&$sort):mixed{if(!is_array($x))return $x;if(!array_is_list($x))krsort($x);foreach($x as &$item)$item=$sort($item);unset($item);return $x;};$pdo->prepare('UPDATE tutor_requests SET input=? WHERE operation_id=?')->execute([json_encode($sort($v),JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),$argv[2]]);}
elseif($action==='corrupt'){$pdo->prepare("UPDATE tutor_requests SET input=JSON_SET(input,'$.question','TEST ONLY corrupted snapshot') WHERE operation_id=?")->execute([$argv[2]]);}
elseif($action==='finding-count'){$q=$pdo->prepare('SELECT COUNT(*) FROM writing_findings f JOIN ai_operations o ON o.id=f.operation_id WHERE o.user_id=?');$q->execute([$argv[2]]);echo $q->fetchColumn();}
elseif($action==='past-only'){$pdo->prepare('UPDATE current_affairs_days SET is_published=0 WHERE publication_date=?')->execute([$argv[2]]);}
elseif($action==='change-source'){$pdo->prepare("UPDATE current_affairs_items SET content=JSON_SET(content,'$.summary','TEST ONLY changed published source') WHERE id=?")->execute([$argv[2]]);}
else throw new RuntimeException('Unknown fixture action.');
