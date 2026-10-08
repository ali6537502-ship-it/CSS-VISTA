<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_mentor_core.php';require __DIR__.'/../../public/api/_mentor_schema.php';
$count=0;function check(bool $ok,string $why):void{global $count;$count++;if(!$ok)throw new RuntimeException($why);}
function rejects(callable $fn):void{global $count;try{$fn();}catch(InvalidArgumentException){$count++;return;}throw new RuntimeException('Invalid input was accepted.');}
$base=['obtained_marks'=>0,'maximum_marks'=>20,'evaluation_date'=>'2026-01-01'];check(cssv_mentor_evaluation_input($base)['obtained_marks']===0,'Zero marks rejected');
foreach([['obtained_marks'=>-1],['obtained_marks'=>21],['maximum_marks'=>0],['maximum_marks'=>1001],['obtained_marks'=>10.5],['obtained_marks'=>'10'],['maximum_marks'=>true],['evaluation_date'=>'2026-02-30'],['evaluation_date'=>'1999-01-01'],['evaluation_date'=>'2100-01-01']] as $invalid)rejects(fn()=>cssv_mentor_evaluation_input(array_replace($base,$invalid)));
check(cssv_mentor_date('2026-10-09',new DateTimeImmutable('2026-10-08T19:05:00Z'))==='2026-10-09','Pakistan midnight uses UTC day');rejects(fn()=>cssv_mentor_date('2026-10-09',new DateTimeImmutable('2026-10-08T18:59:00Z')));
$summary=cssv_mentor_summary([
 ['subject_id'=>'x','topic'=>'One','is_retry'=>0,'count'=>1,'obtained'=>10,'maximum'=>20],
 ['subject_id'=>'x','topic'=>'Two','is_retry'=>0,'count'=>1,'obtained'=>90,'maximum'=>100],
 ['subject_id'=>'x','topic'=>'One','is_retry'=>1,'count'=>1,'obtained'=>20,'maximum'=>20],
]);check($summary['first']['percentage']===83.3,'Unequal maxima were averaged or retry inflated first score');check($summary['first']['count']===2&&$summary['retries']['percentage']===100.0,'Repeat separation failed');check($summary['topics'][0]['priority']==='review','Low topic did not inform revision');check(cssv_mentor_summary([])['first']['percentage']===null,'No evidence became zero/full marks');
$input=['attempt_id'=>'12345678-1234-4234-8234-123456789012','subject_id'=>cssv_mentor_catalog()[0]['slug'],'topic'=>'TEST ONLY topic','question'=>'TEST ONLY practice question','provenance'=>'practice','source_reference'=>''];check(cssv_mentor_question_input($input)['provenance']==='practice','Practice provenance lost');rejects(fn()=>cssv_mentor_question_input([...$input,'provenance'=>'official']));rejects(fn()=>cssv_mentor_question_input([...$input,'provenance'=>'student_past_paper']));rejects(fn()=>cssv_mentor_question_input([...$input,'subject_id'=>'invented-subject']));
$migration=file_get_contents(__DIR__.'/../../server/sql/018_mentor_records.sql');foreach(cssv_mentor_schema_statements() as $sql)check(str_contains($migration,$sql.';'),'Runtime/schema migration mismatch');
echo "PASS: $count mentor marks, date/timezone, honest provenance, weighted evidence, repeat separation and migration assertions.\n";
