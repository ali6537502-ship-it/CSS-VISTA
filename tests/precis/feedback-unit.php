<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_precis_feedback.php';
$n=0;function checkFeedback(bool $ok,string $why):void{global $n;$n++;if(!$ok)throw new RuntimeException($why);}
function rejectFeedback(callable $f,string $why):void{try{$f();}catch(InvalidArgumentException){checkFeedback(true,$why);return;}throw new RuntimeException($why);}
$input=['original'=>'Original carefully qualifies its claim.','student_text'=>'She go to school. A qualified claim.','title'=>'Qualified claim','central_idea_note'=>'A qualified claim.','rubric'=>cssv_precis_evaluation_rubric()];
$skills=[];foreach(cssv_precis_skills() as $key=>$_)$skills[]=['skill'=>$key,'status'=>'supported','source_excerpt'=>'carefully qualifies','student_excerpt'=>$key==='title'?'Qualified claim':'qualified claim','explanation'=>'TEST ONLY explanation','hint'=>'TEST ONLY hint'];
$r=['summary'=>'TEST ONLY summary','findings'=>[['code'=>'subject_verb_agreement','severity'=>'moderate','excerpt'=>'She go to school.','explanation'=>'TEST ONLY','hint'=>'TEST ONLY']],'skills'=>$skills,'central_idea_note'=>['status'=>'accurate','source_excerpt'=>'carefully qualifies','note_excerpt'=>'qualified claim','explanation'=>'TEST ONLY','hint'=>'TEST ONLY']];
$valid=cssv_precis_feedback_result($r,$input);checkFeedback(count($valid['skills'])===12,'Missing criterion');checkFeedback($valid['findings'][0]['excerpt']==='She go to school.','Language evidence missing');
foreach(['source_excerpt','student_excerpt'] as $k){$bad=$r;$bad['skills'][0][$k]='Fabricated excerpt';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Invented evidence accepted');}
$bad=$r;$bad['skills'][10]['student_excerpt']='qualified claim';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Title checked against draft instead of title');
$bad=$r;$bad['skills'][11]['skill']='central_idea';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Duplicate skill accepted');
$bad=$r;array_pop($bad['skills']);rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Partial rubric accepted');
$bad=$r;$bad['skills'][0]['status']='mastered';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Uncalibrated mastery accepted');
$bad=$r;$bad['skills'][0]['student_excerpt']='';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Positive evidence without draft accepted');
$bad=$r;$bad['skills'][0]['status']='needs_work';$bad['skills'][0]['student_excerpt']='';checkFeedback(cssv_precis_feedback_result($bad,$input)['skills'][0]['status']==='needs_work','Missing idea cannot be diagnosed');
$bad=$r;$bad['skills'][0]['status']='not_assessed';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Unassessed evidence claim accepted');
$bad['skills'][0]['source_excerpt']='';$bad['skills'][0]['student_excerpt']='';checkFeedback(cssv_precis_feedback_result($bad,$input)['skills'][0]['status']==='not_assessed','Honest limitation rejected');
$bad=$r;$bad['central_idea_note']['note_excerpt']='Not in note';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Invented note diagnosis accepted');
$bad=$r;$bad['central_idea_note']['status']='not_supplied';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Present note ignored');
$bad=$r;$bad['official_marks']=50;rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Exam marks accepted');
$bad=$r;$bad['model_answer']='Replacement';rejectFeedback(fn()=>cssv_precis_feedback_result($bad,$input),'Complete answer accepted');
checkFeedback(cssv_precis_feedback_compare(null,$r)['available']===false,'Comparison claims unsaved evaluation');$after=$r;$after['skills'][0]['status']='needs_work';$after['findings']=[];$c=cssv_precis_feedback_compare($r,$after);checkFeedback($c['skills'][0]['after']==='needs_work','Criterion change hidden');checkFeedback($c['no_longer_reported']===['subject_verb_agreement'],'Measured findings mismatch');
$rows=[];for($i=0;$i<4;$i++)$rows[]=['source_hash'=>'one','skills'=>$after['skills']];checkFeedback(cssv_precis_writing_profile($rows)['items'][0]['state']==='Insufficient evidence','One source established weakness');
$rows=[];for($i=0;$i<3;$i++)$rows[]=['source_hash'=>'source'.$i,'skills'=>$after['skills']];checkFeedback(cssv_precis_writing_profile($rows)['items'][0]['state']==='Weak','Independent difficulties omitted');
$good=[];foreach($rows as $row)$good[]=['source_hash'=>$row['source_hash'],'skills'=>$r['skills']];checkFeedback(cssv_precis_writing_profile([...$good,...$rows])['items'][0]['state']==='Improving','Positive opportunities omitted');
$unassessed=$r;foreach($unassessed['skills'] as &$s)$s['status']='not_assessed';unset($s);$unknown=array_map(fn($row)=>['source_hash'=>$row['source_hash'],'skills'=>$unassessed['skills']],$rows);checkFeedback(cssv_precis_writing_profile([...$unknown,...$rows])['items'][0]['state']==='Weak','Omission became improvement');
checkFeedback(cssv_precis_input_hash(['b'=>['y'=>2,'x'=>1],'a'=>0])===cssv_precis_input_hash(['a'=>0,'b'=>['x'=>1,'y'=>2]]),'JSON key order changes saved snapshot integrity');

$bounded=[];for($i=0;$i<101;$i++)$bounded[]=['source_hash'=>'bounded'.$i,'skills'=>$after['skills']];$boundedProfile=cssv_precis_writing_profile($bounded);checkFeedback($boundedProfile['reviewed_sources']===100&&$boundedProfile['items'][0]['flagged_sources']===100,'Evidence exceeded the declared source sample');
$payload=cssv_precis_feedback_payload(['model'=>'TEST ONLY'],[...$input,'version_id'=>'TEST INTERNAL','source_hash'=>'TEST INTERNAL']);$sent=json_decode($payload['input'][0]['content'][0]['text'],true);checkFeedback($sent['original']===$input['original']&&$sent['title']===$input['title'],'Source/title absent from prompt');checkFeedback(!isset($sent['version_id'])&&!isset($sent['source_hash']),'Internal identifiers sent to provider');checkFeedback($payload['store']===false&&$payload['text']['format']['strict']===true,'Provider guard absent');
checkFeedback(str_contains(file_get_contents(__DIR__.'/../../server/sql/017_precis_evaluations.sql'),cssv_precis_feedback_schema_statements()[0].';'),'Migration mismatch');
echo "PASS: $n source/title/note anchors, complete rubric, no marks/models, conservative independent-source evidence, zero-call comparison and snapshot rules.\n";
