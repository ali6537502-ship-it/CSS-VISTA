<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable CI only.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_ability.php';
$pdo=cssv_db();cssv_ability_ensure($pdo);$user=cssv_pro_id($argv[2]??null);$action=$argv[1]??'';
if($action==='snapshot'){
 $q=$pdo->prepare('SELECT * FROM ability_responses WHERE user_id=? ORDER BY created_at,id');$q->execute([$user]);$rows=$q->fetchAll();$p=$pdo->prepare('SELECT * FROM ability_positions WHERE user_id=? ORDER BY course_version');$p->execute([$user]);echo hash('sha256',json_encode([$rows,$p->fetchAll()],JSON_THROW_ON_ERROR));
}elseif($action==='legacy'){
 $unit=cssv_ability_unit($argv[3]??null);$versions=cssv_ability_versions($unit['id']);if(count($versions)<2)throw new RuntimeException('Unchanged prior unit required.');$lesson=$unit['lessons'][0];$r=['ability_course_version'=>$versions[1],'unit_id'=>$unit['id'],'mode'=>'exercise','feedback'=>cssv_ability_exercise($lesson,$lesson['exercise']['answer'])];$id=cssv_uuid_v4();$r['response_id']=$id;
 $pdo->prepare('INSERT INTO ability_responses(id,user_id,course_version,unit_id,mode,lesson_id,score,result,created_at) VALUES(?,?,?,?,?,?,?,?,DATE_SUB(NOW(6),INTERVAL 1 DAY))')->execute([$id,$user,$versions[1],$unit['id'],'exercise',$lesson['id'],100,json_encode($r,JSON_THROW_ON_ERROR)]);echo $id;
}else throw new RuntimeException('Unknown fixture');
