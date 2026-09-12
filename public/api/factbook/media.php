<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_factbook.php';
cssv_require_method('GET','POST','DELETE');$pdo=cssv_db();$session=cssv_require_user($pdo);$user=$session['user_id'];$method=$_SERVER['REQUEST_METHOD'];
if($method!=='GET')cssv_require_csrf($session);
function fb_media_file(array $row,string $user): string {
    $path=(string)$row['storage_path'];
    if(!preg_match('~^'.preg_quote($user,'~').'/[a-f0-9-]{36}/[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|gif)$~i',$path))cssv_fail('This image is unavailable.',404,'image_unavailable');
    return cssv_private_storage_dir().'/factbook/'.$path;
}
if($method==='GET') {
    $row=fb_row($pdo,'factbook_media',fb_uuid($_GET['id']??null),$user);$file=fb_media_file($row,$user);
    if(!is_file($file)||is_link($file))cssv_fail('This image is unavailable.',404,'image_unavailable');
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file);if(!in_array($mime,['image/jpeg','image/png','image/webp','image/gif'],true))cssv_fail('This image is unavailable.',404,'image_unavailable');
    header('Content-Type: '.$mime);header('Content-Length: '.filesize($file));header('Content-Disposition: inline');header('X-Content-Type-Options: nosniff');header("Content-Security-Policy: default-src 'none'; sandbox");readfile($file);exit;
}
if($method==='DELETE') {
    account_require_json_origin();$body=cssv_request_json();$row=fb_row($pdo,'factbook_media',fb_uuid($body['id']??null),$user);$file=fb_media_file($row,$user);
    $pdo->prepare('DELETE FROM factbook_media WHERE id=? AND user_id=?')->execute([$row['id'],$user]);if(is_file($file))@unlink($file);cssv_json(['ok'=>true]);
}
$origin=rtrim((string)($_SERVER['HTTP_ORIGIN']??''),'/');if($origin!==''&&$origin!==rtrim((string)cssv_env('CSSV_SITE_ORIGIN','https://www.css-vista.com'),'/'))cssv_fail('Use CSS Vista to upload this image.',403,'invalid_origin');
$file=$_FILES['image']??null;if(!is_array($file)||($file['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($file['tmp_name']))cssv_fail('Choose a valid image.',422,'invalid_image');
$bytes=filesize($file['tmp_name']);$info=@getimagesize($file['tmp_name']);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$mime]??null;
if(!$bytes||$bytes>5242880||!$info||!$ext||$info[0]*$info[1]>16000000||$info[0]>10000||$info[1]>10000)cssv_fail('Choose an image under 5 MB and 16 megapixels.',422,'invalid_image');
$entry=fb_uuid($_POST['entry_id']??null);fb_row($pdo,'factbook_entries',$entry,$user);
$alt=fb_value('VARCHAR(500)',$_POST['alt_text']??'');if(trim($alt)==='')cssv_fail('Add alternative text for this image.',422,'alt_required');
$caption=fb_value('VARCHAR(1000)',$_POST['caption']??'');$source=fb_value('VARCHAR(1000)',$_POST['source']??'');$name=mb_substr(basename((string)$file['name']),0,240);
$lock='factbook-'.$user;$q=$pdo->prepare('SELECT GET_LOCK(?,10)');$q->execute([$lock]);if((int)$q->fetchColumn()!==1)cssv_fail('Your factbook is busy saving. Please try again.',409,'save_busy');
$path=$user.'/'.$entry.'/'.cssv_uuid_v4().'.'.$ext;$target=cssv_private_storage_dir('factbook/'.$user.'/'.$entry).'/'.basename($path);
try {
    $q=$pdo->prepare('SELECT COALESCE(SUM(byte_size),0) FROM factbook_media WHERE user_id=?');$q->execute([$user]);if((int)$q->fetchColumn()+$bytes>524288000)cssv_fail('Your image storage is full. Remove unused images before uploading another.',422,'storage_limit');
    $pdo->beginTransaction();fb_row($pdo,'factbook_entries',$entry,$user);
    if(!move_uploaded_file($file['tmp_name'],$target))throw new RuntimeException('image_write_failed');chmod($target,0600);
    $row=fb_insert($pdo,'factbook_media',['entry_id'=>$entry,'storage_path'=>$path,'file_name'=>$name,'mime_type'=>$mime,'byte_size'=>$bytes,'width'=>$info[0],'height'=>$info[1],'caption'=>$caption,'alt_text'=>$alt,'source'=>$source,'sha256'=>hash_file('sha256',$target)],$user);
    $pdo->commit();cssv_json(['ok'=>true,'media'=>fb_decode('factbook_media',$row)],201);
} catch(Throwable $error) {if($pdo->inTransaction())$pdo->rollBack();if(is_file($target))@unlink($target);error_log('CSSV factbook image failed: '.get_class($error));cssv_fail('The image could not be saved. Please try again.',503,'image_save_failed');}
finally {$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);}
