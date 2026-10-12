<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test'||getenv('CSSV_TEST_HANDWRITING_TRANSPORT')!=='1')throw new RuntimeException('Disposable labelled transport required.');
$GLOBALS['CSSV_TEST_SKILLS_TRANSPORT']=static function(array $op,array $input): array {
 if(cssv_db()->inTransaction())throw new RuntimeException('Database lock held during TEST request.');
 $text=$input['student_text'];if(str_contains($text,'UNKNOWN'))throw new CssvAiUnknown('TEST ONLY ambiguous timeout');
 if(str_contains($text,'REJECTED'))throw new CssvAiRejected('TEST_ONLY_rejection');
 $result=['summary'=>'TEST ONLY: persistence fixture, not academic or real-provider feedback.','findings'=>[],
 'criteria'=>array_map(fn($code)=>['code'=>$code,'status'=>'developing','excerpt'=>mb_substr($text,0,50),'explanation'=>'TEST ONLY instructional rubric persistence.','hint'=>'TEST ONLY independently review the explanation.'],array_keys(cssv_skills_rubric($input['feature']))),
 'evidence_flags'=>[['excerpt'=>mb_substr($text,0,50),'status'=>'unverified','explanation'=>'TEST ONLY: no external factual verification performed.']], 'next_question'=>'TEST ONLY: what assumption would you test next?'];
 if(str_contains($text,'MALFORMED'))$result['criteria'][0]['excerpt']='NOT PRESENT IN THE SUBMITTED TEXT';
 return ['id'=>'TEST-only-skills-'.$op['id'],'model'=>'TEST-only-model','status'=>'completed','usage'=>['input_tokens'=>80,'output_tokens'=>60],
 'output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($result,JSON_THROW_ON_ERROR)]]]]];
};
