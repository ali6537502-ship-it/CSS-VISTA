<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_ai.php';require_once dirname(__DIR__).'/_handwriting_core.php';
cssv_require_method('GET');
try {
 $pdo=cssv_db();$session=cssv_require_user($pdo);$userId=(string)$session['user_id'];cssv_learning_ensure($pdo);
 if(isset($_GET['operation_id']))cssv_json(['ok'=>true,'operation'=>cssv_ai_owned_operation($pdo,cssv_pro_id($_GET['operation_id']),$userId)]);
 $date=cssv_ai_bucket(new DateTimeImmutable('now',new DateTimeZone('UTC')));$q=$pdo->prepare('SELECT feature,used,reserved,accepted,provider_calls FROM ai_daily_usage WHERE user_id=? AND bucket_date=?');$q->execute([$userId,$date]);$rows=array_column($q->fetchAll(),null,'feature');$buckets=[];
 foreach(cssv_ai_features() as $feature=>$default){$row=$rows[$feature] ?? []; $buckets[]=['feature'=>$feature,'limit'=>cssv_ai_limit($feature),'used'=>(int)($row['used'] ?? 0),'reserved'=>(int)($row['reserved'] ?? 0),'accepted'=>(int)($row['accepted'] ?? 0),'provider_calls'=>(int)($row['provider_calls'] ?? 0)];}
 $offset=filter_var($_GET['offset'] ?? 0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid usage page.');
 $q=$pdo->prepare('SELECT id FROM ai_operations WHERE user_id=? ORDER BY created_at DESC,id LIMIT 51 OFFSET '.(int)$offset);$q->execute([$userId]);$ids=$q->fetchAll(PDO::FETCH_COLUMN);
 cssv_json(['ok'=>true,'date'=>$date,'timezone'=>'Asia/Karachi','live_actions_enabled'=>false,'handwriting_enabled'=>cssv_handwriting_configuration()['enabled'],'limits'=>$buckets,'operations'=>array_map(fn($id)=>cssv_ai_owned_operation($pdo,$id,$userId),array_slice($ids,0,50)),'has_more'=>count($ids)>50]);
}catch(Throwable $e){cssv_pro_problem($e);}
