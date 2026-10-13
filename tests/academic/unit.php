<?php
declare(strict_types=1);
require_once __DIR__.'/export.php';require_once __DIR__.'/../../public/api/_handwriting_core.php';
function verify(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
function denied(callable $fn):void{try{$fn();}catch(InvalidArgumentException){return;}throw new RuntimeException('Unsafe academic evidence accepted.');}
$p=json_decode((string)file_get_contents(__DIR__.'/cases.json'),true,64,JSON_THROW_ON_ERROR);$seen=[];$counts=[];
foreach($p['cases'] as $c){verify(!isset($seen[$c['id']]),'Duplicate case identity');$seen[$c['id']]=true;$counts[$c['feature']]=($counts[$c['feature']]??0)+1;verify(count($c['review_expectations'])>0&&count($c['unacceptable_behavior'])>=2,'Missing semantic review criteria');if($c['feature']!=='handwriting_extract')verify(strlen($c['student_text'])>20,'Empty student case');else verify($c['context']['genuine_image_required']===true,'Generated image masquerades as genuine');}
verify(count($seen)===45&&count($counts)===8,'Required coverage missing');
$c=$p['cases'][0];$op=['id'=>'TEST-only-operation','feature'=>'sentence','state'=>'succeeded','model'=>'TEST-only-model','reported_model'=>'TEST-only-model','provider_response_id'=>'TEST-only-response','prompt_version'=>'writing-feedback-v1','result'=>['summary'=>'TEST ONLY','findings'=>[]]];
denied(fn()=>cssv_academic_packet($c,$op,['student_text'=>$c['student_text']]));$op['state']='unknown';denied(fn()=>cssv_academic_packet($c,$op,['student_text'=>$c['student_text']]));
denied(fn()=>cssv_handwriting_extraction_result(['readable'=>true,'text'=>'Visible words in a paragraph.','uncertain'=>true,'reason'=>'Confidence: 97%']));
$r=cssv_handwriting_extraction_result(['readable'=>true,'text'=>'Visible words [unreadable] in a paragraph.','uncertain'=>false,'reason'=>'The unclear word needs student confirmation.']);verify($r['uncertain']===true,'Uncertainty lost');
echo "PASS 45 original academic cases, reviewed expectations, genuine-image boundaries, no fake/unknown provider evidence and no fabricated OCR confidence. Actual model academic review remains blocked.\n";
