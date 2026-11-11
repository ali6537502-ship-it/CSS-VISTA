<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_topics.php';require_once __DIR__.'/../topics/source.php';
$pdo=cssv_db();cssv_topics_ensure($pdo);$user=$argv[2]??'';$q=$pdo->prepare("SELECT id FROM users WHERE id=? AND email LIKE '%@example.invalid'");$q->execute([$user]);if(!$q->fetchColumn())throw new RuntimeException('Synthetic user required.');
if($argv[1]==='seed'){
 $admin=$pdo->query('SELECT id FROM admin_accounts ORDER BY id LIMIT 1')->fetchColumn();if(!$admin)throw new RuntimeException('Synthetic admin setup required.');
 $prefix='test-only-daily-'.substr(cssv_uuid_v4(),0,8);$ids=[];
 for($i=0;$i<27;$i++){$id=$prefix.'-'.sprintf('%02d',$i);$d=cssv_topic_definition(cssv_test_topic($id));$d['title']='TEST ONLY daily session '.sprintf('%02d',$i);$raw=json_encode($d,JSON_THROW_ON_ERROR);$version=cssv_uuid_v4();$pdo->prepare('INSERT INTO pro_topics(id,title,summary,category) VALUES(?,?,?,?)')->execute([$id,$d['title'],$d['summary'],$d['category']]);$pdo->prepare('INSERT INTO pro_topic_versions(id,topic_id,content_hash,content,created_by) VALUES(?,?,?,?,?)')->execute([$version,$id,hash('sha256',$raw),$raw,$admin]);if($i<25)$pdo->prepare('UPDATE pro_topics SET published_version_id=? WHERE id=?')->execute([$version,$id]);$ids[]=$id;}
 $attempt=cssv_uuid_v4();$pdo->prepare("INSERT INTO preparation_attempts(id,user_id,target_year,optional_subject_ids,daily_minutes,stage) VALUES(?,?,2027,'[]',30,'starting')")->execute([$attempt,$user]);$writing=cssv_uuid_v4();$text="TEST ONLY retained writing — اردو\n  Exact spaces.";$pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,'paragraph','TEST ONLY retained writing',1)")->execute([$writing,$user,$attempt]);$pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,1,?,?,7)')->execute([cssv_uuid_v4(),$writing,$text,hash('sha256',$text)]);
 echo json_encode(['ids'=>array_slice($ids,0,25),'drafts'=>array_slice($ids,25),'attempt'=>$attempt,'writing'=>$writing]);exit;
}
if($argv[1]==='digest'){$q=$pdo->prepare('SELECT w.id,w.user_id,w.attempt_id,w.kind,w.version,v.id version_id,v.text,v.text_hash FROM writing_records w JOIN writing_versions v ON v.writing_id=w.id WHERE w.user_id=? ORDER BY w.id,v.version');$q->execute([$user]);echo hash('sha256',json_encode($q->fetchAll(),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE));exit;}
if($argv[1]==='withdraw'){$id=$argv[3]??'';if(!str_starts_with($id,'test-only-daily-'))throw new RuntimeException('Synthetic topic required.');$pdo->prepare('UPDATE pro_topics SET published_version_id=NULL WHERE id=?')->execute([$id]);exit;}
throw new RuntimeException('Unknown fixture.');
