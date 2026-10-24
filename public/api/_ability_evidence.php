<?php
declare(strict_types=1);
require_once __DIR__.'/_ability.php';
require_once __DIR__.'/_ability_evidence_core.php';
/** Caller enforces native entitlement and the release hold before exposing course evidence. */
function cssv_ability_evidence(PDO $pdo,string $user): array {
    $summary=cssv_ability_summary($pdo,$user);$byVersion=[];
    foreach(cssv_ability_course()['units'] as $unit)foreach(cssv_ability_versions($unit['id']) as $version)$byVersion[$version][]=$unit['id'];
    $where=[];$args=[$user];foreach($byVersion as $version=>$ids){$where[]='(course_version=? AND unit_id IN ('.implode(',',array_fill(0,count($ids),'?')).'))';array_push($args,$version,...$ids);}
    $q=$pdo->prepare('SELECT * FROM (SELECT id,unit_id,mode,lesson_id,result,COUNT(*) OVER(PARTITION BY unit_id,mode,lesson_id) tries,ROW_NUMBER() OVER(PARTITION BY unit_id,mode,lesson_id ORDER BY created_at,id) first_rank,ROW_NUMBER() OVER(PARTITION BY unit_id,mode,lesson_id ORDER BY created_at DESC,id DESC) latest_rank FROM ability_responses WHERE user_id=? AND ('.implode(' OR ',$where).')) ranked WHERE first_rank=1 OR latest_rank=1');$q->execute($args);
    $rows=[];foreach($q->fetchAll() as $row){$result=json_decode($row['result'],true,32,JSON_THROW_ON_ERROR);$row['feedback']=$result['feedback']??null;unset($row['result']);$rows[]=$row;}
    return cssv_ability_learning_evidence($summary,$rows);
}
function cssv_ability_preparation_link(array $place,string $attempt): string {
    return '/account/general-ability?'.http_build_query(['unit'=>$place['unit_id'],'lesson'=>$place['lesson_id'],'preparation'=>$attempt],'','&',PHP_QUERY_RFC3986);
}
