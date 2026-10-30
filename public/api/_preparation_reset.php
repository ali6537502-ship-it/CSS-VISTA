<?php
declare(strict_types=1);
require_once __DIR__.'/_preparation_reset_state.php';
function cssv_reset_selection(array $s): array {
    $allowed=['scope','subject','start','end','keep_settings','attempt_id','date'];
    if(array_diff(array_keys($s),$allowed))throw new InvalidArgumentException('Choose a supported reset option.');
    $scope=$s['scope']??'';if(!in_array($scope,['timetable','planner','preparation','attempt-plan'],true))throw new InvalidArgumentException('Choose what to reset.');
    $out=['scope'=>$scope,'keep_settings'=>$s['keep_settings']??true];if(!is_bool($out['keep_settings']))throw new InvalidArgumentException('Choose whether to keep timetable settings.');
    foreach(['start','end','date']as$key){$value=$s[$key]??'';if(!is_string($value))throw new InvalidArgumentException('Choose a valid date.');if($value!==''){$d=DateTimeImmutable::createFromFormat('!Y-m-d',$value);if(!$d||$d->format('Y-m-d')!==$value)throw new InvalidArgumentException('Choose a valid date.');$out[$key]=$value;}}
    if(isset($out['start'],$out['end'])&&$out['start']>$out['end'])throw new InvalidArgumentException('The end date must follow the start date.');
    $subject=$s['subject']??'';if(!is_string($subject)||mb_strlen($subject)>180)throw new InvalidArgumentException('Choose a valid subject.');if($subject!=='')$out['subject']=$subject;
    if($scope==='attempt-plan'){$id=$s['attempt_id']??'';if(!is_string($id)||!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/Di',$id))throw new InvalidArgumentException('Choose an account-linked plan.');$out['attempt_id']=strtolower($id);if(isset($out['subject'],$out['start'])||isset($out['end']))throw new InvalidArgumentException('Use the date of this account-linked plan.');}
    elseif(isset($s['attempt_id'])||isset($out['date']))throw new InvalidArgumentException('Choose the matching plan reset option.');
    if($scope!=='timetable'&&(isset($out['subject'])||isset($out['start'])||isset($out['end'])))throw new InvalidArgumentException('Date and subject filters apply to the personal timetable.');
    return $out;
}
function cssv_reset_schema(PDO $pdo): array {
    $q=$pdo->query('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_KEY,ORDINAL_POSITION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');$tables=[];
    foreach($q->fetchAll()as$row){$table=$row['TABLE_NAME'];$column=$row['COLUMN_NAME'];if(!preg_match('/^[a-zA-Z0-9_]+$/D',$table.$column))continue;$tables[$table]['columns'][]=$column;if($row['COLUMN_KEY']==='PRI')$tables[$table]['primary'][]=$column;}
    return $tables;
}
function cssv_reset_payload(PDO $pdo,string $user): array {
    $q=$pdo->prepare('SELECT payload FROM student_progress WHERE user_id=?');$q->execute([$user]);$raw=$q->fetchColumn();$data=$raw===false?[]:json_decode((string)$raw,true,512,JSON_THROW_ON_ERROR);if(!is_array($data))throw new RuntimeException('Unsupported saved progress format.');return $data;
}
/** Only these student-controlled records are reset. Identity, formal assessments and financial/security ledgers are never enumerated for deletion. */
function cssv_reset_targets(PDO $pdo,string $user,array $s,array $schema): array {
    $targets=[];$allPlans=in_array($s['scope'],['planner','preparation'],true);$onePlan=$s['scope']==='attempt-plan';
    if($onePlan){if(!isset($schema['preparation_attempts']))throw new OutOfBoundsException('This account-linked plan is unavailable.');$q=$pdo->prepare('SELECT id FROM preparation_attempts WHERE id=? AND user_id=?');$q->execute([$s['attempt_id'],$user]);if(!$q->fetchColumn())throw new OutOfBoundsException('This account-linked plan could not be found.');}
    if(($allPlans||$onePlan)&&isset($schema['attempt_daily_plans'])){
        $where='user_id=?';$args=[$user];if($onePlan){$where.=' AND attempt_id=?';$args[]=$s['attempt_id'];if(isset($s['date'])){$where.=' AND plan_date=?';$args[]=$s['date'];}}
        $q=$pdo->prepare('SELECT id FROM attempt_daily_plans WHERE '.$where);$q->execute($args);$planIds=$q->fetchAll(PDO::FETCH_COLUMN);
        $targets['attempt_daily_plans']=[$where,$args];
        if($allPlans){if(isset($schema['attempt_plan_tasks']))$targets['attempt_plan_tasks']=['user_id=?',[$user]];if(isset($schema['attempt_planner_events']))$targets['attempt_planner_events']=[$s['scope']==='preparation'?'user_id=?':"user_id=? AND (task_id IS NOT NULL OR event_type='plan_save')",[$user]];}
        elseif($planIds&&isset($schema['attempt_plan_tasks'])){
            $marks=implode(',',array_fill(0,count($planIds),'?'));$tw='user_id=? AND plan_id IN ('.$marks.')';$ta=[$user,...$planIds];$targets['attempt_plan_tasks']=[$tw,$ta];
            $q=$pdo->prepare('SELECT id FROM attempt_plan_tasks WHERE '.$tw);$q->execute($ta);$ids=$q->fetchAll(PDO::FETCH_COLUMN);
            if($ids&&isset($schema['attempt_planner_events']))$targets['attempt_planner_events']=['user_id=? AND task_id IN ('.implode(',',array_fill(0,count($ids),'?')).')',[$user,...$ids]];
        }
    }
    if($s['scope']==='preparation')foreach(['attempt_unit_progress','attempt_evidence_links','attempt_reading_records','grammar_progress','current_affairs_user_items','student_activity','quiz_attempts','question_attempts','factbook_entry_tags','factbook_collection_entries','factbook_entry_blocks','factbook_sources','factbook_media','factbook_revisions','factbook_entries','factbook_categories','factbook_subjects','factbook_tags','factbook_collections']as$table)if(isset($schema[$table]))$targets[$table]=['user_id=?',[$user]];
    return $targets;
}
function cssv_reset_inventory(PDO $pdo,string $user,array $s,array $schema,array $payload): array {
    $targets=cssv_reset_targets($pdo,$user,$s,$schema);$digest=hash_init('sha256');hash_update($digest,json_encode([$s,$payload],JSON_THROW_ON_ERROR));$counts=[];
    $state=cssv_reset_record($payload['cssvista:v1']??[]);$tasks=is_array($state['studyScheduleTasks']??null)?$state['studyScheduleTasks']:[];
    $counts['Timetable tasks']=count(array_filter($tasks,fn($task)=>$s['scope']==='timetable'?cssv_reset_matches_task($task,$s):$s['scope']!=='attempt-plan'));
    foreach($targets as$table=>[$where,$args]){
        $columns=$schema[$table]['columns'];$pairs=[];foreach($columns as$column){$pairs[]="'".$column."'";$pairs[]='`'.$column.'`';}
        $order=$schema[$table]['primary']??$columns;$sql='SELECT SHA2(CAST(JSON_OBJECT('.implode(',',$pairs).') AS CHAR),256) AS digest FROM `'.$table.'` WHERE '.$where.' ORDER BY '.implode(',',array_map(fn($c)=>'`'.$c.'`',$order));
        $q=$pdo->prepare($sql);$q->execute($args);$n=0;hash_update($digest,$table);while($row=$q->fetch(PDO::FETCH_ASSOC)){hash_update($digest,$row['digest']);++$n;}
        $counts[$table]=$n;
    }
    if($s['scope']==='preparation'){$counts['Saved answers']=count(is_array($state['savedAnswers']??null)?$state['savedAnswers']:[]);$counts['Bookmarks']=count(is_array($state['bookmarks']??null)?$state['bookmarks']:[]);$counts['Recorded quizzes']=count(is_array($state['quizResults']??null)?$state['quizResults']:[]);}
    return ['hash'=>hash_final($digest),'counts'=>$counts,'targets'=>$targets];
}
function cssv_reset_token(array $data): string {$encoded=rtrim(strtr(base64_encode(json_encode($data,JSON_THROW_ON_ERROR)),'+/','-_'),'=');return $encoded.'.'.cssv_hash_secret('preparation-reset:'.$encoded);}
function cssv_reset_read_token(mixed $token,string $user): array {
    if(!is_string($token)||strlen($token)>4096)throw new InvalidArgumentException('Review the reset again.');$parts=explode('.',$token);if(count($parts)!==2||!hash_equals(cssv_hash_secret('preparation-reset:'.$parts[0]),$parts[1]))throw new InvalidArgumentException('Review the reset again.');
    $decoded=base64_decode(strtr($parts[0],'-_','+/'),true);$data=$decoded===false?null:json_decode($decoded,true);if(!is_array($data)||($data['user']??null)!==$user||!is_array($data['selection']??null)||!is_int($data['expires']??null))throw new InvalidArgumentException('Review the reset again.');return $data;
}
function cssv_reset_delete_targets(PDO $pdo,string $user,array $targets): void {
    // Break only owned links pointing to tasks being removed; leave other tasks' work/status intact.
    if(isset($targets['attempt_plan_tasks'])){[$where,$args]=$targets['attempt_plan_tasks'];$q=$pdo->prepare('SELECT id FROM attempt_plan_tasks WHERE '.$where);$q->execute($args);$ids=$q->fetchAll(PDO::FETCH_COLUMN);if($ids)$pdo->prepare('UPDATE attempt_plan_tasks SET moved_to=NULL WHERE user_id=? AND moved_to IN ('.implode(',',array_fill(0,count($ids),'?')).')')->execute([$user,...$ids]);}
    // Category parents use RESTRICT, so detach the owned tree before removing it.
    if(isset($targets['factbook_categories']))$pdo->prepare('UPDATE factbook_categories SET parent_id=NULL WHERE user_id=?')->execute([$user]);
    $order=['attempt_planner_events','attempt_plan_tasks','attempt_daily_plans','attempt_unit_progress','attempt_evidence_links','attempt_reading_records','grammar_progress','current_affairs_user_items','student_activity','quiz_attempts','question_attempts','factbook_entry_tags','factbook_collection_entries','factbook_entry_blocks','factbook_sources','factbook_media','factbook_revisions','factbook_entries','factbook_categories','factbook_subjects','factbook_tags','factbook_collections'];
    foreach($order as$table)if(isset($targets[$table])){[$where,$args]=$targets[$table];$pdo->prepare('DELETE FROM `'.$table.'` WHERE '.$where)->execute($args);}
}
