<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_topics.php';
cssv_require_method('GET','POST');
try{
    $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_topics_ensure($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST'){cssv_enforce_rate_limit($pdo,'topic_write',$user,240,3600);cssv_log_security_event($pdo,'topic_write',$user,$user);cssv_json(['ok'=>true,...cssv_topic_mutation($pdo,$user,cssv_request_json(80000))]);}
    if(isset($_GET['request_id'])){$q=$pdo->prepare('SELECT result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,cssv_pro_id($_GET['request_id'])]);$receipt=$q->fetchColumn();if(!$receipt)throw new OutOfBoundsException('Topic save receipt not found.');$result=json_decode($receipt,true,64,JSON_THROW_ON_ERROR);if(!isset($result['topic_version_id']))throw new OutOfBoundsException('Topic save receipt not found.');cssv_json(['ok'=>true,...$result]);}
    $attempt=isset($_GET['attempt'])?cssv_pro_id($_GET['attempt']):null;$topic=isset($_GET['topic'])?cssv_topic_slug($_GET['topic']):null;
    $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Choose a valid page.');
    if(($_GET['view']??'')==='history'){if(!$attempt)throw new InvalidArgumentException('Choose a preparation attempt.');cssv_json(['ok'=>true,...cssv_topic_history($pdo,$user,$attempt,$topic,$offset)]);}
    if($topic){if(!$attempt)throw new InvalidArgumentException('Choose a preparation attempt.');cssv_json(['ok'=>true,...cssv_topic_detail($pdo,$user,$attempt,$topic)]);}
    $category=$_GET['category']??'';$search=$_GET['search']??'';if(!is_string($category)||!is_string($search)||mb_strlen($search)>120)throw new InvalidArgumentException('Check topic filters.');
    cssv_json(['ok'=>true,...cssv_topic_catalog($pdo,$user,$attempt,$offset,$category,trim($search))]);
}catch(Throwable $e){cssv_pro_problem($e);}
