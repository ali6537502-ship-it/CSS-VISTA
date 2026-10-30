<?php
declare(strict_types=1);
const CSSV_RESET_CONTROL_KEY = '__cssv_reset_v1';
function cssv_reset_control(array $payload): array {
    $value=$payload[CSSV_RESET_CONTROL_KEY]??null;
    return is_array($value) && is_string($value['generation']??null) && is_array($value['events']??null) ? $value : ['generation'=>null,'events'=>[],'full_reset'=>null,'revision'=>0];
}
function cssv_preparation_lock(PDO $pdo,string $user): void {
    if (($GLOBALS['CSSV_PREPARATION_LOCK_OWNER']??null)===$user) return;
    $name='cssv:prep:'.$user;$q=$pdo->prepare('SELECT GET_LOCK(?,8)');$q->execute([$name]);
    if ((int)$q->fetchColumn()!==1) cssv_fail('Another study action is still saving. Please try again shortly.',409,'preparation_busy');
    $GLOBALS['CSSV_PREPARATION_LOCK_OWNER']=$user;
    register_shutdown_function(static function()use($pdo,$name){try{$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$name]);}catch(Throwable){}});
}
function cssv_preparation_guard(PDO $pdo,string $user): void {
    $method=strtoupper($_SERVER['REQUEST_METHOD']??'GET');
    if(in_array($method,['GET','HEAD','OPTIONS'],true))return;
    $script=(string)($_SERVER['SCRIPT_FILENAME']??'');$parent=basename(dirname($script));$file=basename($script);
    $affected=($parent==='student' && in_array($file,['progress.php','planner.php','grammar.php','precis.php','preparation-reset.php'],true)) || $parent==='factbook' || ($parent==='api' && $file==='current-affairs.php');
    if(!$affected)return;
    cssv_preparation_lock($pdo,$user);
    if($file==='preparation-reset.php')return;
    $q=$pdo->prepare('SELECT payload FROM student_progress WHERE user_id=?');$q->execute([$user]);$raw=$q->fetchColumn();$payload=$raw?json_decode($raw,true):[];
    $control=cssv_reset_control(is_array($payload)?$payload:[]);
    if($control['generation']!==null && !hash_equals($control['generation'],(string)($_SERVER['HTTP_X_CSSV_PREPARATION_GENERATION']??''))) cssv_fail('Preparation was reset in another tab or device. Refresh to continue with the current records.',409,'preparation_reset_required');
}
function cssv_reset_record(mixed $value): array {return is_array($value)&&(!array_is_list($value)||$value===[])?$value:[];}
function cssv_reset_matches_task(mixed $value,array $s): bool {
    $task=cssv_reset_record($value);
    if(($s['subject']??'')!=='' && ($task['subject']??null)!==$s['subject'])return false;
    if((!empty($s['start'])||!empty($s['end']))&&!is_string($task['date']??null))return false;
    $date=(string)($task['date']??'');
    return(empty($s['start'])||strcmp($date,$s['start'])>=0)&&(empty($s['end'])||strcmp($date,$s['end'])<=0);
}
function cssv_reset_snapshot(array $snapshot,array $s): array {
    $state=cssv_reset_record($snapshot['cssvista:v1']??[]);
    if($s['scope']==='attempt-plan')return $snapshot;
    if($s['scope']==='preparation'){
        $snapshotOriginal=$snapshot;
        foreach(array_keys($snapshot)as$key)if(in_array($key,['cssvista:v1','cssvista:progress:v1'],true)||str_starts_with($key,'cssvista:tool:'))unset($snapshot[$key]);
        if(($s['keep_settings']??true)&&isset($snapshotOriginal['cssvista:tool:pms-planner:v1']))$snapshot['cssvista:tool:pms-planner:v1']=$snapshotOriginal['cssvista:tool:pms-planner:v1'];
        $kept=[];if(($s['keep_settings']??true)&&!empty($state['studyPlanner']))$kept['studyPlanner']=$state['studyPlanner'];if(isset($state['vistaShortcut']))$kept['vistaShortcut']=$state['vistaShortcut'];if($kept)$snapshot['cssvista:v1']=$kept;
        return $snapshot;
    }
    if(isset($snapshot['cssvista:v1'])&&(!is_array($snapshot['cssvista:v1'])||($snapshot['cssvista:v1']!==[]&&array_is_list($snapshot['cssvista:v1']))))throw new DomainException('Saved preparation format needs review before a partial reset.');
    if(isset($state['studyScheduleTasks'])&&!is_array($state['studyScheduleTasks']))throw new DomainException('Saved timetable format needs review before a partial reset.');
    $tasks=is_array($state['studyScheduleTasks']??null)?$state['studyScheduleTasks']:[];$kept=[];$removed=[];
    foreach($tasks as$task){if($s['scope']==='planner'||cssv_reset_matches_task($task,$s))$removed[]=(string)(cssv_reset_record($task)['id']??'');else$kept[]=$task;}
    $state['studyScheduleTasks']=$kept;$archive=cssv_reset_record($snapshot['cssvista:tool:my-tasks-archive:v1']??[]);
    foreach($removed as$id)unset($archive[$id]);if(isset($snapshot['cssvista:tool:my-tasks-archive:v1'])&&is_array($snapshot['cssvista:tool:my-tasks-archive:v1']))$snapshot['cssvista:tool:my-tasks-archive:v1']=$archive?:new stdClass();
    if($s['scope']==='planner'){$state['planTaskCompletions']=new stdClass();$state['goalChecklist']=[];$state['goalText']='';$state['quickNotes']='';if(($s['keep_settings']??true)===false){$state['studyPlanner']=null;unset($snapshot['cssvista:tool:pms-planner:v1']);}}
    $snapshot['cssvista:v1']=$state;return $snapshot;
}
