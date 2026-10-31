<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_preparation_reset.php';
function check(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
$s=['cssvista:v1'=>['studyScheduleTasks'=>[['id'=>'a','subject'=>'Punjabi','date'=>'2026-10-31'],['id'=>'b','subject'=>'English','date'=>'2026-10-31']],'studyPlanner'=>['selectedOptionals'=>['Punjabi']],'bookmarks'=>['retained'],'syllabusItemStatuses'=>['source'=>'completed']],'cssvista:progress:v1'=>['activities'=>[]],'cssvista:tool:pms-planner:v1'=>['settings'=>'{}']];
$partial=cssv_reset_snapshot($s,cssv_reset_selection(['scope'=>'timetable','subject'=>'Punjabi','start'=>'2026-10-31','end'=>'2026-10-31']));check($partial['cssvista:v1']['studyScheduleTasks'][0]['id']==='b','Partial filter');check($partial['cssvista:v1']['bookmarks']===['retained'],'Keep bookmarks');
$full=cssv_reset_snapshot($s,cssv_reset_selection(['scope'=>'preparation']));check(isset($full['cssvista:v1']['studyPlanner'],$full['cssvista:tool:pms-planner:v1']),'Both exam settings survive');check(!isset($full['cssvista:progress:v1']),'Progress removed');
check(cssv_reset_snapshot($s,cssv_reset_selection(['scope'=>'preparation','keep_settings'=>false]))===[],'Explicit settings clear');
foreach([['scope'=>'unknown'],['scope'=>'timetable','start'=>'2026-02-30'],['scope'=>'planner','subject'=>'Punjabi'],['scope'=>'timetable','user_id'=>'foreign'],['scope'=>'attempt-plan','attempt_id'=>'invalid']]as$invalid){try{cssv_reset_selection($invalid);throw new RuntimeException('Invalid reset accepted');}catch(InvalidArgumentException){}}
echo "PASS reset snapshot retention, exact date/subject filters, both examination settings, unsupported fields and scope validation.\n";
