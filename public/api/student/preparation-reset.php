<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
require_once dirname(__DIR__).'/_preparation_reset.php';
cssv_require_method('POST');account_require_json_origin();
$pdo=cssv_db();$session=cssv_require_user($pdo);cssv_require_csrf($session);$user=(string)$session['user_id'];
$body=cssv_request_json(12000);$action=$body['action']??'';
if(array_diff(array_keys($body),['action','selection','token','confirmation','current_password']))cssv_fail('Choose a supported reset action.',422,'reset_invalid');
try{
    if($action==='preview'){
        $s=cssv_reset_selection(cssv_reset_record($body['selection']??[]));$payload=cssv_reset_payload($pdo,$user);$inventory=cssv_reset_inventory($pdo,$user,$s,cssv_reset_schema($pdo),$payload);
        $data=['user'=>$user,'id'=>cssv_uuid_v4(),'selection'=>$s,'hash'=>$inventory['hash'],'expires'=>time()+600];
        cssv_json(['ok'=>true,'token'=>cssv_reset_token($data),'counts'=>$inventory['counts'],'selection'=>$s]);
    }
    if(!in_array($action,['reset','status'],true))throw new InvalidArgumentException('Choose a supported reset action.');
    $token=cssv_reset_read_token($body['token']??null,$user);$payload=cssv_reset_payload($pdo,$user);$control=cssv_reset_control($payload);
    foreach($control['events']as$event)if(($event['id']??null)===$token['id'])cssv_json(['ok'=>true,'accepted'=>true,'control'=>$control]);
    if($action==='status')cssv_json(['ok'=>true,'accepted'=>false]);
    if($token['expires']<time())throw new DomainException('The review expired. Review the reset again before continuing.');
    if(($body['confirmation']??null)!=='RESET')throw new InvalidArgumentException('Type RESET to confirm.');
    cssv_enforce_rate_limit($pdo,'preparation-reset-failed',$session['email'],8,900);
    $q=$pdo->prepare('SELECT password_hash FROM users WHERE id=? AND disabled_at IS NULL');$q->execute([$user]);$hash=$q->fetchColumn();$password=$body['current_password']??null;
    if(!is_string($password)||strlen($password)>1024||str_contains($password,"\0")||!is_string($hash)||!password_verify($password,$hash)){cssv_log_security_event($pdo,'preparation-reset-failed',$user,$session['email']);cssv_fail('Your current password is incorrect.',422,'invalid_current_password');}
    $s=cssv_reset_selection($token['selection']);$schema=cssv_reset_schema($pdo);
    $pdo->beginTransaction();
    $inventory=cssv_reset_inventory($pdo,$user,$s,$schema,$payload);
    if(!hash_equals($token['hash'],$inventory['hash']))throw new DomainException('Saved records changed after your review. Review the current reset details again.');
    if(count($control['events'])>=2048&&$s['scope']!=='preparation')throw new DomainException('Reset history is full. Export a backup before starting preparation again.');
    $event=[...$s,'id'=>$token['id'],'at'=>gmdate('Y-m-d\TH:i:s\Z')];$next=cssv_reset_snapshot($payload,$s);$events=$s['scope']==='preparation'?[$event]:[...$control['events'],$event];
    $newControl=['revision'=>(int)($control['revision']??0)+1,'generation'=>$event['id'],'events'=>$events,'full_reset'=>$s['scope']==='preparation'?$event['id']:($control['full_reset']??null)];$next[CSSV_RESET_CONTROL_KEY]=$newControl;
    cssv_reset_delete_targets($pdo,$user,$inventory['targets']);
    $encoded=json_encode($next,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);if(strlen($encoded)>3*1024*1024)throw new DomainException('Reset history cannot fit beside the saved progress. Export a backup before starting preparation again.');
    $pdo->prepare('INSERT INTO student_progress(user_id,payload,client_updated_at) VALUES(?,?,NOW(6)) ON DUPLICATE KEY UPDATE payload=VALUES(payload),client_updated_at=VALUES(client_updated_at)')->execute([$user,$encoded]);
    $pdo->commit();
    if($s['scope']==='preparation'&&isset($schema['factbook_media'])&&cssv_env('CSSV_PRIVATE_STORAGE_DIR')!==''&&is_dir(cssv_env('CSSV_PRIVATE_STORAGE_DIR'))){try{require_once dirname(__DIR__).'/_factbook.php';fb_clean_orphan_media($pdo,$user);}catch(Throwable){error_log('CSSV reset: owned Factbook media cleanup requires retry.');}}
    try{cssv_log_security_event($pdo,'preparation-reset-success',$user);}catch(Throwable){error_log('CSSV reset: security audit logging requires retry.');}
    cssv_json(['ok'=>true,'accepted'=>true,'control'=>$newControl]);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'reset_invalid');if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'reset_not_found');if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'reset_review_required');error_log('CSSV reset failed: '.get_class($e));cssv_fail('The reset could not be completed. No partial reset was saved. Please retry the status check.',503,'reset_unavailable');}
