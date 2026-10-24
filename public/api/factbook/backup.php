<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_factbook_backup.php';
cssv_require_method('GET','POST');$pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];$method=$_SERVER['REQUEST_METHOD'];
$files=[];$phase='idle';$locked=false;$manifest='';
// Request termination before commit rolls back staged copies. An ambiguous commit
// retains private files: never delete bytes that may belong to committed rows.
register_shutdown_function(function()use($pdo,&$files,&$phase){if($phase==='staging'){if($pdo->inTransaction())$pdo->rollBack();foreach($files as $file)if(is_file($file)&&!is_link($file))@unlink($file);}});
try{
    if(($_SERVER['HTTP_X_CSSV_USER']??'')!==$user)cssv_fail('Open this backup through your signed-in Factbook.',403,'backup_account_required');
    if($method==='GET'&&isset($_GET['request_id'])){
        fb_backup_ensure($pdo);$request=fb_backup_id($_GET['request_id']);$q=$pdo->prepare('SELECT result FROM factbook_backup_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);$result=$q->fetchColumn();if(!$result)throw new OutOfBoundsException('No confirmed Factbook restore receipt was found for this account.');cssv_json(['ok'=>true,'result'=>json_decode($result,true,32,JSON_THROW_ON_ERROR)]);
    }
    $body=null;$request=null;$hash=null;
    if($method==='POST'){
        account_require_json_origin();cssv_require_csrf($session);$body=cssv_request_json(FB_BACKUP_BYTES);
        // Preserve JSON object/array distinctions in legacy entry bodies, too.
        if(($body['backup']['version']??null)===1){$preserved=json_decode((string)file_get_contents('php://input'),false,64,JSON_THROW_ON_ERROR);foreach($preserved->backup->entries??[] as $index=>$entry)if(is_object($entry)&&property_exists($entry,'content'))$body['backup']['entries'][$index]['content']=$entry->content;}
        if(array_diff(array_keys($body),['request_id','backup','mode','apply_preferences','confirmation'])||($body['confirmation']??'')!=='RESTORE MY FACTBOOK COPY'||!is_array($body['backup']??null)||!in_array($body['mode']??null,['new','merge'],true)||!is_bool($body['apply_preferences']??null))throw new InvalidArgumentException('Review and confirm the backup, destination mode and settings before restoring.');
        $request=fb_backup_id($body['request_id']??null);$hash=hash('sha256',json_encode(fb_backup_canonical([$body['mode'],$body['apply_preferences'],$body['backup']]),JSON_THROW_ON_ERROR));fb_backup_ensure($pdo);
    }
    $q=$pdo->prepare('SELECT GET_LOCK(?,10)');$q->execute(['factbook-'.$user]);if((int)$q->fetchColumn()!==1)throw new DomainException('Your Factbook is busy. Check its restore receipt before retrying.');$locked=true;
    if($method==='POST'){
        $q=$pdo->prepare('SELECT payload_hash,result FROM factbook_backup_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
        if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This restore reference was already used for different work.');cssv_json(['ok'=>true,'result'=>[...json_decode($prior['result'],true,32,JSON_THROW_ON_ERROR),'replayed'=>true]]);}
        fb_backup_rate($pdo,$user,'factbook_backup_restore',10,40);
        [$tables,$blobs,$rawJson]=fb_backup_graph($body['backup']);[$ids,$images]=fb_backup_validate($tables,$blobs,$user);
        $q=$pdo->prepare('SELECT COALESCE(SUM(byte_size),0) FROM factbook_media WHERE user_id=?');$q->execute([$user]);$added=array_sum(array_map(fn($image)=>$image['info']['size'],$images));if((int)$q->fetchColumn()+$added>524288000)throw new InvalidArgumentException('There is not enough private image storage for this complete restore. No records were changed.');
        $manifest=fb_backup_manifest($user,$request);fb_backup_cleanup_stages($pdo,$user);
        $phase='staging';$pdo->beginTransaction();$result=fb_backup_restore($pdo,$user,$tables,$ids,$images,$body['mode'],$body['apply_preferences'],$files,$rawJson,$manifest);
        $result+=['request_id'=>$request,'source_version'=>$body['backup']['version'],'confirmed_at'=>gmdate('c')];
        $q=$pdo->prepare('INSERT INTO factbook_backup_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)');$q->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);
        $phase='committing';$pdo->commit();$phase='committed';if(is_file($manifest))@unlink($manifest);cssv_json(['ok'=>true,'result'=>$result]);
    }
    fb_backup_rate($pdo,$user,'factbook_backup_export',20,100);
    $pdo->beginTransaction();$backup=fb_backup_export($pdo,$user);$pdo->commit();cssv_json(['ok'=>true,'backup'=>$backup]);
}catch(Throwable $error){
    if($phase!=='committing'&&$pdo->inTransaction())$pdo->rollBack();
    if($phase==='staging'){foreach($files as $file)if(is_file($file)&&!is_link($file))@unlink($file);$files=[];}
    if($error instanceof JsonException)cssv_fail('The backup contains invalid or excessively nested JSON.',422,'invalid_factbook_backup');
    if($error instanceof InvalidArgumentException)cssv_fail($error->getMessage(),422,'invalid_factbook_backup');
    if($error instanceof OutOfBoundsException)cssv_fail($error->getMessage(),404,'factbook_receipt_not_found');
    if($error instanceof DomainException)cssv_fail($error->getMessage(),409,'factbook_backup_conflict');
    error_log('CSSV Factbook backup failed: '.get_class($error));cssv_fail('The complete backup or restore could not be confirmed. Keep the original file and check the restore receipt before trying again.',503,'factbook_backup_unconfirmed');
}finally{if($locked){$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');$q->execute(['factbook-'.$user]);}}
