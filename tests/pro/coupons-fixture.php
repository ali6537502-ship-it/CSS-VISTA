<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Isolated CI required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_pro_coupons.php';
$pdo=cssv_db();cssv_coupon_ensure_schema($pdo);$action=$argv[1]??'';
if($action==='config'){
 $path=cssv_env('CSSV_CONFIG_FILE');if(!$path||!str_starts_with($path,sys_get_temp_dir().'/'))throw new RuntimeException('Disposable config required.');
 $on=($argv[2]??'')==='on';$paid=($argv[3]??'')==='paid';$pause=($argv[4]??'')==='paused';
 file_put_contents($path,"<?php return ".var_export(['CSSV_PRO_COUPONS_ENABLED'=>$on?'1':'0','CSSV_PRO_RELEASE_TEST_PAUSED'=>$pause?'1':'0','CSSV_PRO_COLLECTION_ENABLED'=>$paid?'1':'0','CSSV_PRO_COLLECTION_APPROVED'=>'1','CSSV_PRO_TERMS_VERSION'=>'test-only-v1','CSSV_PRO_TERMS_TEXT'=>'ISOLATED TEST ONLY. No real payment or commercial terms.'],true).";\n");
}elseif($action==='reset-rate'){$pdo->exec("DELETE FROM login_security_events WHERE event_type='pro_coupon_write'");}
elseif($action==='expire-code'){$pdo->prepare('UPDATE pro_coupons SET expires_at=DATE_SUB(NOW(6),INTERVAL 1 SECOND) WHERE id=?')->execute([$argv[2]]);}
elseif($action==='grant-count'){$q=$pdo->prepare('SELECT COUNT(*) FROM pro_grants WHERE user_id=?');$q->execute([$argv[2]]);echo $q->fetchColumn();}
elseif($action==='stored-code'){$q=$pdo->prepare('SELECT code_hash FROM pro_coupons WHERE id=?');$q->execute([$argv[2]]);echo $q->fetchColumn();}
else throw new RuntimeException('Unknown fixture');
