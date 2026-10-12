<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_ability.php';
$pdo=cssv_db();cssv_ability_ensure($pdo);$user=cssv_pro_id($argv[1]??null);$course=cssv_ability_course();$old=array_key_first($course['previous_editions']);
// Synthetic historical namespace only; never edits production accounts or data.
$pdo->prepare("UPDATE ability_responses SET course_version=?,result=JSON_SET(result,'$.ability_course_version',?) WHERE user_id=? AND unit_id='number-sense'")->execute([$old,$old,$user]);
$pdo->prepare("UPDATE ability_positions SET course_version=? WHERE user_id=? AND unit_id='number-sense'")->execute([$old,$user]);
echo $old;
