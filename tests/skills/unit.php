<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_skills_ai.php';
function check(bool $ok,string $why): void {if(!$ok)throw new RuntimeException($why);}
function rejects(callable $call): void {try{$call();}catch(InvalidArgumentException|OutOfBoundsException){return;}throw new RuntimeException('Unsafe input accepted.');}
check(cssv_skills_hash(['b'=>['y'=>2,'x'=>1],'a'=>0])===cssv_skills_hash(['a'=>0,'b'=>['x'=>1,'y'=>2]]),'MySQL object key order invalidated saved context.');
check(cssv_skills_hash(['a'=>['one','two']])!==cssv_skills_hash(['a'=>['two','one']]),'List ordering must remain significant.');
$package=cssv_skills_package();check(count($package['lessons'])===51,'Curriculum scope changed.');$ids=[];$counts=[];
foreach($package['lessons'] as $lesson){
 check(!isset($ids[$lesson['id']]),'Repeated identity.');$ids[$lesson['id']]=true;$counts[$lesson['feature']]=($counts[$lesson['feature']]??0)+1;
 $source=cssv_skills_source($lesson['feature'],$lesson['id'],$lesson['level']);
 check(count(array_unique($source['check']['options']))===4,'Ambiguous repeated options.');check(is_int($source['check']['answer'])&&$source['check']['answer']>=0&&$source['check']['answer']<4,'Invalid answer.');
 foreach(['explanation','example','task','attribution'] as $key)check(is_string($source[$key]??null)&&mb_strlen($source[$key])>20,'Incomplete teaching field '.$key);
 check(!isset(cssv_skills_public_source($source)['check']['answer']),'Answer leaked before attempt.');
 check(cssv_skills_evidence($source,[])['recorded']===[],'Opening awarded learning evidence.');
 check(!cssv_skills_evidence($source,['check'=>($source['check']['answer']+1)%4])['all_recorded'],'Wrong fixed check passed.');
 rejects(fn()=>cssv_skills_answers(['mastery'=>100],$source));rejects(fn()=>cssv_skills_answers(['check'=>'0'],$source));
}
check($counts===['sentence'=>21,'argument'=>15,'analysis'=>15],'Feature coverage mismatch.');
$roadmap=json_decode(file_get_contents(__DIR__.'/../../public/study-material/essay-themes.json'),true,64,JSON_THROW_ON_ERROR);
foreach($roadmap['themes'] as $theme)foreach(['beginner','intermediate','advanced'] as $level){
 $source=cssv_skills_source('essay',$theme['slug'],$level);check(count($source['stages'])===7,'Missing essay stage.');check($source['roadmap']['sections']===$theme['sections'],'Research directions altered.');
 check(!cssv_skills_evidence($source,[])['all_recorded'],'Essay opening completed learning.');
}
$input=['feature'=>'argument','student_text'=>'This statistic is unverified until a dated source is checked.'];
$data=['summary'=>'The supplied wording states its limitation.','findings'=>[],'criteria'=>array_map(fn($code)=>['code'=>$code,'status'=>'developing','excerpt'=>'This statistic','explanation'=>'The source is still needed.','hint'=>'Find a dated primary source.'],array_keys(cssv_skills_rubric('argument'))),'evidence_flags'=>[['excerpt'=>'This statistic','status'=>'unverified','explanation'=>'No independent source is provided.']],'next_question'=>'What observation would challenge your reason?'];
check(count(cssv_skills_ai_result($data,$input)['criteria'])===8,'Rubric lost.');
$bad=$data;$bad['criteria'][0]['excerpt']='invented student quote';rejects(fn()=>cssv_skills_ai_result($bad,$input));
$bad=$data;$bad['evidence_flags'][0]['status']='verified';rejects(fn()=>cssv_skills_ai_result($bad,$input));
$bad=$data;$bad['summary']='Your score is 90';rejects(fn()=>cssv_skills_ai_result($bad,$input));
$bad=$data;$bad['criteria'][1]['code']=$bad['criteria'][0]['code'];rejects(fn()=>cssv_skills_ai_result($bad,$input));
$minimal=cssv_skills_ai_payload(['model'=>'TEST-only-model'],[...$input,'version_id'=>'PRIVATE-VERSION-DO-NOT-SEND','text_hash'=>'PRIVATE-HASH-DO-NOT-SEND','policy_hash'=>'PRIVATE-NOTICE-DO-NOT-SEND']);
check($minimal['store']===false&&!isset($minimal['tools']),'Provider persistence/tools unexpectedly enabled.');check(!str_contains(json_encode($minimal),'DO-NOT-SEND'),'Internal account context sent to provider.');
check(cssv_ai_features()['argumentation']===0&&cssv_ai_features()['analysis']===0&&cssv_ai_features()['essay']===0,'Unapproved default allowance.');
$sql=implode(";\n\n",cssv_skills_schema_statements()).";\n";
check(trim(preg_replace('/^--[^\n]*\n/m','',file_get_contents(__DIR__.'/../../server/sql/025_integrated_skills.sql')))===trim($sql),'Migration/runtime schema differ.');
echo "PASS skills curriculum scope, all theme levels, preserved roadmap, evidence boundaries, anchored rubrics, no invented marks and additive schema parity\n";
