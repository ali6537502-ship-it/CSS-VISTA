<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_learning_core.php';require __DIR__.'/../../public/api/_learning_schema.php';require __DIR__.'/../../public/api/_ai_openai.php';
function check(bool $value,string $label): void {if(!$value)throw new RuntimeException($label);}
check(cssv_ai_bucket(new DateTimeImmutable('2026-10-07T18:59:59Z'))==='2026-10-07','Before Karachi midnight');
check(cssv_ai_bucket(new DateTimeImmutable('2026-10-07T19:00:00Z'))==='2026-10-08','At Karachi midnight');
check(cssv_learning_words("Well-written words aren't numbers 27. اردو بھی۔")===7,'Documented Unicode/hyphen token counting');
$valid=['target_year'=>2027,'target_date'=>'2027-02-20','daily_minutes'=>120,'stage'=>'starting','optional_subject_ids'=>['political-science']];
check(cssv_learning_attempt_input($valid)['target_date']==='2027-02-20','Student target date');
foreach([['target_date'=>'2027-02-30'],['target_date'=>'2026-02-20'],['optional_subject_ids'=>['invented']],['daily_minutes'=>0],['optional_subject_ids'=>['political-science','political-science']]] as $bad){try{cssv_learning_attempt_input([...$valid,...$bad]);throw new RuntimeException('Invalid preparation settings accepted');}catch(InvalidArgumentException){}}
$result=['summary'=>'Work on agreement.','findings'=>[['code'=>'subject_verb_agreement','severity'=>'moderate','excerpt'=>'She go','explanation'=>'The verb does not agree with the subject.','hint'=>'Check the third-person singular form.']]];
check(cssv_writing_result($result,'She go to school.')===$result,'Anchored structured feedback');
foreach([['excerpt'=>'He go'],['code'=>'invented'],['severity'=>'critical']] as $bad){$r=$result;$r['findings'][0]=[...$r['findings'][0],...$bad];try{cssv_writing_result($r,'She go to school.');throw new RuntimeException('Invalid feedback accepted');}catch(InvalidArgumentException){}}
check(cssv_ai_usage_parse(['usage'=>['input_tokens'=>10,'output_tokens'=>5,'input_tokens_details'=>['cached_tokens'=>4]]])===['input_tokens'=>10,'output_tokens'=>5,'cached_tokens'=>4],'Token report');
check(cssv_ai_usage_parse([])['input_tokens']===null,'Missing tokens not fabricated as zero');
check(cssv_ai_usage_parse(['usage'=>['input_tokens'=>1,'input_tokens_details'=>['cached_tokens'=>4]]])['cached_tokens']===null,'Invalid cached count rejected');
check(cssv_ai_usage_parse(['usage'=>['input_tokens_details'=>'malformed']])['cached_tokens']===null,'Malformed usage details rejected');
foreach([['output'=>'malformed'],['output'=>[['type'=>'message','content'=>'malformed']]],['output'=>[['type'=>'message','content'=>[['type'=>'refusal']]]]],['output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>'invalid json']]]]]] as $bad){
 try{cssv_ai_response_result(['status'=>'completed',...$bad]);throw new RuntimeException('Malformed or refused provider output accepted');}catch(InvalidArgumentException|JsonException){}
}
$sql=file_get_contents(__DIR__.'/../../server/sql/013_learning_foundations.sql');preg_match_all('/CREATE TABLE IF NOT EXISTS [\s\S]*?;/',$sql,$m);check(array_map(fn($v)=>trim($v,"; \n\r"),$m[0])===cssv_learning_schema_statements(),'SQL/PHP parity');
echo "PASS: student targets, validation, word counts, Karachi day boundaries, findings, tokens and schema parity.\n";
