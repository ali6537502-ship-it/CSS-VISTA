<?php
declare(strict_types=1);
require_once __DIR__.'/_learning_core.php';
function cssv_mentor_catalog(): array {
 $data=json_decode((string)file_get_contents(dirname(__DIR__).'/fpsc-syllabus.json'),true,64,JSON_THROW_ON_ERROR);
 return array_values(array_map(fn($s)=>array_intersect_key($s,array_flip(['slug','name','designation'])), $data['subjects']));
}
function cssv_mentor_date(mixed $value, ?DateTimeImmutable $now=null): string {
 if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value))throw new InvalidArgumentException('Choose a valid date.');
 $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value,new DateTimeZone('Asia/Karachi'));
 $today=($now??new DateTimeImmutable('now'))->setTimezone(new DateTimeZone('Asia/Karachi'))->format('Y-m-d');
 if(!$date||$date->format('Y-m-d')!==$value||$value<'2000-01-01'||$value>$today)throw new InvalidArgumentException('Choose a date from 2000 through today in Pakistan.');
 return $value;
}
function cssv_mentor_question_input(array $body): array {
 $subject=$body['subject_id']??null;
 if(!is_string($subject)||!in_array($subject,array_column(cssv_mentor_catalog(),'slug'),true))throw new InvalidArgumentException('Choose a subject from the syllabus catalogue.');
 $provenance=$body['provenance']??null;
 if(!in_array($provenance,['practice','student_past_paper'],true))throw new InvalidArgumentException('Choose practice or a student-provided past-paper reference.');
 return ['attempt_id'=>cssv_pro_id($body['attempt_id']??null),'subject_id'=>$subject,'topic'=>cssv_learning_string($body['topic']??null,180,'topic'),'question'=>cssv_learning_string($body['question']??null,6000,'question'),'provenance'=>$provenance,'source_reference'=>cssv_learning_string($body['source_reference']??'',500,'source reference',$provenance==='practice')];
}
function cssv_mentor_evaluation_input(array $body): array {
 $obtained=$body['obtained_marks']??null;$maximum=$body['maximum_marks']??null;
 if(!is_int($obtained)||!is_int($maximum)||$maximum<1||$maximum>1000||$obtained<0||$obtained>$maximum)throw new InvalidArgumentException('Use whole marks: maximum 1–1000, obtained 0 through the maximum.');
 return ['obtained_marks'=>$obtained,'maximum_marks'=>$maximum,'evaluation_date'=>cssv_mentor_date($body['evaluation_date']??null),'mentor_comment'=>cssv_learning_string($body['mentor_comment']??'',4000,'mentor comment',true),'correction_reason'=>cssv_learning_string($body['correction_reason']??'',500,'correction reason',true)];
}
function cssv_mentor_percentage(int $obtained,int $maximum): ?float { return $maximum>0 ? round(100*$obtained/$maximum,1) : null; }
function cssv_mentor_summary(array $groups): array {
 $first=['count'=>0,'obtained'=>0,'maximum'=>0];$retries=$first;$topics=[];
 foreach($groups as $g){
  $retry=(int)$g['is_retry']===1;$count=(int)$g['count'];$obtained=(int)$g['obtained'];$maximum=(int)$g['maximum'];
  if($retry){$retries['count']+=$count;$retries['obtained']+=$obtained;$retries['maximum']+=$maximum;}
  else{$first['count']+=$count;$first['obtained']+=$obtained;$first['maximum']+=$maximum;$topics[]=['subject_id'=>$g['subject_id'],'topic'=>$g['topic'],'count'=>$count,'obtained'=>$obtained,'maximum'=>$maximum,'percentage'=>cssv_mentor_percentage($obtained,$maximum)];}
 }
 foreach($topics as &$topic)$topic['priority']=$topic['percentage']<60 ? 'review' : 'continue';unset($topic);
 usort($topics,fn($a,$b)=>($a['percentage']<=>$b['percentage'])?:strcmp($a['subject_id'].'/'.$a['topic'],$b['subject_id'].'/'.$b['topic']));
 foreach(['first','retries'] as $key){${$key}['percentage']=cssv_mentor_percentage(${$key}['obtained'],${$key}['maximum']);}
 return ['first'=>$first,'retries'=>$retries,'topics'=>$topics];
}
