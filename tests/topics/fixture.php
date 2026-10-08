<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_topics.php';require_once __DIR__.'/source.php';
$pdo=cssv_db();cssv_topics_ensure($pdo);$action=$argv[1]??'';
if($action==='definition'){echo json_encode(cssv_test_topic($argv[2]??'test-only-native-topic'),JSON_THROW_ON_ERROR);}
elseif($action==='due'){$pdo->prepare('UPDATE attempt_topic_progress SET next_revision=? WHERE user_id=? AND attempt_id=? AND topic_version_id=?')->execute([cssv_topic_today(),$argv[2],$argv[3],$argv[4]]);}
elseif($action==='counts'){$q=$pdo->prepare('SELECT COUNT(*) FROM attempt_topic_checks WHERE user_id=? AND attempt_id=?');$q->execute([$argv[2],$argv[3]]);echo json_encode(['checks'=>(int)$q->fetchColumn(),'ai_operations'=>(int)$pdo->query('SELECT COUNT(*) FROM ai_operations WHERE user_id='.$pdo->quote($argv[2]))->fetchColumn()]);}
elseif($action==='reset-rate'){$pdo->exec("DELETE FROM login_security_events WHERE event_type IN ('topic_write','topic_publish')");}
else throw new RuntimeException('Unknown fixture action.');
