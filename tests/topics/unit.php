<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_pro_core.php';
require_once __DIR__.'/../../public/api/_learning_core.php';
require_once __DIR__.'/../../public/api/_topics_core.php';
require_once __DIR__.'/../../public/api/_topics_schema.php';
require_once __DIR__.'/source.php';
$checks=0;
function check(bool $condition,string $message): void {global $checks;$checks++;if(!$condition)throw new RuntimeException($message);}
function invalid(callable $fn,string $message): void {try{$fn();}catch(InvalidArgumentException){check(true,$message);return;}check(false,$message);}
$source=cssv_topic_definition(cssv_test_topic());check(count($source['sections'])===3,'Source sections changed.');
$client=cssv_topic_client_content($source);foreach($client['questions'] as $q){check(!isset($q['answer']),'Answer leaked before submission.');check(!isset($q['explanation']),'Explanation leaked before submission.');}
check(!isset($client['sources'][0]['sha256']),'Raw owner-source checksum exposed in reader.');
$first=cssv_topic_grade($source,'learn',['learn-1'=>0,'learn-2'=>1,'learn-3'=>2]);check($first['score']===100&&$first['passed'],'Fixed grading failed.');
$wrong=cssv_topic_grade($source,'learn',['learn-1'=>3,'learn-2'=>3,'learn-3'=>3]);check($wrong['score']===0&&!$wrong['passed'],'Incorrect choices passed.');
invalid(fn()=>cssv_topic_grade($source,'learn',['learn-1'=>0]),'Incomplete check accepted.');
invalid(fn()=>cssv_topic_grade($source,'learn',['learn-1'=>0,'learn-2'=>1,'learn-3'=>2,'revision-1'=>0]),'Foreign question accepted.');
invalid(fn()=>cssv_topic_grade($source,'learn',['learn-1'=>'0','learn-2'=>1,'learn-3'=>2]),'Non-integer answer accepted.');
foreach(['answer'=>4,'section_id'=>'missing'] as $field=>$value){$bad=$source;$bad['questions'][0][$field]=$value;invalid(fn()=>cssv_topic_definition($bad),'Malformed question accepted.');}
$bad=$source;$bad['questions'][0]['options'][1]=$bad['questions'][0]['options'][0];invalid(fn()=>cssv_topic_definition($bad),'Duplicate distractors accepted.');
$bad=$source;$bad['sections'][0]['reference_ids']=['missing'];invalid(fn()=>cssv_topic_definition($bad),'Unbound source accepted.');
$bad=$source;$bad['references'][0]['url']='http://example.invalid';invalid(fn()=>cssv_topic_definition($bad),'Untrusted protocol accepted.');
$bad=$source;$bad['references'][0]['url']='https://127.0.0.1/secret';invalid(fn()=>cssv_topic_definition($bad),'Private reference accepted.');
$bad=$source;$bad['questions'][1]['prompt']=strtoupper($bad['questions'][0]['prompt']);invalid(fn()=>cssv_topic_definition($bad),'Repeated prompt accepted.');
$bad=$source;$bad['references'][0]['document_date']='2099-01-01';invalid(fn()=>cssv_topic_definition($bad),'Future reference document accepted.');
$bad=$source;$bad['sources'][0]['sha256']='not-a-hash';invalid(fn()=>cssv_topic_definition($bad),'Missing source checksum accepted.');
$bad=$source;$bad['as_of']='2099-01-01';invalid(fn()=>cssv_topic_definition($bad),'Future claims published.');
invalid(fn()=>cssv_topic_date('2026-02-30'),'Impossible calendar date accepted.');
invalid(fn()=>cssv_topic_slug('../private'),'Path traversal topic accepted.');
$progress=['started_at'=>null,'completed'=>[],'draft_words'=>0,'learn_score'=>null,'next_revision'=>null];
check(cssv_topic_state($progress,$source,'2026-10-08')==='not_started','Page view or bookmark invented learning.');
$progress['started_at']='2026-10-08T00:00:00Z';check(cssv_topic_state($progress,$source,'2026-10-08')==='learning','Start state wrong.');
$progress['completed']=['concept-1','concept-2','concept-3'];check(cssv_topic_state($progress,$source,'2026-10-08')==='learning','Study declaration invented understanding.');
$progress['learn_score']=100;check(cssv_topic_state($progress,$source,'2026-10-08')==='understood','Understanding state wrong.');
$progress['draft_words']=50;check(cssv_topic_state($progress,$source,'2026-10-08')==='practised','Independent writing was not recorded as practice.');
$progress['next_revision']='2026-10-08';check(cssv_topic_state($progress,$source,'2026-10-08')==='revision_due','Due state wrong.');
$progress['next_revision']='2026-10-09';$progress['revision_score']=100;$progress['review_count']=1;check(cssv_topic_state($progress,$source,'2026-10-08')==='mastered','Successful independent recall not reflected.');
$progress['revision_score']=0;check(cssv_topic_state($progress,$source,'2026-10-08')==='practised','Failed recall retained current mastery.');
check(cssv_topic_add_days('2026-12-31',1)==='2027-01-01','Revision date rollover wrong.');
$sql=file_get_contents(__DIR__.'/../../server/sql/022_native_pro_topics.sql');$expected=array_values(array_filter(array_map('trim',explode(';',$sql))));check($expected===cssv_topics_schema_statements(),'Runtime migration differs from SQL.');
check(cssv_topic_hash($source)!==cssv_topic_hash([...$source,'title'=>'Corrected title']),'Corrected source retained its old version hash.');
echo 'PASS: '.$checks." source, grading, state, dates, private payload and migration assertions.\n";
