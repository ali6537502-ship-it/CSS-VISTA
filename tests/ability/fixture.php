<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
require_once __DIR__.'/../../public/api/_ability.php';
$pdo=cssv_db();cssv_ability_ensure($pdo);$user=cssv_pro_id($argv[1]??null);
$q=$pdo->prepare('SELECT COUNT(*) FROM ability_responses WHERE user_id=?');$q->execute([$user]);
$responses=(int)$q->fetchColumn();$q=$pdo->prepare('SELECT COUNT(*) FROM ai_operations WHERE user_id=?');$q->execute([$user]);
echo json_encode(['responses'=>$responses,'ai_operations'=>(int)$q->fetchColumn()],JSON_THROW_ON_ERROR);
