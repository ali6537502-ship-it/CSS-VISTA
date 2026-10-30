<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')exit(1);
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_preparation_reset.php';
$pdo=cssv_db();if($pdo->query('SELECT DATABASE()')->fetchColumn()!=='cssvista_briefing_test')exit(1);
$action=$argv[1]??'';$user=$argv[2]??'';
$q=$pdo->prepare('SELECT email FROM users WHERE id=?');$q->execute([$user]);if(!str_ends_with((string)$q->fetchColumn(),'@example.invalid'))exit(1);
if($action==='identity'){
 $tables=['users'=>'id','student_profiles'=>'user_id','pro_memberships'=>'user_id','pro_grants'=>'user_id','preparation_attempts'=>'user_id','writing_records'=>'user_id','mentor_answers'=>'user_id','attempt_planner_settings'=>'user_id','mpt_attempts'=>'user_id'];$schema=cssv_reset_schema($pdo);$out=[];
 foreach($tables as$t=>$col)if(isset($schema[$t])&&in_array($col,$schema[$t]['columns'],true)){$q=$pdo->prepare('SELECT * FROM '.$t.' WHERE '.$col.'=? ORDER BY 1');$q->execute([$user]);$rows=$q->fetchAll();foreach($rows as&$row)foreach(['updated_at','last_seen_at','last_login_at','last_active_at']as$key)unset($row[$key]);unset($row);$out[$t]=hash('sha256',json_encode($rows,JSON_THROW_ON_ERROR));}echo json_encode($out,JSON_THROW_ON_ERROR);
}elseif($action==='control')echo json_encode(cssv_reset_control(cssv_reset_payload($pdo,$user)),JSON_THROW_ON_ERROR);
elseif($action==='pause'){$path=cssv_env('CSSV_CONFIG_FILE');if(!str_starts_with($path,'/tmp/cssv-pro-private/'))exit(1);$c=require $path;$c['CSSV_PRO_RELEASE_TEST_PAUSED']=$argv[3]==='1'?'1':'0';file_put_contents($path,'<?php return '.var_export($c,true).';',LOCK_EX);}
elseif($action==='populate'){
 $attempt=cssv_uuid_v4();$second=cssv_uuid_v4();$ids=[];
 foreach([$attempt,$second]as$a){$pdo->prepare("INSERT INTO preparation_attempts(id,user_id,target_year,optional_subject_ids,daily_minutes,stage) VALUES(?,?,2027,'[]',90,'starting')")->execute([$a,$user]);$pdo->prepare("INSERT INTO attempt_planner_settings(attempt_id,user_id,religion_choice) VALUES(?,?,'islamic-studies')")->execute([$a,$user]);
  foreach(['2026-10-31','2026-11-01']as$date){$plan=cssv_uuid_v4();$task=cssv_uuid_v4();$pdo->prepare("INSERT INTO attempt_daily_plans(id,attempt_id,user_id,plan_date,budget,rule_version,input_hash,summary) VALUES(?,?,?,?,90,'test-only',?,'{}')")->execute([$plan,$a,$user,$date,str_repeat('a',64)]);$pdo->prepare("INSERT INTO attempt_plan_tasks(id,plan_id,user_id,work_key,kind,snapshot,minutes) VALUES(?,?,?,'fixture','study','{}',45)")->execute([$task,$plan,$user]);$pdo->prepare("INSERT INTO attempt_planner_events(id,attempt_id,user_id,task_id,event_type,payload) VALUES(?,?,?,?,'task_work','{}')")->execute([cssv_uuid_v4(),$a,$user,$task]);$ids[]=$task;}
  $pdo->prepare("INSERT INTO attempt_unit_progress(attempt_id,user_id,unit_id,coverage,source) VALUES(?,?,'test-only-unit','covered','{}')")->execute([$a,$user]);$pdo->prepare("INSERT INTO grammar_progress(attempt_id,user_id,state,evidence) VALUES(?,?,'{}','{}')")->execute([$a,$user]);$pdo->prepare("INSERT INTO attempt_reading_records(attempt_id,user_id,kind,source_id,source_hash,snapshot) VALUES(?,?,'vistagram','test-only',?,'{}')")->execute([$a,$user,str_repeat('a',64)]);
 }
 $pdo->prepare('UPDATE attempt_plan_tasks SET moved_to=? WHERE id=?')->execute([$ids[1],$ids[0]]);
 $pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title) VALUES(?,?,?,'paragraph','TEST ONLY protected writing')")->execute([cssv_uuid_v4(),$user,$attempt]);
 $subject=cssv_uuid_v4();$parent=cssv_uuid_v4();$child=cssv_uuid_v4();$entry=cssv_uuid_v4();
 $pdo->prepare("INSERT INTO factbook_subjects(id,user_id,name,created_at,updated_at) VALUES(?,?,'TEST ONLY',NOW(6),NOW(6))")->execute([$subject,$user]);
 foreach([[$parent,null],[$child,$parent]]as[$id,$parentId])$pdo->prepare("INSERT INTO factbook_categories(id,user_id,subject_id,parent_id,name,created_at,updated_at) VALUES(?,?,?,?,'TEST ONLY',NOW(6),NOW(6))")->execute([$id,$user,$subject,$parentId]);
 $pdo->prepare("INSERT INTO factbook_entries(id,user_id,subject_id,category_id,title,entry_type,content,personal_remarks,created_at,updated_at) VALUES(?,?,?,?,'TEST ONLY','note','{}','',NOW(6),NOW(6))")->execute([$entry,$user,$subject,$child]);echo json_encode(['attempt'=>$attempt,'second'=>$second,'tasks'=>$ids],JSON_THROW_ON_ERROR);
}elseif($action==='counts'){
 $out=[];foreach(['attempt_daily_plans','attempt_plan_tasks','attempt_planner_events','attempt_unit_progress','attempt_reading_records','grammar_progress','factbook_entries','factbook_categories']as$t){$q=$pdo->prepare('SELECT COUNT(*) FROM '.$t.' WHERE user_id=?');$q->execute([$user]);$out[$t]=(int)$q->fetchColumn();}echo json_encode($out,JSON_THROW_ON_ERROR);
}else exit(1);
