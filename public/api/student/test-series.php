<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_native_admin.php';require_once dirname(__DIR__).'/_factbook.php';
cssv_require_method('POST');account_require_json_origin();$pdo=cssv_db();$session=cssv_require_user($pdo);cssv_require_csrf($session);$body=cssv_request_json(131072);
$id=native_text($body['request_id']??null,180,true);$name=native_text($body['student_name']??null,180,true);$phone=native_text($body['phone']??'',40);$mode=native_text($body['scheduling_mode']??null,24,true);
if(!in_array($mode,['automatic','fixed-gap'],true))cssv_fail('Choose a scheduling mode.',422,'invalid_schedule');
$count=$body['test_count']??null;$duration=$body['duration_days']??null;$gap=$body['gap_days']??null;
if(!is_int($count)||$count<1||$count>60||!is_int($duration)||$duration<1||$duration>730||!is_int($gap)||$gap<0||$gap>730)cssv_fail('Check the number of tests and schedule duration.',422,'invalid_schedule');
$subjects=$body['subjects']??null;$schedule=$body['schedule']??null;
if(!is_array($subjects)||count($subjects)<1||count($subjects)>100||!is_array($schedule)||count($schedule)!==$count)cssv_fail('Choose subjects and a complete schedule.',422,'invalid_schedule');
$subjects=array_map(fn($s)=>native_text($s,180,true),$subjects);$dates=[];
foreach($schedule as $index=>$item) {if(!is_array($item))cssv_fail('Check each scheduled test.',422,'invalid_schedule');$date=fb_value('DATE',$item['date']??'');$subject=native_text($item['subject']??null,180,true);if(!in_array($subject,$subjects,true))cssv_fail('A scheduled subject was not selected.',422,'invalid_subject');$dates[]=['number'=>$index+1,'date'=>$date,'subject'=>$subject,'syllabus'=>native_text($item['syllabus']??'',4000)];}
$start=fb_value('DATE',$body['start_date']??'');$unit=$body['unit_price']??null;$total=$body['total_fee']??null;
if(($unit!==null&&(!is_int($unit)||$unit<0||$unit>1000000))||($total!==null&&(!is_int($total)||$total<0||$total>60000000)))cssv_fail('The estimated fee is invalid.',422,'invalid_fee');
// These are student-proposed estimates. Payment and final pricing require owner confirmation.
if($unit!==null)$total=$unit*$count;
try {$pdo->beginTransaction();$q=$pdo->prepare('SELECT user_id,status FROM custom_test_series_requests WHERE request_id=? FOR UPDATE');$q->execute([$id]);$old=$q->fetch();
if($old&&$old['user_id']!==$session['user_id'])cssv_fail('Choose a new request reference.',409,'request_conflict');
if($old&&$old['status']!=='submitted')cssv_fail('This request is already being reviewed. Contact your mentor to change it.',409,'request_in_review');
$args=[$id,$session['user_id'],$name,$session['email'],$phone,json_encode($subjects,JSON_THROW_ON_ERROR),$count,$mode,$start,$duration,$gap,json_encode($dates,JSON_THROW_ON_ERROR),$unit,$total];
$pdo->prepare("INSERT INTO custom_test_series_requests(request_id,user_id,student_name,student_email,phone,subjects,test_count,scheduling_mode,start_date,duration_days,gap_days,schedule,unit_price,total_fee,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(6)) ON DUPLICATE KEY UPDATE student_name=VALUES(student_name),phone=VALUES(phone),subjects=VALUES(subjects),test_count=VALUES(test_count),scheduling_mode=VALUES(scheduling_mode),start_date=VALUES(start_date),duration_days=VALUES(duration_days),gap_days=VALUES(gap_days),schedule=VALUES(schedule),unit_price=VALUES(unit_price),total_fee=VALUES(total_fee)")->execute($args);$pdo->commit();cssv_json(['ok'=>true]);}
catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('CSSV test-series request failed: '.get_class($e));cssv_fail('Your request could not be saved. Please try again.',503,'request_failed');}
