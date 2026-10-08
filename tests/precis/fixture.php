<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_precis.php';
$pdo=cssv_db();cssv_precis_ensure($pdo);$action=$argv[1] ?? ''; $user=$argv[2] ?? '';
if($action==='activate')$pdo->prepare('INSERT INTO pro_memberships(user_id,starts_at,expires_at) VALUES(?,NOW(6),DATE_ADD(NOW(6),INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE starts_at=VALUES(starts_at),expires_at=VALUES(expires_at)')->execute([$user]);
elseif($action==='questions')echo json_encode(cssv_precis_questions(),JSON_THROW_ON_ERROR);
elseif($action==='usage'){$q=$pdo->prepare('SELECT (SELECT COUNT(*) FROM ai_operations WHERE user_id=?)+(SELECT COUNT(*) FROM ai_daily_usage WHERE user_id=?)');$q->execute([$user,$user]);echo $q->fetchColumn();}
elseif($action==='spaced'){$q=$pdo->prepare('SELECT id FROM precis_responses WHERE user_id=? AND attempt_id=? AND question_id=? ORDER BY created_at,id LIMIT 1');$q->execute([$user,$argv[3],$argv[4]]);$first=$q->fetchColumn();$q=$pdo->prepare('SELECT MAX(created_at) FROM precis_responses WHERE user_id=? AND attempt_id=? AND question_id=?');$q->execute([$user,$argv[3],$argv[4]]);$last=$q->fetchColumn();$pdo->prepare('UPDATE precis_responses SET created_at=DATE_SUB(?,INTERVAL 3 DAY) WHERE id=?')->execute([$last,$first]);}
elseif($action==='different-original'){$owned=cssv_precis_owned($pdo,$user,$argv[3]);$source=$owned['source'];$source['text'].=' TEST ONLY simulates a different source edition.';$pdo->prepare('UPDATE precis_sources SET source=? WHERE writing_id=? AND user_id=?')->execute([json_encode($source,JSON_THROW_ON_ERROR),$argv[3],$user]);}
else throw new RuntimeException('Unknown fixture action.');
