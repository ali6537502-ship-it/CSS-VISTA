<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test' || getenv('CSSV_TEST_HANDWRITING_TRANSPORT')!=='1')throw new RuntimeException('Disposable labelled transport required.');
$GLOBALS['CSSV_TEST_HANDWRITING_TRANSPORT']=static function(array $op,string $input): array {
 // No external network; this fixture is never packaged with production PHP.
 $q=cssv_db()->prepare('SELECT title FROM handwriting_pages WHERE id=?');$q->execute([$op['handwriting_id']]);$title=(string)$q->fetchColumn();
 if(str_contains($title,'UNKNOWN'))throw new CssvAiUnknown('TEST ONLY timeout');
 if(str_contains($title,'REJECTED'))throw new CssvAiRejected('TEST_ONLY_rejection');
 $unreadable=str_contains($title,'UNREADABLE');
 $agreement=str_contains($input,'She go to school.');
 $result=$op['feature']==='handwriting_extract'?['readable'=>!$unreadable,'text'=>$unreadable?'':'TEST ONLY: She go to school.','uncertain'=>false,'reason'=>$unreadable?'TEST ONLY: page unreadable.':'TEST ONLY: labelled fixture transcription.']:['summary'=>$agreement?'TEST ONLY: check subject–verb agreement.':'TEST ONLY: no labelled error in this fixture wording.','findings'=>$agreement?[['code'=>'subject_verb_agreement','severity'=>'moderate','excerpt'=>'She go to school.','explanation'=>'TEST ONLY: review agreement in your next rewrite.','hint'=>'TEST ONLY: check the subject and verb.']]:[]];
 if(str_contains($title,'MALFORMED'))$result=['invented'=>'invalid shape'];
 return ['id'=>'TEST-only-'.$op['id'],'model'=>'gpt-6-luna','status'=>'completed','usage'=>['input_tokens'=>101,'output_tokens'=>33,'input_tokens_details'=>['cached_tokens'=>0]],'output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($result,JSON_THROW_ON_ERROR)]]]]];
};
