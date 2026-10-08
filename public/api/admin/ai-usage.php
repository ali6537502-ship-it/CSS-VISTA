<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_admin_auth.php';require_once dirname(__DIR__).'/_ai.php';
cssv_require_method('GET');
try {
 $pdo=cssv_db();cssv_require_separate_admin($pdo);cssv_learning_ensure($pdo);
 $now=new DateTimeImmutable('now',new DateTimeZone('Asia/Karachi'));$period=$_GET['period'] ?? 'day';if(!in_array($period,['day','month'],true))throw new InvalidArgumentException('Choose day or month.');
 $start=($period==='day'?$now:$now->modify('first day of this month'))->setTime(0,0);$end=$period==='day'?$start->modify('+1 day'):$start->modify('+1 month');$from=$start->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');$to=$end->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
 $where=' WHERE created_at>=? AND created_at<?';
 $q=$pdo->prepare("SELECT COUNT(*) accepted,COALESCE(SUM(provider_started_at IS NOT NULL),0) provider_calls,COALESCE(SUM(state='succeeded'),0) succeeded,COALESCE(SUM(state='failed'),0) failed,COALESCE(SUM(state IN ('reserved','in_flight','unknown')),0) pending,SUM(input_tokens) input_tokens,SUM(output_tokens) output_tokens,SUM(cached_tokens) cached_tokens,COALESCE(SUM(provider_started_at IS NOT NULL AND (input_tokens IS NULL OR output_tokens IS NULL)),0) calls_without_token_report FROM ai_operations".$where);$q->execute([$from,$to]);$totals=$q->fetch();foreach($totals as $k=>$v)$totals[$k]=$v===null?null:(int)$v;
 $q=$pdo->prepare('SELECT feature,COUNT(*) accepted,SUM(provider_started_at IS NOT NULL) provider_calls,SUM(input_tokens) input_tokens,SUM(output_tokens) output_tokens FROM ai_operations'.$where.' GROUP BY feature ORDER BY provider_calls DESC,feature');$q->execute([$from,$to]);$features=$q->fetchAll();
 $q=$pdo->prepare('SELECT o.user_id,p.display_name,COUNT(*) accepted,SUM(o.provider_started_at IS NOT NULL) provider_calls FROM ai_operations o LEFT JOIN student_profiles p ON p.user_id=o.user_id WHERE o.created_at>=? AND o.created_at<? GROUP BY o.user_id,p.display_name ORDER BY provider_calls DESC,o.user_id LIMIT 20');$q->execute([$from,$to]);$accounts=$q->fetchAll();
 $q=$pdo->prepare('SELECT COUNT(DISTINCT user_id) FROM pro_grants WHERE starts_at<? AND expires_at>?');$q->execute([$to,$from]);$proUsers=(int)$q->fetchColumn();
 cssv_json(['ok'=>true,'period'=>$period,'from'=>cssv_pro_iso($from),'to'=>cssv_pro_iso($to),'timezone'=>'Asia/Karachi','totals'=>$totals,'features'=>$features,'accounts'=>$accounts,'pro_users_in_period'=>$proUsers,'calls_per_pro_user'=>$proUsers>0?$totals['provider_calls']/$proUsers:null,'estimated_cost_usd'=>null,'cost_status'=>'Verified pricing is not configured.','configuration_ready'=>cssv_ai_configuration()['configured'],'live_actions_enabled'=>false]);
}catch(Throwable $e){cssv_pro_problem($e);}
