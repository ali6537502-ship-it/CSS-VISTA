<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test' || getenv('CSSV_TEST_HANDWRITING_TRANSPORT')!=='1')throw new RuntimeException('Disposable labelled transport required.');
$GLOBALS['CSSV_TEST_EXPRESSION_TRANSPORT']=static function(array $op,string $text): array {
 if(cssv_db()->inTransaction())throw new RuntimeException('Database locks held during TEST provider request.');
 if(str_contains($text,'UNKNOWN'))throw new CssvAiUnknown('TEST ONLY ambiguous timeout');
 if(str_contains($text,'REJECTED'))throw new CssvAiRejected('TEST_ONLY_rejection');
 $agreement=str_contains($text,'She go to school.');
 $result=['summary'=>$agreement?'TEST ONLY: review agreement in your own revision.':'TEST ONLY: no labelled agreement finding in this fixture wording.','findings'=>$agreement?[['code'=>'subject_verb_agreement','severity'=>'moderate','excerpt'=>'She go to school.','explanation'=>'TEST ONLY: subject and verb need agreement.','hint'=>'TEST ONLY: check the verb form after the singular subject.']]:[]];
 if(str_contains($text,'MALFORMED'))$result['findings']=[['code'=>'article_usage','severity'=>'minor','excerpt'=>'NOT IN SUBMITTED TEXT','explanation'=>'TEST ONLY invalid anchor','hint'=>'TEST ONLY']];
 return ['id'=>'TEST-only-expression-'.$op['id'],'model'=>'gpt-6-luna','status'=>'completed','usage'=>['input_tokens'=>91,'output_tokens'=>42],'output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($result,JSON_THROW_ON_ERROR)]]]]];
};
