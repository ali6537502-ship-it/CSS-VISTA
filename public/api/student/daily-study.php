<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_topics.php';
require_once dirname(__DIR__).'/_workspace_daily_study.php';
cssv_require_method('GET');header('Cache-Control: private, no-store');header('X-Robots-Tag: noindex, nofollow');
try {
 $pdo=cssv_db();$session=cssv_require_user($pdo);$course=$_GET['course']??'';
 if(!is_string($course)||($course!==''&&!preg_match('/^[a-z0-9][a-z0-9-]{0,95}$/D',$course)))throw new InvalidArgumentException('Choose an available course.');
 $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>10000]]);if($offset===false)throw new InvalidArgumentException('Choose a valid course page.');
 cssv_topics_ensure($pdo);cssv_json(['ok'=>true,'user_id'=>$session['user_id'],...cssv_daily_study_catalog($pdo,$course,(int)$offset)]);
}catch(Throwable $error){cssv_pro_problem($error);}
