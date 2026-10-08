<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_precis.php';
$count=0;function check(bool $ok,string $why):void{global $count;$count++;if(!$ok)throw new RuntimeException($why);}
$book=cssv_precis_handbook();check(count($book['chapters'])===25,'Incomplete handbook');check(count($book['passages'])===6,'Worked passages missing');check(count(cssv_precis_course())===30,'Course sequence incomplete');
$catalog=cssv_precis_catalog();foreach($catalog['passages'] as $p){check(!isset($p['model'],$p['model_title']),'Model sent before independent writing');check(cssv_learning_words($p['text'])>=20,'Empty original passage');}
foreach($catalog['questions'] as $q)check(!isset($q['answer'],$q['explanation']),'Fixed answer leaked before a response');
$questions=cssv_precis_questions();check(count($questions)===39,'Unexpected drill inventory');foreach($questions as $q){check(isset(cssv_precis_skills()[$q['skill']]),'Unknown skill');check(isset($q['options'][$q['answer']]),'Malformed answer');check(count(array_unique($q['options']))===count($q['options']),'Duplicate distractor');}
check(count(array_unique(array_column($questions,'skill')))===12,'Skill without fixed practice');
$q=$questions['qualification-tech'];$rows=[['question_id'=>$q['id'],'choice'=>($q['answer']+1)%3,'created_at'=>'2026-10-01 12:00:00']];$profile=cssv_precis_profile($rows);$item=$profile['items'][6];check($item['state']==='Needs review'&&$item['first_correct']===0,'First wrong ignored');
$rows[]=['question_id'=>$q['id'],'choice'=>$q['answer'],'created_at'=>'2026-10-01 13:00:00'];check(cssv_precis_profile($rows)['items'][6]['state']==='Needs review','Immediate retry erased error');
$rows[1]['created_at']='2026-10-04 12:00:00';$item=cssv_precis_profile($rows)['items'][6];check($item['state']==='Improving'&&$item['first_correct']===0,'Spaced review changed baseline');
check(!array_intersect(['Stable','Mastered'],array_column(cssv_precis_profile($rows)['items'],'state')),'Recognition became writing mastery');
$rows[1]['last_wrong_at']='2026-10-04 11:50:00';check(cssv_precis_profile($rows)['items'][6]['state']==='Needs review','A recent repeat error was erased by an immediate retry');
foreach([['a real progress',3],['Don’t re-write 2026 reports.',4],['پانی اور تعلیم',3],['hello—world',2],['',0]] as [$text,$expected])check(cssv_learning_words($text)===$expected,'Word-count convention changed');
$context=cssv_precis_context(['title'=>'TEST ONLY title','scratch'=>['central_idea'=>'TEST ONLY central idea'],'self_check'=>['fidelity'=>5]]);check($context['self_check']['fidelity']===5&&$context['self_check']['title']===null,'Missing self-ratings fabricated');
try{cssv_precis_context(['title'=>'x','scratch'=>['admin'=>true],'self_check'=>[]]);throw new RuntimeException('Unknown scratch accepted');}catch(InvalidArgumentException){$count++;}
try{cssv_precis_context(['title'=>'x','scratch'=>['topic'=>'x'],'self_check'=>['fidelity'=>6]]);throw new RuntimeException('Invalid self-score accepted');}catch(InvalidArgumentException){$count++;}
check(cssv_precis_source(['passage_id'=>'example-1'])['text']===$book['passages'][0]['text'],'Trusted source changed');
$migration=(string)file_get_contents(__DIR__.'/../../server/sql/016_precis_lab.sql');foreach(cssv_precis_schema_statements() as $sql)check(str_contains($migration,$sql.';'),'Schema / SQL mismatch');
echo "PASS: $count Précis content, answer isolation, qualification, evidence, count, context and schema assertions.\n";
