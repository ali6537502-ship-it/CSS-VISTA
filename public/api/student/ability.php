<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_ability.php';
cssv_require_method('GET','POST');
header('X-Robots-Tag: noindex, nofollow');
try{
    $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];
    if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);
    cssv_ability_ensure($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST'){
        cssv_enforce_rate_limit($pdo,'ability_write',$user,240,3600);cssv_log_security_event($pdo,'ability_write',$user,$user);
        cssv_json(['ok'=>true,...cssv_ability_mutation($pdo,$user,cssv_request_json(16000))]);
    }
    cssv_pro_fields($_GET,['unit','view','request_id','offset']);
    if(isset($_GET['request_id']))cssv_json(['ok'=>true,...cssv_ability_receipt($pdo,$user,cssv_pro_id($_GET['request_id']))]);
    if(($_GET['view']??'')==='history'){
        $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
        if($offset===false)throw new InvalidArgumentException('Choose a valid history page.');
        $q=$pdo->prepare('SELECT result,created_at FROM ability_responses WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET '.(int)$offset);$q->execute([$user]);$rows=$q->fetchAll();
        cssv_json(['ok'=>true,'has_more'=>count($rows)>20,'history'=>array_map(fn($r)=>['saved_at'=>cssv_pro_iso($r['created_at']),...json_decode($r['result'],true,32,JSON_THROW_ON_ERROR)],array_slice($rows,0,20))]);
    }
    cssv_pro_require_active($pdo,$user);
    $result=cssv_ability_summary($pdo,$user);
    if(isset($_GET['unit'])){$unit=cssv_ability_unit($_GET['unit']);$result['unit']=cssv_ability_client_unit($unit);$result['latest']=cssv_ability_latest($pdo,$user,$unit['id']);}
    cssv_json(['ok'=>true,...$result]);
}catch(Throwable $error){
    if($error instanceof InvalidArgumentException)cssv_fail($error->getMessage(),422,'ability_invalid');
    if($error instanceof OutOfBoundsException)cssv_fail($error->getMessage(),404,'ability_not_found');
    if($error instanceof DomainException)cssv_fail($error->getMessage(),409,'ability_conflict');
    error_log('CSSV Ability request failed: '.get_class($error));cssv_fail('Your maths work could not be loaded or saved. Keep your answer and try again.',503,'ability_unavailable');
}
