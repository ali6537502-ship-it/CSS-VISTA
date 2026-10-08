<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_grammar_core.php';require __DIR__.'/../../public/api/_grammar_schema.php';
function check(bool $value,string $label): void {if(!$value)throw new RuntimeException($label);}
function empty_state(): array {return ['completed'=>[],'scores'=>[],'mistakes'=>[],'notes'=>[],'currentDay'=>1,'sessions'=>[],'attempts'=>[],'lab'=>null,'labHistory'=>[],'reviews'=>[]];}
$days=cssv_grammar_catalog();$s=empty_state();$writing=cssv_expression_profile([]);$now=1791460800000;
check(count($days)===30 && count(array_merge(...array_column($days,'drill')))===360,'Existing catalog');
$s['notes']['1']=str_repeat('a',25000);check(cssv_grammar_state($s)['notes']['1']===$s['notes']['1'],'Legacy long notes preserved');
$bad=$s;$bad['scores']['1']=101;try{cssv_grammar_state($bad);throw new RuntimeException('Bad score accepted');}catch(InvalidArgumentException){}
$bad=$s;$bad['mistakes']=['unknown'];try{cssv_grammar_state($bad);throw new RuntimeException('Unknown question accepted');}catch(InvalidArgumentException){}
$s['completed']=[1];$s['scores']['1']=100;$p=cssv_grammar_profile($s,[],$writing,$now);check($p['items'][0]['state']==='Learning' && $p['totals']['questions']===0,'Completion and best score are not evidence');
$e=[];foreach($days[0]['drill'] as $q)$e[$q['id']]=$q['answer'];$p=cssv_grammar_profile($s,$e,$writing,$now);check($p['items'][0]['state']==='Practising' && $p['totals']['correct']===12,'First response grades derived from authored answers');
$first=$days[0]['drill'][0];$wrong=($first['answer']+1)%$first['options'];$old=[$first['id']=>$wrong];$new=cssv_grammar_evidence($old,['sessions'=>[['first'=>$e]],'labHistory'=>[],'lab'=>null]);check($new[$first['id']]===$wrong,'Retries never improve aggregate first evidence');
foreach(array_slice($days[0]['drill'],0,4) as $q)$e[$q['id']]=($q['answer']+1)%$q['options'];check(cssv_grammar_profile($s,$e,$writing,$now)['items'][0]['state']==='Needs review','Eight-question threshold and errors');
foreach($days[0]['drill'] as $q)$e[$q['id']]=$q['answer'];foreach(array_slice($days[0]['drill'],0,3) as $q)$s['reviews'][$q['id']]=['lastAt'=>$now-100000,'dueAt'=>$now-1,'streak'=>2,'lapses'=>1];
$p=cssv_grammar_profile($s,$e,$writing,$now);check($p['items'][0]['state']==='Improving' && $p['totals']['due']===3,'Spaced trend and due counts');
$s['mistakes']=[$days[0]['warmUp'][0]['id']];check(cssv_grammar_profile($s,$e,$writing,$now)['items'][0]['state']==='Needs review','Unresolved question overrides positive trend');
$writing['items']=[['day'=>1,'state'=>'Weak']];$s['mistakes']=[];check(cssv_grammar_profile($s,$e,$writing,$now)['items'][0]['state']==='Needs review','Independent writing weakness overrides practice');
foreach(cssv_grammar_profile($s,$e,$writing,$now)['items'] as $item)check(!in_array($item['state'],['Stable','Mastered'],true),'Uncalibrated mastery withheld');
$recovered=empty_state();$poor=[];foreach($days[0]['drill'] as $q){$poor[$q['id']]=($q['answer']+1)%$q['options'];$recovered['reviews'][$q['id']]=['lastAt'=>$now-100000,'dueAt'=>$now+100000,'streak'=>2,'lapses'=>1];}
$p=cssv_grammar_profile($recovered,$poor,cssv_expression_profile([]),$now);check($p['items'][0]['state']==='Improving' && $p['items'][0]['correct']===0 && $p['items'][0]['demonstrated_questions']===12,'Spaced revision resolves older mistakes without rewriting baseline accuracy');
$recovered['reviews'][$first['id']]['streak']=1;check(cssv_grammar_profile($recovered,$poor,cssv_expression_profile([]),$now)['items'][0]['state']==='Needs review','One later success is insufficient to clear a first-response error');
$r=['id'=>'11111111-1111-4111-8111-111111111111','mode'=>'targeted','day'=>1,'at'=>$now,'ids'=>[$first['id']],'first'=>[$first['id']=>$wrong]];$a=empty_state();$a['labHistory']=[$r];$b=empty_state();check(cssv_grammar_history($a,$b)['labHistory']===[$r],'Prior results cannot be silently deleted');
$b['labHistory']=[array_replace($r,['first'=>[$first['id']=>$first['answer']]])];try{cssv_grammar_history($a,$b);throw new RuntimeException('Recorded result changed');}catch(DomainException){}
$sql=file_get_contents(__DIR__.'/../../server/sql/015_grammar_progress.sql');preg_match_all('/CREATE TABLE IF NOT EXISTS [\s\S]*?;/',$sql,$m);check(array_map(fn($v)=>trim($v,"; \n\r"),$m[0])===cssv_grammar_schema_statements(),'SQL/PHP parity');
echo "PASS: Grammar catalog, legacy text, server validation, first-response evidence, profile thresholds, due/weak writing priority, uncalibrated mastery withheld, immutable history and SQL parity.\n";
