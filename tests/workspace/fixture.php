<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
require_once __DIR__.'/../../public/api/_learning.php';
require_once __DIR__.'/../../public/api/_workspace.php';
$pdo=cssv_db();$action=$argv[1]??'';
if($action==='seed'){
 $user=$argv[2];cssv_learning_ensure($pdo);$a=cssv_uuid_v4();
 $pdo->prepare("INSERT INTO preparation_attempts(id,user_id,target_year,optional_subject_ids,daily_minutes,stage) VALUES(?,?,2027,'[]',30,'starting')")->execute([$a,$user]);
 $ids=[];for($i=0;$i<35;$i++){$id=cssv_uuid_v4();$ids[]=$id;$title=sprintf('Synthetic research %02d',$i);$text="TEST ONLY original wording $i — اردو\n  Keep spaces.\n";
 $pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,'paragraph',?,1)")->execute([$id,$user,$a,$title]);
 $pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,1,?,?,9)')->execute([cssv_uuid_v4(),$id,$text,hash('sha256',$text)]);}
 $subject=cssv_uuid_v4();$entry=cssv_uuid_v4();
 $pdo->prepare("INSERT INTO factbook_subjects(id,user_id,name,description,icon,cover_style,accent_color,exam_label,position,created_at,updated_at) VALUES(?,?,'TEST ONLY personal references','','book','classic','#14543D','',0,NOW(6),NOW(6))")->execute([$subject,$user]);
 $html='<unknown><unknown><img src=x onerror="window.__factbookUnsafe=1"></unknown></unknown><p>Legacy meaning <strong>kept</strong> — اردو</p>';
 $pdo->prepare("INSERT INTO factbook_entries(id,user_id,subject_id,title,entry_type,content,importance,revision_status,bookmarked,source_count,personal_remarks,search_text,position,created_at,updated_at) VALUES(?,?,?,'TEST ONLY legacy rich note','rich-note',?,'normal','not-reviewed',0,0,'','',0,NOW(6),NOW(6))")->execute([$entry,$user,$subject,json_encode(['html'=>$html],JSON_THROW_ON_ERROR)]);
 echo json_encode(['attempt'=>$a,'writing'=>$ids,'factbook'=>$entry]);
}elseif($action==='digest'){
 $q=$pdo->prepare('SELECT r.id,r.user_id,r.attempt_id,r.kind,r.title,r.version,v.id version_id,v.text,v.text_hash,v.version text_version FROM writing_records r JOIN writing_versions v ON v.writing_id=r.id WHERE r.user_id=? ORDER BY r.id,v.version');$q->execute([$argv[2]]);echo hash('sha256',json_encode($q->fetchAll(),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
}elseif($action==='pause'){
 $config=cssv_env('CSSV_CONFIG_FILE');$values=is_file($config)?require $config:[];$values['CSSV_PRO_RELEASE_TEST_PAUSED']=$argv[2];file_put_contents($config,"<?php\nreturn ".var_export($values,true).";\n");
}elseif($action==='publication-count'){
 $q=$pdo->query("SELECT COUNT(*) FROM login_security_events WHERE event_type='topic_publish' AND user_id IS NULL");echo $q->fetchColumn();
}elseif($action==='publication-limit'){
 $session=json_decode(file_get_contents(__DIR__.'/../../test-artifacts/admin-session.json'),true,16,JSON_THROW_ON_ERROR);$q=$pdo->prepare('SELECT admin_id FROM admin_sessions WHERE token_hash=?');$q->execute([cssv_hash_secret($session['token'])]);$admin=$q->fetchColumn();
 for($i=0;$i<240;$i++)cssv_log_security_event($pdo,'topic_publish',null,'admin:'.$admin);
}elseif($action==='schema'){
 $q=$pdo->query('SELECT table_name,column_name,column_type,is_nullable FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY table_name,ordinal_position');echo json_encode($q->fetchAll(),JSON_PRETTY_PRINT);
}else throw new RuntimeException('Unknown workspace fixture.');
