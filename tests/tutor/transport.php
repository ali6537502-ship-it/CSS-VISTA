<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test'||getenv('CSSV_TEST_HANDWRITING_TRANSPORT')!=='1')throw new RuntimeException('Disposable labelled transport required.');
$GLOBALS['CSSV_TEST_TUTOR_TRANSPORT']=static function(array $op,array $input): array {
 if(cssv_db()->inTransaction())throw new RuntimeException('TEST request holds a transaction.');
 $question=$input['question'];if(str_contains($question,'UNKNOWN'))throw new CssvAiUnknown('TEST ONLY timeout');if(str_contains($question,'REJECTED'))throw new CssvAiRejected('TEST_ONLY_rejection');
 $result=['status'=>'answered','explanation'=>'TEST ONLY synthetic conceptual explanation. Not a verified model assessment.','steps'=>['TEST ONLY reread the relevant rule and explain it in your own words.'],'check_question'=>'TEST ONLY which part of the rule supports your reasoning?','citations'=>[['quote'=>mb_substr($input['context']['text'],0,100)]],'limitation'=>'TEST ONLY disposable output; real provider accuracy is not asserted.'];
 if(str_contains($question,'MALFORMED'))$result['citations'][0]['quote']='TEST ONLY QUOTE NOT FOUND IN THE CONTEXT';
 if(str_contains($question,'BAD_MARKS'))$result['explanation']='Your score is 18 marks.';
 if(str_contains($question,'EXTERNAL_LINK'))$result['explanation']='Visit https://invented.example.invalid/fake';
 if(str_contains($question,'MORE_CONTEXT'))$result=['status'=>'needs_context','explanation'=>'TEST ONLY the selected source does not explain this concept.','steps'=>[],'check_question'=>'','citations'=>[],'limitation'=>'TEST ONLY open additional reviewed source material.'];
 return ['id'=>'TEST-only-tutor-'.$op['id'],'model'=>'gpt-6-luna','status'=>str_contains($question,'UNRESOLVED_STATUS')?'queued':'completed','usage'=>['input_tokens'=>160,'input_tokens_details'=>['cached_tokens'=>25],'output_tokens'=>110],'output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($result,JSON_THROW_ON_ERROR)]]]]];
};
