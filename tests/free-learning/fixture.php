<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required');
require __DIR__.'/../../public/api/_bootstrap_core.php';
require __DIR__.'/../../public/api/_pro.php';
require __DIR__.'/../../public/api/_learning.php';
$pdo=cssv_db();cssv_learning_ensure($pdo);$user=$argv[2]??'';
if(($argv[1]??'')==='legacy-order'){
 $id=cssv_uuid_v4();$pdo->prepare('INSERT INTO pro_orders(id,user_id,request_id,request_hash,amount_minor,receiver_number,receiver_title,terms_version,terms_text,return_to) VALUES(?,?,?,?,195000,?,?,?,?,?)')->execute([$id,$user,cssv_uuid_v4(),str_repeat('a',64),'03000000000','TEST ONLY historical receiver','TEST-only-v1','TEST ONLY retained order, never a live payment.','/account/dashboard']);echo $id;
}elseif(($argv[1]??'')==='snapshot'){
 $out=[];foreach(['pro_orders','pro_memberships','ai_operations','ai_daily_usage'] as $table){$q=$pdo->prepare('SELECT * FROM '.$table.' WHERE user_id=? ORDER BY user_id');$q->execute([$user]);$out[$table]=$q->fetchAll();}echo json_encode($out,JSON_THROW_ON_ERROR);
}else throw new RuntimeException('Unsupported fixture action');
