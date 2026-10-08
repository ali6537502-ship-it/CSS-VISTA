<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_grammar.php';
$pdo=cssv_db();cssv_grammar_ensure($pdo);$action=$argv[1] ?? '';$user=$argv[2] ?? '';
if($action==='feedback'){
 $attempt=$argv[3];cssv_learning_attempt($pdo,$attempt,$user);$code=$argv[4];if(!isset(cssv_expression_skills()[$code]))throw new RuntimeException('Unknown fixture code.');
 for($n=0;$n<3;$n++){
  $saved=cssv_learning_mutation($pdo,$user,['action'=>'writing_save','request_id'=>cssv_uuid_v4(),'expected_version'=>0,'attempt_id'=>$attempt,'kind'=>'paragraph','title'=>'TEST ONLY Grammar evidence '.$n,'text'=>'TEST ONLY independent wording '.$code.' '.$n]);
  $pdo->prepare("INSERT INTO ai_operations(id,user_id,request_id,payload_hash,feature,version_id,bucket_date,model,prompt_version,state,accounting,result,completed_at) VALUES(?,?,?,?,?,?,CURRENT_DATE(),'TEST-ONLY-NO-PROVIDER','TEST-ONLY','succeeded','consumed',?,NOW(6))")->execute([cssv_uuid_v4(),$user,cssv_uuid_v4(),hash('sha256','TEST ONLY'),'paragraph',$saved['version_id'],json_encode(['summary'=>'TEST ONLY','findings'=>[['code'=>$code]]])]);
 }
}elseif($action==='expire'){
 $pdo->prepare('INSERT INTO pro_memberships(user_id,starts_at,expires_at) VALUES(?,DATE_SUB(NOW(6),INTERVAL 31 DAY),DATE_SUB(NOW(6),INTERVAL 1 DAY)) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at)')->execute([$user]);
}elseif($action==='usage'){
 $q=$pdo->prepare('SELECT COUNT(*) FROM ai_daily_usage WHERE user_id=?');$q->execute([$user]);echo $q->fetchColumn();
}else throw new RuntimeException('Unknown fixture action.');
