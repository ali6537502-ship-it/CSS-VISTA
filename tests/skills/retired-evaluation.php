<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_skills_ai.php';require __DIR__.'/../../public/api/_precis_feedback.php';require __DIR__.'/../../public/api/_expression.php';
$pdo=cssv_db();$user=cssv_pro_id($argv[1]??null);$version=cssv_pro_id($argv[2]??null);cssv_learning_version($pdo,$version,$user);
function verify(bool $value,string $message):void{if(!$value)throw new RuntimeException($message);}
foreach(['sentence','paragraph','precis','handwriting','handwriting_extract','argumentation','analysis','essay'] as $feature){
 verify(cssv_ai_retired($feature),'Missing retired scope.');
 try{cssv_ai_reserve_usage($pdo,$user,cssv_uuid_v4(),str_repeat('a',64),$feature,$version,['model'=>'TEST-only','prompt_version'=>'TEST-retired'],new DateTimeImmutable());throw new RuntimeException('Retired operation accepted.');}catch(LogicException $error){verify(str_contains($error->getMessage(),'retired'),'Wrong rejection reason.');}
}
verify(!cssv_expression_configuration()['enabled'],'Expression evaluation advertised.');verify(!cssv_skills_ai_configuration('sentence')['enabled'],'Skills evaluation advertised.');verify(!cssv_precis_feedback_configuration()['enabled'],'Precis evaluation advertised.');verify(!cssv_handwriting_configuration()['enabled'],'Scanner advertised.');
$bucket=cssv_ai_bucket(new DateTimeImmutable());$id=cssv_uuid_v4();
$pdo->prepare('INSERT INTO ai_daily_usage(user_id,feature,bucket_date,reserved,accepted) VALUES(?,?,?,1,1)')->execute([$user,'paragraph',$bucket]);
$pdo->prepare('INSERT INTO ai_operations(id,user_id,request_id,payload_hash,feature,version_id,bucket_date,model,prompt_version) VALUES(?,?,?,?,?,?,?,?,?)')->execute([$id,$user,cssv_uuid_v4(),str_repeat('b',64),'paragraph',$version,$bucket,'TEST-only','TEST-retired']);
verify(cssv_ai_start($pdo,$id,true)===null,'Old reservation dispatched.');
$op=cssv_ai_owned_operation($pdo,$id,$user);verify($op['state']==='failed'&&$op['accounting']==='released','Reservation not safely released.');
$q=$pdo->prepare('SELECT reserved,used,provider_calls FROM ai_daily_usage WHERE user_id=? AND feature=?');$q->execute([$user,'paragraph']);$usage=$q->fetch();verify(array_sum(array_map('intval',$usage))===0,'Cancellation consumed usage or dispatched provider.');
// An unresolved historical operation cannot be silently retried or reclassified.
$pdo->prepare("UPDATE ai_operations SET state='unknown',accounting='reserved',completed_at=NULL,result=? WHERE id=?")->execute([json_encode(['summary'=>'TEST ONLY preserved historical response']),$id]);
$pdo->prepare('UPDATE ai_daily_usage SET reserved=1 WHERE user_id=? AND feature=?')->execute([$user,'paragraph']);
$before=cssv_ai_owned_operation($pdo,$id,$user);verify(cssv_ai_start($pdo,$id,true)===null,'Unknown request dispatched.');verify(cssv_ai_owned_operation($pdo,$id,$user)===$before,'Historical operation was rewritten.');
echo "PASS retirement: all eight scopes, stale enable flags, reservation release without provider/usage, preserved unknown historical response\n";
