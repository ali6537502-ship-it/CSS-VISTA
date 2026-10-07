<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_handwriting_provider.php';
$pdo=cssv_db();cssv_handwriting_ensure($pdo);$action=$argv[1]??'';
if($action==='config'){
 $pdo->exec("DELETE FROM login_security_events WHERE event_type='handwriting_write'");
 $path=getenv('CSSV_CONFIG_FILE');if(!$path || !str_starts_with($path,'/tmp/cssv-pro-private/'))throw new RuntimeException('Disposable private configuration required.');
 $config=is_file($path)?require $path:[];$on=($argv[2]??'off')==='on';
 $config=array_merge($config,['CSSV_AI_ENABLED'=>$on?'1':'0','CSSV_AI_APPROVED'=>'1','CSSV_AI_MODEL_VERIFIED'=>'1','CSSV_OPENAI_API_KEY'=>'TEST-ONLY-NO-PROVIDER-NETWORK','CSSV_HANDWRITING_ENABLED'=>$on?'1':'0','CSSV_AI_VISION_VERIFIED'=>'1','CSSV_HANDWRITING_CLEANUP_VERIFIED'=>'1','CSSV_AI_LIMIT_HANDWRITING'=>'3','CSSV_AI_LIMIT_HANDWRITING_EXTRACT'=>'6','CSSV_HANDWRITING_RETENTION_SECONDS'=>'3600','CSSV_HANDWRITING_POLICY_VERSION'=>'TEST-only-v1','CSSV_HANDWRITING_PROCESSING_NOTICE'=>'TEST ONLY: this disposable test uses labelled synthetic extraction and feedback; no image or text reaches an external provider.']);
 file_put_contents($path,"<?php\nreturn ".var_export($config,true).";\n");chmod($path,0600);
}elseif($action==='images'){
 $dir=__DIR__.'/../../test-artifacts';if(!is_dir($dir))mkdir($dir,0700,true);
 $im=imagecreatetruecolor(400,600);imagefill($im,0,0,imagecolorallocate($im,255,255,255));imagestring($im,5,20,40,'TEST ONLY synthetic page',imagecolorallocate($im,0,0,0));
 imagejpeg($im,$dir.'/handwriting-test.jpg',90);imagepng($im,$dir.'/handwriting-test.png');imagewebp($im,$dir.'/handwriting-test.webp');imagegif($im,$dir.'/handwriting-test.gif');imagedestroy($im);
 $jpg=file_get_contents($dir.'/handwriting-test.jpg');$exif="Exif\0\0"."II".pack('vV',42,8).pack('v',1).pack('vvVVV',0x0112,3,1,6,0);$app="\xFF\xE1".pack('n',strlen($exif)+2).$exif;file_put_contents($dir.'/handwriting-oriented.jpg',substr($jpg,0,2).$app.substr($jpg,2));
 file_put_contents($dir.'/handwriting-trailing.jpg',file_get_contents($dir.'/handwriting-test.jpg')."<?php TEST ONLY unsafe trailing payload ?>");
}elseif($action==='reserve'){
 try{$body=json_decode($argv[3],true,32,JSON_THROW_ON_ERROR);echo json_encode(['id'=>cssv_handwriting_reserve($pdo,$argv[2],$body,new DateTimeImmutable($argv[4]??'now'))],JSON_THROW_ON_ERROR);}catch(Throwable $e){echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()],JSON_THROW_ON_ERROR);}
}elseif($action==='execute'){
 require __DIR__.'/transport.php';cssv_handwriting_execute($pdo,$argv[2]);
}elseif($action==='expire-image'){
 $pdo->prepare('UPDATE handwriting_pages SET image_expires_at=DATE_SUB(NOW(6),INTERVAL 1 SECOND) WHERE id=?')->execute([$argv[2]]);
}elseif($action==='cleanup'){
 echo json_encode(cssv_handwriting_cleanup($pdo),JSON_THROW_ON_ERROR);
}elseif($action==='disk'){
 $q=$pdo->prepare('SELECT * FROM handwriting_pages WHERE id=?');$q->execute([$argv[2]]);$p=$q->fetch();echo json_encode(['deleted'=>$p['image_deleted_at']!==null,'path_retained'=>$p['image_path']!==null,'exists'=>$p['image_path']!==null && is_file(cssv_handwriting_file($p))],JSON_THROW_ON_ERROR);
}elseif($action==='force-delete-failure'){
 $q=$pdo->prepare('SELECT * FROM handwriting_pages WHERE id=?');$q->execute([$argv[2]]);$p=$q->fetch();$file=cssv_handwriting_file($p);unlink($file);$sentinel=dirname($file).'/TEST-only-sentinel.txt';file_put_contents($sentinel,'TEST ONLY deletion-recovery fixture');symlink($sentinel,$file);
}elseif($action==='restore-image'){
 $q=$pdo->prepare('SELECT * FROM handwriting_pages WHERE id=?');$q->execute([$argv[2]]);$p=$q->fetch();$file=cssv_env('CSSV_PRIVATE_STORAGE_DIR').'/handwriting/'.$p['image_path'];if(is_link($file))unlink($file);copy(__DIR__.'/../../test-artifacts/handwriting-test.jpg',$file);
}elseif($action==='usage'){
 $q=$pdo->prepare("SELECT * FROM ai_daily_usage WHERE user_id=? AND feature IN ('handwriting','handwriting_extract') ORDER BY bucket_date");$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);
}elseif($action==='orphan'){
 $user=cssv_pro_id($argv[2]);$path=cssv_private_storage_dir('handwriting/'.$user).'/'.cssv_uuid_v4().'.jpg';file_put_contents($path,'TEST ONLY abandoned staging image');touch($path,time()-90000);
}elseif($action==='history'){
 $q=$pdo->prepare('SELECT id,state,version_id,result FROM ai_operations WHERE handwriting_id=? ORDER BY created_at');$q->execute([$argv[2]]);echo json_encode($q->fetchAll(),JSON_THROW_ON_ERROR);
}else throw new RuntimeException('Unknown fixture action.');
