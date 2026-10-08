<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test'||getenv('CSSV_TEST_HANDWRITING_TRANSPORT')!=='1')throw new RuntimeException('Disposable labelled transport required.');
$GLOBALS['CSSV_TEST_PRECIS_TRANSPORT']=static function(array $op,array $input): array {
 if(cssv_db()->inTransaction())throw new RuntimeException('Locks held during TEST request.');
 $text=$input['student_text'];if(str_contains($text,'UNKNOWN'))throw new CssvAiUnknown('TEST ONLY ambiguous timeout');if(str_contains($text,'REJECTED'))throw new CssvAiRejected('TEST_ONLY_rejection');
 $bad=str_contains($text,'She go to school.');$changed=str_contains($text,'can never');$skills=[];
 foreach(cssv_precis_skills() as $key=>$_)$skills[]=['skill'=>$key,'status'=>($changed&&in_array($key,['central_idea','fidelity','qualifications'],true))||($bad&&$key==='grammar')?'needs_work':'supported','source_excerpt'=>mb_substr($input['original'],0,80),'student_excerpt'=>mb_substr($key==='title'?$input['title']:$text,0,80),'explanation'=>'TEST ONLY synthetic criterion evidence, not real model assessment.','hint'=>'TEST ONLY check the exact qualification and revise independently.'];
 $note=$input['central_idea_note'];$result=['summary'=>'TEST ONLY source-bound feedback. Synthetic fixture, not a claim of assessment accuracy.','findings'=>$bad?[['code'=>'subject_verb_agreement','severity'=>'moderate','excerpt'=>'She go to school.','explanation'=>'TEST ONLY agreement finding.','hint'=>'TEST ONLY check the singular subject.']]:[],'skills'=>$skills,'central_idea_note'=>['status'=>$note===''?'not_supplied':'accurate','source_excerpt'=>$note===''?'':mb_substr($input['original'],0,80),'note_excerpt'=>mb_substr($note,0,80),'explanation'=>'TEST ONLY note diagnosis.','hint'=>'TEST ONLY retain the original claim.']];
 if(str_contains($text,'MALFORMED'))$result['skills'][0]['source_excerpt']='NOT IN THE ORIGINAL';
 if(str_contains($text,'TITLE_ANCHOR'))$result['skills'][10]['student_excerpt']='NOT IN SAVED TITLE';
 return ['id'=>'TEST-only-precis-'.$op['id'],'model'=>'gpt-6-luna','status'=>'completed','usage'=>['input_tokens'=>190,'output_tokens'=>140],'output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($result,JSON_THROW_ON_ERROR)]]]]];
};
