<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';
require_once __DIR__.'/_ability_core.php';
require_once __DIR__.'/_ability_schema.php';

function cssv_ability_ensure(PDO $pdo): void {
    static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
    if((int)$pdo->query("SELECT GET_LOCK('cssvista-ability-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('ability_schema_busy');
    try{foreach(cssv_ability_schema_statements() as $sql)$pdo->exec($sql);$ready=true;}
    finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-ability-schema-v1')");}
}
function cssv_ability_summary(PDO $pdo,string $user): array {
    $course=cssv_ability_course();$version=$course['version'];
    $compatible=[$version];foreach($course['units'] as $unit)$compatible=array_merge($compatible,cssv_ability_versions($unit['id']));$compatible=array_values(array_unique($compatible));
    $marks=implode(',',array_fill(0,count($compatible),'?'));
    $q=$pdo->prepare('SELECT course_version,unit_id,mode,lesson_id,MAX(score) AS best,COUNT(*) AS tries FROM ability_responses WHERE user_id=? AND course_version IN ('.$marks.') GROUP BY course_version,unit_id,mode,lesson_id');$q->execute([$user,...$compatible]);
    $evidence=[];foreach($q->fetchAll() as $row){
        try{$valid=in_array($row['course_version'],cssv_ability_versions($row['unit_id']),true);}catch(OutOfBoundsException){$valid=false;}
        if(!$valid)continue;
        $prior=$evidence[$row['unit_id']][$row['mode']][$row['lesson_id']]??['best'=>0,'tries'=>0];
        $evidence[$row['unit_id']][$row['mode']][$row['lesson_id']]=['best'=>max($prior['best'],(int)$row['best']),'tries'=>$prior['tries']+(int)$row['tries']];
    }
    $units=[];
    foreach($course['units'] as $unit){
        $record=$evidence[$unit['id']]??[];$done=[];
        foreach($unit['lessons'] as $lesson)if(($record['exercise'][$lesson['id']]['best']??0)===100)$done[]=$lesson['id'];
        $quiz=$record['quiz']['quiz']??['best'=>null,'tries'=>0];
        $units[]=['id'=>$unit['id'],'title'=>$unit['title'],'stage'=>$unit['stage'],'summary'=>$unit['summary'],
            'lesson_count'=>count($unit['lessons']),'lessons'=>array_map(fn($l)=>['id'=>$l['id'],'title'=>$l['title']],$unit['lessons']),
            'completed_lessons'=>$done,'quiz_best'=>$quiz['best'],'quiz_tries'=>$quiz['tries'],
            'complete'=>count($done)===count($unit['lessons'])&&($quiz['best']??0)>=80];
    }
    $q=$pdo->prepare('SELECT course_version,unit_id,lesson_id FROM ability_positions WHERE user_id=? AND course_version IN ('.$marks.') ORDER BY updated_at DESC');$q->execute([$user,...$compatible]);$position=null;
    foreach($q->fetchAll() as $row){try{if(in_array($row['course_version'],cssv_ability_versions($row['unit_id']),true)){$position=array_intersect_key($row,array_flip(['unit_id','lesson_id']));break;}}catch(OutOfBoundsException){}}

    return ['course_version'=>$version,'edition'=>$course['edition'],'attribution'=>$course['attribution'],'units'=>$units,'position'=>$position];
}
function cssv_ability_latest(PDO $pdo,string $user,string $unit): array {
    $versions=cssv_ability_versions($unit);$marks=implode(',',array_fill(0,count($versions),'?'));
    $q=$pdo->prepare('SELECT result FROM (SELECT result,ROW_NUMBER() OVER(PARTITION BY mode,lesson_id ORDER BY created_at DESC,id DESC) AS rank_num FROM ability_responses WHERE user_id=? AND course_version IN ('.$marks.') AND unit_id=?) sampled WHERE rank_num=1');
    $q->execute([$user,...$versions,$unit]);
    return array_map(fn($row)=>json_decode($row['result'],true,32,JSON_THROW_ON_ERROR),$q->fetchAll());
}
function cssv_ability_receipt(PDO $pdo,string $user,string $request): array {
    $q=$pdo->prepare('SELECT result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);$raw=$q->fetchColumn();
    $result=$raw?json_decode($raw,true,32,JSON_THROW_ON_ERROR):null;
    if(!$result||!isset($result['ability_course_version']))throw new OutOfBoundsException('Saved course request not found.');
    return $result;
}
function cssv_ability_mutation(PDO $pdo,string $user,array $body): array {
    $action=$body['action']??'';
    cssv_pro_fields($body,match($action){
        'exercise'=>['action','request_id','course_version','unit','lesson','answer'],
        'quiz'=>['action','request_id','course_version','unit','choices'],
        'position'=>['action','request_id','course_version','unit','lesson'],
        default=>throw new InvalidArgumentException('Choose a supported course action.')});
    $request=cssv_pro_id($body['request_id']??null);$payload=$body;unset($payload['request_id']);
    if(isset($payload['choices'])&&is_array($payload['choices']))ksort($payload['choices']);ksort($payload);
    $hash=hash('sha256',json_encode(['ability-v1',$payload],JSON_THROW_ON_ERROR));
    $pdo->beginTransaction();try{
        cssv_learning_owner_lock($pdo,$user);
        $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
        if($prior=$q->fetch()){
            if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This request identity was already used for different work.');
            $pdo->commit();return json_decode($prior['result'],true,32,JSON_THROW_ON_ERROR);
        }
        cssv_pro_require_active($pdo,$user);$course=cssv_ability_course();
        if(($body['course_version']??null)!==$course['version'])throw new DomainException('The course edition changed. Reload this topic before submitting new work.');
        $unit=cssv_ability_unit($body['unit']??null);$lesson=$action==='quiz'?null:cssv_ability_lesson($unit,$body['lesson']??null);
        $result=['ability_course_version'=>$course['version'],'unit_id'=>$unit['id'],'mode'=>$action];
        if($action==='exercise')$result['feedback']=cssv_ability_exercise($lesson,$body['answer']??null);
        if($action==='quiz')$result['feedback']=cssv_ability_quiz($unit,$body['choices']??null);
        if($action!=='position'){
            $result['response_id']=cssv_uuid_v4();$score=$action==='quiz'?$result['feedback']['score']:($result['feedback']['correct']?100:0);
            $pdo->prepare('INSERT INTO ability_responses(id,user_id,course_version,unit_id,mode,lesson_id,score,result) VALUES(?,?,?,?,?,?,?,?)')->execute([$result['response_id'],$user,$course['version'],$unit['id'],$action,$lesson['id']??'quiz',$score,json_encode($result,JSON_THROW_ON_ERROR)]);
        }
        $pdo->prepare('INSERT INTO ability_positions(user_id,course_version,unit_id,lesson_id) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE unit_id=VALUES(unit_id),lesson_id=VALUES(lesson_id),updated_at=NOW(6)')->execute([$user,$course['version'],$unit['id'],$lesson['id']??'quiz']);
        $pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);
        $pdo->commit();return $result;
    }catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
}
