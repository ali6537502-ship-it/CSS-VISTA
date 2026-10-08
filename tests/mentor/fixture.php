<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable test database only.');
require __DIR__.'/../../public/api/_bootstrap.php';require __DIR__.'/../../public/api/_mentor.php';
$pdo=cssv_db();cssv_mentor_ensure($pdo);$user=cssv_pro_id($argv[2]??null);
if(($argv[1]??'')==='usage'){$q=$pdo->prepare('SELECT COUNT(*) FROM ai_operations WHERE user_id=?');$q->execute([$user]);echo $q->fetchColumn();}
elseif(($argv[1]??'')==='pages'){
 $attempt=cssv_pro_id($argv[3]??null);cssv_learning_attempt($pdo,$attempt,$user);
 $q=$pdo->prepare("INSERT INTO mentor_answers(id,user_id,attempt_id,subject_id,topic,question,provenance,source_reference) VALUES(?,?,?,'essay','TEST ONLY pagination','TEST ONLY pagination question','practice','')");
 for($n=0;$n<51;$n++)$q->execute([cssv_uuid_v4(),$user,$attempt]);
}else throw new RuntimeException('Unknown fixture operation.');
