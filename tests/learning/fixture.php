<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_ai.php';
$pdo=cssv_db();cssv_learning_ensure($pdo);$action=$argv[1] ?? '';
function fixture_ai_config(bool $enabled): void {
 putenv('CSSV_AI_ENABLED='.($enabled?'1':'0'));putenv('CSSV_AI_APPROVED=1');putenv('CSSV_AI_MODEL_VERIFIED=1');putenv('CSSV_OPENAI_API_KEY=TEST-ONLY-NO-PROVIDER-NETWORK');putenv('CSSV_AI_LIMIT_PARAGRAPH=1');
}
if($action==='pro') {
 // Fixture entitlement only, not a payment or a production seed.
 $pdo->prepare('INSERT INTO pro_memberships(user_id,starts_at,expires_at) VALUES(?,NOW(6),DATE_ADD(NOW(6),INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at)')->execute([$argv[2]]);
}elseif($action==='reserve') {
 fixture_ai_config(($argv[6] ?? '')!=='off');try{echo json_encode(['id'=>cssv_ai_reserve($pdo,$argv[2],$argv[3],$argv[4],$argv[5],new DateTimeImmutable($argv[7] ?? 'now'))],JSON_THROW_ON_ERROR);}catch(Throwable $e){echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()],JSON_THROW_ON_ERROR);}
}elseif($action==='execute') {
 fixture_ai_config(true);$type=$argv[3];
 cssv_ai_execute($pdo,$argv[2],static function($op,$text)use($type,$pdo){
  if($pdo->inTransaction())throw new RuntimeException('Locks held across provider request');
  if($type==='unknown')throw new CssvAiUnknown('TEST provider timeout');
  if($type==='rejected')throw new CssvAiRejected('test_rejected');
  return ['id'=>'TEST-response-'.$op['id'],'model'=>'gpt-6-luna','status'=>'completed','usage'=>['input_tokens'=>123,'output_tokens'=>45,'input_tokens_details'=>['cached_tokens'=>10]],'output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode(['summary'=>'TEST ONLY feedback','findings'=>$type==='invalid'?[['code'=>'article_usage','severity'=>'minor','excerpt'=>'NOT IN THE TEXT','explanation'=>'TEST explanation','hint'=>'TEST hint']]:[]])]]]]];
 });
}elseif($action==='execute-disabled') {
 fixture_ai_config(false);cssv_ai_execute($pdo,$argv[2]);
}elseif($action==='age') {
 $pdo->prepare('UPDATE ai_operations SET created_at=DATE_SUB(NOW(6),INTERVAL 10 MINUTE),provider_started_at=IF(provider_started_at IS NULL,NULL,DATE_SUB(NOW(6),INTERVAL 10 MINUTE)) WHERE id=?')->execute([$argv[2]]);
}elseif($action==='start') {
 echo json_encode(cssv_ai_start($pdo,$argv[2]),JSON_THROW_ON_ERROR);
}elseif($action==='sweep') {
 echo json_encode(cssv_ai_sweep($pdo),JSON_THROW_ON_ERROR);
}elseif($action==='snapshot') {
 $q=$pdo->prepare('SELECT feature,bucket_date,used,reserved,accepted,provider_calls FROM ai_daily_usage WHERE user_id=?');$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);
}elseif($action==='finalize') {
 cssv_ai_finish($pdo,$argv[2],'succeeded',['usage'=>['input_tokens'=>10,'output_tokens'=>5]],['summary'=>'TEST recovered known result','findings'=>[]]);
}else throw new RuntimeException('Unknown fixture action.');
