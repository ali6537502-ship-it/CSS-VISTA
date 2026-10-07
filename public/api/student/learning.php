<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_learning.php';
cssv_require_method('GET','POST');
try {
 $pdo=cssv_db();$session=cssv_require_user($pdo);$userId=(string)$session['user_id'];
 if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_learning_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){
  cssv_enforce_rate_limit($pdo,'learning_write',$userId,240,3600);cssv_log_security_event($pdo,'learning_write',$userId,$userId);
  cssv_json(['ok'=>true,...cssv_learning_mutation($pdo,$userId,cssv_request_json(100000))]);
 }
 if(isset($_GET['version_id']))cssv_json(['ok'=>true,'writing_version'=>cssv_learning_version($pdo,cssv_pro_id($_GET['version_id']),$userId)]);
 if(isset($_GET['writing_id']))cssv_json(['ok'=>true,'writing'=>cssv_learning_writing($pdo,cssv_pro_id($_GET['writing_id']),$userId)]);
 if(isset($_GET['attempt_id']))cssv_json(['ok'=>true,'attempt'=>cssv_learning_attempt($pdo,cssv_pro_id($_GET['attempt_id']),$userId)]);
 $offset=filter_var($_GET['offset'] ?? 0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid history page.');
 $q=$pdo->prepare('SELECT id FROM preparation_attempts WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 51 OFFSET '.(int)$offset);$q->execute([$userId]);$ids=$q->fetchAll(PDO::FETCH_COLUMN);$more=count($ids)>50;$attempts=array_map(fn($id)=>cssv_learning_attempt($pdo,$id,$userId),array_slice($ids,0,50));
 $q=$pdo->prepare('SELECT id,attempt_id,kind,title,version,updated_at FROM writing_records WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 51 OFFSET '.(int)$offset);$q->execute([$userId]);$writing=$q->fetchAll();$writingMore=count($writing)>50;$writing=array_slice($writing,0,50);foreach($writing as &$w){$w['version']=(int)$w['version'];$w['updated_at']=cssv_pro_iso($w['updated_at']);}unset($w);
 cssv_json(['ok'=>true,'attempts'=>$attempts,'writing'=>$writing,'has_more_attempts'=>$more,'has_more_writing'=>$writingMore,'catalog'=>cssv_learning_catalog()]);
}catch(Throwable $e){cssv_pro_problem($e);}
