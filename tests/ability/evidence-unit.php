<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_ability_core.php';
require_once __DIR__.'/../../public/api/_ability_evidence_core.php';
function check(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
$c=cssv_ability_course();$units=[];foreach($c['units'] as $u)$units[]=['id'=>$u['id'],'title'=>$u['title'],'lessons'=>array_map(fn($l)=>['id'=>$l['id']],$u['lessons']),'lesson_count'=>count($u['lessons']),'complete'=>false,'completed_lessons'=>[]];
$s=['course_version'=>$c['version'],'units'=>$units,'position'=>['unit_id'=>$units[0]['id'],'lesson_id'=>$units[0]['lessons'][0]['id']]];
$empty=cssv_ability_learning_evidence($s,[]);check($empty['first_exercises']['total']===0&&$empty['first_quizzes']['total']===0,'A saved position is not graded');check($empty['completed_topics']===0,'No inferred completion');check($empty['resume']['lesson_id']===$s['position']['lesson_id'],'Exact saved place');
$base=['unit_id'=>$units[0]['id'],'mode'=>'exercise','lesson_id'=>$units[0]['lessons'][0]['id'],'tries'=>2];
$wrong=[...$base,'id'=>'old','first_rank'=>1,'latest_rank'=>2,'feedback'=>['lesson_id'=>$base['lesson_id'],'correct'=>false]];
$right=[...$base,'id'=>'new','first_rank'=>2,'latest_rank'=>1,'feedback'=>['lesson_id'=>$base['lesson_id'],'correct'=>true]];
$s['units'][0]['completed_lessons']=[$base['lesson_id']];$fixed=cssv_ability_learning_evidence($s,[$wrong,$right]);check($fixed['first_exercises']===['correct'=>0,'total'=>1],'Retry cannot inflate first correctness');check($fixed['exercise_attempts']===2&&$fixed['repeated_exercises']===1,'Retries separate');check($fixed['latest_review']===[],'Latest corrected finding resolved');check($fixed['completed_exercises']===1,'Existing any-correct completion retained');
$again=[...$right,'id'=>'later-wrong','feedback'=>['lesson_id'=>$base['lesson_id'],'correct'=>false]];$review=cssv_ability_learning_evidence($s,[$wrong,$again]);check(count($review['latest_review'])===1&&$review['next']['reason']==='review','New wrong answer prompts review despite prior completion');check($review['revision']!==$fixed['revision'],'New evidence invalidates proposal');check(cssv_ability_learning_evidence($s,[$right,$wrong])===$fixed,'Query order cannot change evidence');
$quiz=['id'=>'quiz-first','unit_id'=>$units[0]['id'],'mode'=>'quiz','lesson_id'=>'quiz','tries'=>1,'first_rank'=>1,'latest_rank'=>1,'feedback'=>['correct'=>4,'total'=>5,'results'=>array_map(fn($i)=>['correct'=>$i<4],range(0,4))]];
$q=cssv_ability_learning_evidence($s,[$quiz]);check($q['first_quizzes']===['correct'=>4,'total'=>5,'quizzes'=>1],'First quiz points are weighted counts');check($q['quiz_attempts']===1&&$q['repeated_quizzes']===0,'One quiz counts once');check($q['latest_review'][0]['missed']===1,'A passed quiz may still have one error to review');
$bad=[...$wrong,'id'=>'invalid','feedback'=>['lesson_id'=>$base['lesson_id'],'correct'=>'true']];$b=cssv_ability_learning_evidence($s,[$bad]);check($b['unavailable_records']===1&&$b['first_exercises']['total']===0,'Malformed older evidence not invented');
$s['position']['lesson_id']='deleted-lesson';check(cssv_ability_learning_evidence($s,[])['resume']===null,'Invalid old position cannot fabricate a lesson');check($empty['scope']==='account','Maths is not misattributed to one attempt');
echo "PASS: saved-position non-credit, first/retry/latest distinctions, independent revision evidence, quiz weighting, invalid data and account scope.\n";
