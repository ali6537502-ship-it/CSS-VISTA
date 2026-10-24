<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_topics.php';
$pdo=cssv_db();cssv_topics_ensure($pdo);
$user=$pdo->query("SELECT id FROM users WHERE email LIKE '%@example.invalid' ORDER BY created_at DESC LIMIT 1")->fetchColumn();
$edition=$pdo->query('SELECT id FROM pro_topic_versions ORDER BY created_at DESC LIMIT 1')->fetchColumn();
if(!$user||!$edition)throw new RuntimeException('Run native topic fixtures first.');
$pdo->beginTransaction();try{
 $attempt=cssv_uuid_v4();$pdo->prepare("INSERT INTO preparation_attempts(id,user_id,target_year,optional_subject_ids,daily_minutes,stage) VALUES(?,?,2027,'[]',30,'starting')")->execute([$attempt,$user]);
 $before="  Original legacy text — اردو\n\nEnd.  ";$after="Independent revision\n";
 cssv_topic_writing_append($pdo,$user,$attempt,$edition,'draft',$before,$after,'TEST ONLY preservation');
 $rows=cssv_topic_writing_history($pdo,$user,$attempt,$edition)['versions'];
 if(count($rows)!==2)throw new RuntimeException('Baseline/revision missing.');
 $baseline=array_values(array_filter($rows,fn($v)=>$v['imported_baseline']))[0];
 if($baseline['text']!==$before||$baseline['text_hash']!==hash('sha256',$before))throw new RuntimeException('Original bytes changed.');
 cssv_topic_writing_append($pdo,$user,$attempt,$edition,'draft',$after,$after,'TEST ONLY preservation');
 if(count(cssv_topic_writing_history($pdo,$user,$attempt,$edition)['versions'])!==2)throw new RuntimeException('Unchanged replay duplicated versions.');
 cssv_topic_writing_append($pdo,$user,$attempt,$edition,'draft',$after,'A later independent revision.','TEST ONLY preservation');
 $rows=cssv_topic_writing_history($pdo,$user,$attempt,$edition)['versions'];
 if(count($rows)!==3||count(array_filter($rows,fn($v)=>$v['version']===3))!==1)throw new RuntimeException('Append order lost.');
 $pdo->rollBack();echo "PASS: nonempty legacy baseline preserves exact whitespace, Unicode, hashes and version order; unchanged retry appends nothing. Disposable transaction rolled back.\n";
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
