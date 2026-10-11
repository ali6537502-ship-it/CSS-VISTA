<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_ability_core.php';
require_once __DIR__.'/../../public/api/_ability_schema.php';
function verify(bool $condition,string $label):void{if(!$condition)throw new RuntimeException($label);}
function rejected(callable $fn,string $label):void{try{$fn();}catch(InvalidArgumentException|OutOfBoundsException $e){return;}throw new RuntimeException($label);}
$course=cssv_ability_course();verify(count($course['units'])===21,'Topic count');
foreach($course['units'] as $unit){
    $client=cssv_ability_client_unit($unit);
    foreach($client['lessons'] as $l)foreach(['answer','proof','explanation'] as $key)verify(!isset($l['exercise'][$key]),'Exercise answer leakage');
    foreach($client['quiz'] as $q)foreach(['answer','proof','explanation'] as $key)verify(!isset($q[$key]),'Quiz answer leakage');
    foreach($unit['lessons'] as $l){verify(cssv_ability_exercise($l,$l['exercise']['answer'])['correct'],'Correct fraction rejected');verify(!cssv_ability_exercise($l,number_format(cssv_ability_number($l['exercise']['answer'])+1,8,'.',''))['correct'],'Wrong exercise accepted');}
    $choices=array_column($unit['quiz'],'answer','id');verify(cssv_ability_quiz($unit,$choices)['score']===100,'Correct quiz');
    $first=$unit['quiz'][0];$choices[$first['id']]=($first['answer']+1)%4;verify(cssv_ability_quiz($unit,$choices)['passed'],'4/5 rejected');
    $second=$unit['quiz'][1];$choices[$second['id']]=($second['answer']+1)%4;verify(!cssv_ability_quiz($unit,$choices)['passed'],'3/5 passed');
    rejected(fn()=>cssv_ability_quiz($unit,[]),'Incomplete quiz');$choices[$first['id']]='1';rejected(fn()=>cssv_ability_quiz($unit,$choices),'Noninteger quiz choice');
}
foreach(['1/0','NaN','Infinity','1e9','2+2','<script>','0/0','1/-2','1234567890123',''] as $bad)rejected(fn()=>cssv_ability_number($bad),'Invalid numeric syntax');
verify(cssv_ability_number(' 6 / 8 ')===0.75,'Equivalent fraction');verify(cssv_ability_number('-.5')===-0.5,'Negative decimal');
$fraction=cssv_ability_unit('fractions')['lessons'][1];verify(cssv_ability_exercise($fraction,'0.58')['correct'],'Recurring rounding rejected');verify(!cssv_ability_exercise($fraction,'0.581')['correct'],'Arbitrary approximate accepted');
$decimal=cssv_ability_unit('decimals')['lessons'][0];verify(!cssv_ability_exercise($decimal,'0.13')['correct'],'Terminating decimal rounded');
$integer=cssv_ability_unit('number-sense')['lessons'][0];verify(!cssv_ability_exercise($integer,'7000.001')['correct'],'Near-integer accepted');
rejected(fn()=>cssv_ability_unit('../secret'),'Traversal');rejected(fn()=>cssv_ability_lesson($course['units'][0],$course['units'][1]['lessons'][0]['id']),'Wrong-topic lesson');
$migration=file_get_contents(__DIR__.'/../../server/sql/024_general_ability.sql');preg_match_all('/CREATE TABLE IF NOT EXISTS[\s\S]*?;/',$migration,$matches);
$normal=fn($sql)=>preg_replace('/\s+/',' ',trim(rtrim($sql,';')));
verify(array_map($normal,$matches[0])===array_map($normal,cssv_ability_schema_statements()),'SQL schema parity');
echo "PASS: hidden answer keys, all exercise/quiz grading, exact/recurring numbers, invalid inputs, topic isolation and additive schema parity.\n";
