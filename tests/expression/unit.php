<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_expression_core.php';
function check(bool $test,string $label): void {if(!$test)throw new RuntimeException($label);}
check(array_keys(cssv_expression_skills())===cssv_writing_codes(),'Every normalized code has an audited curriculum map.');
foreach(cssv_expression_skills() as $skill)check($skill['day']>=1 && $skill['day']<=30,'Existing course day bounds');
function sample(string $record,string $hash,bool $error): array {return ['writing_id'=>$record,'text_hash'=>$hash,'kind'=>'paragraph','created_at'=>'2026-10-07T00:00:00Z','result'=>['summary'=>'TEST','findings'=>$error?[['code'=>'subject_verb_agreement']]:[]]];}
check(cssv_expression_profile([sample('a','a',true)])['items'][0]['state']==='Insufficient evidence','One mistake is not a permanent weakness');
check(cssv_expression_profile([sample('a','copy',true),sample('b','copy',true),sample('c','copy',true)])['reviewed_wordings']===1,'Copied wording must not multiply evidence');
$old=[sample('a','a',true),sample('b','b',true),sample('c','c',true)];
check(cssv_expression_profile($old)['items'][0]['state']==='Weak','Three independent flagged records');
$better=[sample('d','d',false),sample('e','e',false),sample('f','f',false),...$old];check(cssv_expression_profile($better)['items'][0]['state']==='Improving','Recent independent feedback trend');
$rechecks=[sample('a','a',true),sample('a','rewrite1',true),sample('a','rewrite2',true)];check(cssv_expression_profile($rechecks)['items'][0]['state']==='Insufficient evidence','Rewrites of one record are not three independent tasks');
$a=['writing_id'=>'a','version'=>1,'word_count'=>4,'text_hash'=>'x','feedback'=>['findings'=>[['code'=>'subject_verb_agreement']]]];$b=['writing_id'=>'a','version'=>2,'word_count'=>4,'text_hash'=>'y','feedback'=>['findings'=>[]]];
$compare=cssv_expression_compare($a,$b);check($compare['no_longer_reported']===['subject_verb_agreement'],'Reported differences derive from saved findings');
$b['feedback']=null;check(!cssv_expression_compare($a,$b)['feedback_available'],'Missing feedback cannot imply improvement');
try{cssv_expression_compare($a,$a);throw new RuntimeException('Same version accepted');}catch(InvalidArgumentException){}
echo "PASS: curriculum mapping, evidence bounds/copy/rewrite deduplication, conservative trends and deterministic comparison.\n";
