<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_handwriting.php';
cssv_require_method('GET');
try{
 $pdo=cssv_db();$session=cssv_require_user($pdo);cssv_handwriting_ensure($pdo);$id=cssv_pro_id($_GET['page_id']??null);$page=cssv_handwriting_page($pdo,$id,$session['user_id']);
 if(!cssv_handwriting_image_available($page)){cssv_handwriting_purge($pdo,$id);throw new OutOfBoundsException('This temporary image is no longer available.');}
 $file=cssv_handwriting_file($page);if(!is_file($file))throw new OutOfBoundsException('This temporary image is no longer available.');
 $handle=@fopen($file,'rb');if(!$handle)throw new OutOfBoundsException('This temporary image is no longer available.');$size=fstat($handle)['size'];
 header('Content-Type: image/jpeg');header('Content-Length: '.$size);header('Content-Disposition: inline');header("Content-Security-Policy: default-src 'none'; sandbox");@fpassthru($handle);fclose($handle);exit;
}catch(Throwable $e){cssv_handwriting_problem($e);}
