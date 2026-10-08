<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_precis.php';
cssv_require_method('GET','POST');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_precis_ensure($pdo);
 if($_SERVER['REQUEST_METHOD']==='POST'){cssv_enforce_rate_limit($pdo,'precis_write',$user,240,3600);cssv_log_security_event($pdo,'precis_write',$user,$user);cssv_json(['ok'=>true,...cssv_precis_mutation($pdo,$user,cssv_request_json(120000))]);}
 if(isset($_GET['writing_id']))cssv_json(['ok'=>true,...cssv_precis_detail($pdo,$user,cssv_pro_id($_GET['writing_id']),isset($_GET['version_id'])?cssv_pro_id($_GET['version_id']):null)]);
 if(isset($_GET['attempt_id']))cssv_json(['ok'=>true,...cssv_precis_progress($pdo,$user,cssv_pro_id($_GET['attempt_id']))]);
 $membership=cssv_pro_membership($pdo,$user);$active=$membership['status']==='active';
 $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid history page.');
 $q=$pdo->prepare('SELECT w.id,w.attempt_id,w.title,w.version,w.updated_at FROM writing_records w JOIN precis_sources s ON s.writing_id=w.id AND s.user_id=w.user_id WHERE w.user_id=? ORDER BY w.updated_at DESC,w.id DESC LIMIT 51 OFFSET '.(int)$offset);$q->execute([$user]);$writing=$q->fetchAll();$more=count($writing)>50;$writing=array_slice($writing,0,50);
 foreach($writing as &$row){$row['version']=(int)$row['version'];$row['updated_at']=cssv_pro_iso($row['updated_at']);}unset($row);
 $q=$pdo->prepare('SELECT id,target_year FROM preparation_attempts WHERE user_id=? ORDER BY updated_at DESC LIMIT 1001');$q->execute([$user]);$attempts=$q->fetchAll();$attemptMore=count($attempts)>1000;
 foreach($attempts as &$row)$row['target_year']=(int)$row['target_year'];unset($row);
 cssv_json(['ok'=>true,'membership'=>$membership,'course'=>cssv_precis_course(),'rubric'=>cssv_precis_rubric(),'skills'=>cssv_precis_skills(),'attempts'=>array_slice($attempts,0,1000),'has_more_attempts'=>$attemptMore,'writing'=>$writing,'has_more'=>$more,'catalog'=>$active?cssv_precis_catalog():null,'evaluation_enabled'=>false]);
}catch(Throwable $e){
 if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'precis_invalid');
 if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'precis_not_found');
 if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'precis_conflict');
 error_log('CSSV Précis request failed: '.get_class($e));cssv_fail('Précis work could not be saved or loaded. Keep your browser draft and try again.',503,'precis_unavailable');
}
