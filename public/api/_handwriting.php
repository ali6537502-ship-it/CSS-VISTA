<?php
declare(strict_types=1);
require_once __DIR__.'/_ai.php';require_once __DIR__.'/_handwriting_core.php';require_once __DIR__.'/_handwriting_schema.php';
function cssv_handwriting_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
 if((int)$pdo->query("SELECT GET_LOCK('cssvista-handwriting-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('handwriting_schema_busy');
 try{
  foreach(cssv_handwriting_schema_statements() as $sql)$pdo->exec($sql);
  $q=$pdo->query("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_operations' AND COLUMN_NAME='version_id'");
  if($q->fetchColumn()==='NO')$pdo->exec('ALTER TABLE ai_operations MODIFY COLUMN version_id CHAR(36) NULL');
  $q=$pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_operations' AND COLUMN_NAME='handwriting_id'");
  if((int)$q->fetchColumn()===0)$pdo->exec('ALTER TABLE ai_operations ADD COLUMN handwriting_id CHAR(36) NULL,ADD KEY ai_handwriting (handwriting_id),ADD CONSTRAINT ai_handwriting_fk FOREIGN KEY (handwriting_id) REFERENCES handwriting_pages(id) ON DELETE RESTRICT');
  $ready=true;
 }finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-handwriting-schema-v1')");}
}
function cssv_handwriting_page(PDO $pdo,string $id,string $user,bool $lock=false): array {
 $q=$pdo->prepare('SELECT * FROM handwriting_pages WHERE id=? AND user_id=?'.($lock?' FOR UPDATE':''));$q->execute([$id,$user]);$page=$q->fetch();if(!$page)throw new OutOfBoundsException('Handwriting page not found.');return $page;
}
function cssv_handwriting_transcription(PDO $pdo,array $page,int $version): array {
 $q=$pdo->prepare('SELECT * FROM handwriting_transcriptions WHERE page_id=? AND version=?');$q->execute([$page['id'],$version]);$t=$q->fetch();if(!$t)throw new OutOfBoundsException('Transcription version not found.');return $t;
}
function cssv_handwriting_file(array $page): string {
 $path=$page['image_path'];if(!is_string($path) || $path!==$page['user_id'].'/'.$page['id'].'.jpg')throw new OutOfBoundsException('The temporary page image is no longer available.');
 $base=cssv_env('CSSV_PRIVATE_STORAGE_DIR');if(!$base || !is_dir($base))throw new LogicException('Private image storage is unavailable.');
 $private=realpath($base);$public=realpath(dirname(__DIR__));$doc=realpath((string)($_SERVER['DOCUMENT_ROOT']??''));
 foreach(array_filter([$public,$doc]) as $root)if($private===$root || str_starts_with((string)$private,$root.DIRECTORY_SEPARATOR))throw new LogicException('Private image storage is unavailable.');
 $folder=$private.'/handwriting/'.$page['user_id'];
 if(is_link($private.'/handwriting') || is_link($folder))throw new LogicException('Private image storage is unavailable.');
 $file=$folder.'/'.$page['id'].'.jpg';if(is_link($file))throw new LogicException('Private image storage is unavailable.');return $file;
}
function cssv_handwriting_image_available(array $page): bool {
 return $page['image_path']!==null && $page['confirmed_text_version_id']===null && $page['image_deleted_at']===null && new DateTimeImmutable($page['image_expires_at'],new DateTimeZone('UTC'))>new DateTimeImmutable('now',new DateTimeZone('UTC'));
}
function cssv_handwriting_require_new_work(PDO $pdo,string $user): array {
 if(!cssv_profile_status(cssv_profile_for_user($pdo,$user))['complete'])throw new DomainException('Complete your profile before requesting handwriting assistance.');
 if(cssv_pro_membership($pdo,$user)['status']!=='active')throw new DomainException('Active Pro access is required for new handwriting work.');
 $config=cssv_handwriting_configuration();if(!$config['enabled'])throw new LogicException('Handwriting assistance is not open yet.');return $config;
}
function cssv_handwriting_upload(PDO $pdo,string $user,array $body,array $file): array {
 cssv_pro_fields($body,['request_id','attempt_id','title','policy_version']);$request=cssv_pro_id($body['request_id']??null);$attempt=cssv_pro_id($body['attempt_id']??null);$title=cssv_learning_string($body['title']??null,180,'title');
 $config=cssv_handwriting_require_new_work($pdo,$user);
 if(($body['policy_version']??null)!==$config['policy_version'])throw new DomainException('Review the current image-processing notice before uploading.');
 if(($file['error']??-1)!==UPLOAD_ERR_OK || !is_string($file['tmp_name']??null) || !is_uploaded_file($file['tmp_name']))throw new InvalidArgumentException('Choose one valid page image.');
 $image=cssv_handwriting_decode($file['tmp_name']);$hash=hash('sha256',json_encode(['handwriting_upload',$attempt,$title,$body['policy_version'],$image['source_hash']],JSON_THROW_ON_ERROR));$target=null;$created=false;
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);$config=cssv_handwriting_require_new_work($pdo,$user);cssv_learning_attempt($pdo,$attempt,$user);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
  if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This upload request was used for a different page.');$pdo->commit();return json_decode($prior['result'],true,16,JSON_THROW_ON_ERROR);}
  $q=$pdo->prepare('SELECT COUNT(*) FROM handwriting_pages WHERE user_id=? AND image_path IS NOT NULL AND image_expires_at>NOW(6) AND confirmed_text_version_id IS NULL');$q->execute([$user]);if((int)$q->fetchColumn()>=3)throw new DomainException('Finish your existing page uploads before adding another.');
  $id=cssv_uuid_v4();$path=$user.'/'.$id.'.jpg';$folder=cssv_private_storage_dir('handwriting/'.$user);$page=['id'=>$id,'user_id'=>$user,'image_path'=>$path];$target=cssv_handwriting_file($page);
  $handle=fopen($target,'xb');if(!$handle)throw new RuntimeException('image_storage_failed');$created=true;try{if(!chmod($target,0600) || fwrite($handle,$image['bytes'])!==strlen($image['bytes']))throw new RuntimeException('image_storage_failed');}finally{fclose($handle);}
  $expires=(new DateTimeImmutable('now',new DateTimeZone('UTC')))->modify('+'.$config['limits']['retention_seconds'].' seconds')->format('Y-m-d H:i:s.u');
  $pdo->prepare('INSERT INTO handwriting_pages(id,user_id,attempt_id,title,image_path,image_sha256,image_bytes,image_width,image_height,image_expires_at,policy_version) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([$id,$user,$attempt,$title,$path,$image['sha256'],strlen($image['bytes']),$image['width'],$image['height'],$expires,$body['policy_version']]);
  $result=['page_id'=>$id];$pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();return $result;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($created && $target && is_file($target))unlink($target);throw $e;}
}
function cssv_handwriting_add_transcription(PDO $pdo,array $page,string $text,string $source,bool $uncertain): int {
 $v=(int)$page['transcription_version']+1;$pdo->prepare('INSERT INTO handwriting_transcriptions(id,page_id,version,text,text_hash,uncertain,source) VALUES(?,?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$page['id'],$v,$text,hash('sha256',$text),$uncertain?1:0,$source]);
 $pdo->prepare("UPDATE handwriting_pages SET transcription_version=?,confirmed_transcription_version=NULL,confirmed_hash=NULL,confirmed_text_version_id=NULL,state='awaiting_confirmation',version=version+1 WHERE id=?")->execute([$v,$page['id']]);return $v;
}
function cssv_handwriting_mutation(PDO $pdo,string $user,array $body): array {
 cssv_pro_fields($body,['action','request_id','page_id','expected_version','text','confirmed']);$action=$body['action']??'';
 if(!in_array($action,['edit','confirm'],true))throw new InvalidArgumentException('Choose a valid transcription action.');
 $request=cssv_pro_id($body['request_id']??null);$id=cssv_pro_id($body['page_id']??null);$expected=$body['expected_version']??null;if(!is_int($expected) || $expected<1)throw new InvalidArgumentException('Refresh the transcription before saving.');
 if($action==='confirm' && (($body['confirmed']??null)!==true || array_key_exists('text',$body)))throw new InvalidArgumentException('Explicitly confirm the saved transcription before evaluation.');
 if($action==='edit' && array_key_exists('confirmed',$body))throw new InvalidArgumentException('Save corrections before confirming.');
 $text=$action==='edit'?cssv_handwriting_text($body['text']??null):null;$hash=hash('sha256',json_encode([$action,$id,$expected,$text],JSON_THROW_ON_ERROR));
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);$page=cssv_handwriting_page($pdo,$id,$user,true);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This save request was used with different corrections.');$pdo->commit();return json_decode($prior['result'],true,16,JSON_THROW_ON_ERROR);}
  if((int)$page['transcription_version']!==$expected)throw new DomainException('This transcription changed elsewhere. Reload it before saving.');
  if(!in_array($page['state'],['awaiting_confirmation','confirmed','completed','evaluation_failed'],true))throw new DomainException('Wait for this page to finish processing before changing its transcription.');
  $t=cssv_handwriting_transcription($pdo,$page,$expected);
  if($action==='edit'){$version=cssv_handwriting_add_transcription($pdo,$page,$text,'student',false);$result=['page_id'=>$id,'transcription_version'=>$version];}
  else{
   if(preg_match('/\[\s*unreadable\s*\]/iu',$t['text']))throw new InvalidArgumentException('Replace every unreadable marker with your actual wording before confirming.');
   if($page['confirmed_transcription_version']!==null && (int)$page['confirmed_transcription_version']===$expected && hash_equals((string)$page['confirmed_hash'],$t['text_hash'])){$result=['page_id'=>$id,'version_id'=>$page['confirmed_text_version_id'],'transcription_version'=>$expected];}
   else{
    $writing=$page['writing_id']?:cssv_uuid_v4();$versionId=cssv_uuid_v4();$version=1;
    if($page['writing_id']){$w=cssv_learning_writing($pdo,$writing,$user);$version=$w['version']+1;$pdo->prepare('UPDATE writing_records SET version=? WHERE id=?')->execute([$version,$writing]);}
    else $pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,'paragraph',?,1)")->execute([$writing,$user,$page['attempt_id'],$page['title']]);
    $pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,?,?,?,?)')->execute([$versionId,$writing,$version,$t['text'],$t['text_hash'],cssv_learning_words($t['text'])]);
    $pdo->prepare("UPDATE handwriting_pages SET state='confirmed',image_expires_at=LEAST(image_expires_at,NOW(6)),confirmed_transcription_version=?,confirmed_hash=?,confirmed_text_version_id=?,writing_id=?,version=version+1 WHERE id=?")->execute([$expected,$t['text_hash'],$versionId,$writing,$id]);
    $result=['page_id'=>$id,'version_id'=>$versionId,'transcription_version'=>$expected];
   }
  }
  $pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 if($action==='confirm')cssv_handwriting_purge($pdo,$id);return $result;
}
function cssv_handwriting_reserve(PDO $pdo,string $user,array $body,?DateTimeImmutable $now=null): string {
 cssv_pro_fields($body,['action','request_id','page_id','expected_version']);$action=$body['action']??'';if(!in_array($action,['extract','evaluate'],true))throw new InvalidArgumentException('Choose extraction or confirmed-text feedback.');
 $id=cssv_pro_id($body['page_id']??null);$request=cssv_pro_id($body['request_id']??null);$expected=$body['expected_version']??null;if(!is_int($expected) || $expected<0)throw new InvalidArgumentException('Refresh this page before continuing.');
 $feature=$action==='extract'?'handwriting_extract':'handwriting';$now??=new DateTimeImmutable('now',new DateTimeZone('UTC'));
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);$page=cssv_handwriting_page($pdo,$id,$user,true);
  $intent=$action==='extract'?$page['image_sha256']:cssv_handwriting_transcription($pdo,$page,$expected)['text_hash'];$hash=hash('sha256',json_encode([$action,$id,$expected,$intent],JSON_THROW_ON_ERROR));
  $q=$pdo->prepare('SELECT id,payload_hash FROM ai_operations WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This request was used for a different handwriting action.');$pdo->commit();return $prior['id'];}
  cssv_handwriting_require_new_work($pdo,$user);
  if((int)$page['transcription_version']!==$expected)throw new DomainException('This transcription changed. Review its current version before continuing.');
  if($action==='extract'){
   if(!in_array($page['state'],['uploaded','extraction_failed','awaiting_confirmation'],true) || !cssv_handwriting_image_available($page) || !is_file(cssv_handwriting_file($page)))throw new DomainException('Extraction is unavailable for this page. Check its status or upload a new clear image.');$versionId=null;
  }else{
   if(!in_array($page['state'],['confirmed','evaluation_failed'],true) || (int)$page['confirmed_transcription_version']!==$expected || !$page['confirmed_text_version_id'] || !hash_equals((string)$page['confirmed_hash'],$intent))throw new DomainException('Save corrections and explicitly confirm this exact transcription before evaluation.');
   $v=cssv_learning_version($pdo,$page['confirmed_text_version_id'],$user);if(!hash_equals($v['text_hash'],$intent))throw new DomainException('Confirm the current transcription before evaluation.');$versionId=$v['id'];
  }
  $config=cssv_ai_configuration();$config['prompt_version']=$action==='extract'?'handwriting-transcription-v1':'handwriting-feedback-v1';$operation=cssv_ai_reserve_usage($pdo,$user,$request,$hash,$feature,$versionId,$config,$now,$id);
  $pdo->prepare('UPDATE handwriting_pages SET state=?,active_operation_id=?,version=version+1 WHERE id=?')->execute([$action==='extract'?'extracting':'evaluating',$operation,$id]);$pdo->commit();return $operation;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_handwriting_transition(PDO $pdo,array $op,string $state,?array $result): ?array {
 $page=cssv_handwriting_page($pdo,$op['handwriting_id'],$op['user_id'],true);
 if($op['feature']==='handwriting_extract' && ($state==='succeeded' || ($state==='failed' && $result!==null && ($result['readable']??null)===false))){
  $result=cssv_handwriting_extraction_result($result??[]);
  if($result['readable'])cssv_handwriting_add_transcription($pdo,$page,$result['text'],'model',$result['uncertain']);
  else $pdo->prepare("UPDATE handwriting_pages SET state='unreadable',image_expires_at=NOW(6),version=version+1 WHERE id=?")->execute([$page['id']]);
  return ['readable'=>$result['readable'],'uncertain'=>$result['uncertain'],'reason'=>$result['reason']];
 }
 if($page['active_operation_id']===$op['id']){
  $next=$state==='unknown'?'outcome_unknown':($state==='succeeded'?'completed':($op['feature']==='handwriting_extract'?'extraction_failed':'evaluation_failed'));
  $pdo->prepare('UPDATE handwriting_pages SET state=?,version=version+1 WHERE id=?')->execute([$next,$page['id']]);
 }return $result;
}
/** Delete only an owned/generated handwriting file; keep a DB reference on failure. */
function cssv_handwriting_purge(PDO $pdo,string $id,?DateTimeImmutable $now=null): bool {
 $q=$pdo->prepare('SELECT * FROM handwriting_pages WHERE id=?');$q->execute([$id]);$page=$q->fetch();if(!$page || !$page['image_path'])return true;
 $now??=new DateTimeImmutable('now',new DateTimeZone('UTC'));if(!$page['confirmed_text_version_id'] && new DateTimeImmutable($page['image_expires_at'],new DateTimeZone('UTC'))>$now)return false;
 try{$file=cssv_handwriting_file($page);if(is_file($file) && !unlink($file))return false;}catch(Throwable){return false;}
 $pdo->prepare("UPDATE handwriting_pages SET image_path=NULL,image_deleted_at=NOW(6),state=CASE WHEN state='uploaded' THEN 'image_expired' ELSE state END WHERE id=? AND image_path=?")->execute([$id,$page['image_path']]);return true;
}
function cssv_handwriting_owned(PDO $pdo,string $id,string $user): array {
 $p=cssv_handwriting_page($pdo,$id,$user);$op=$p['active_operation_id']?cssv_ai_owned_operation($pdo,$p['active_operation_id'],$user):null;
 // Conservative recovery never dispatches. An expired raw image cannot start work.
 if($op && in_array($p['state'],['extracting','evaluating'],true) && in_array($op['state'],['failed','unknown'],true)){
  $next=$op['state']==='unknown'?'outcome_unknown':($op['feature']==='handwriting_extract'?'extraction_failed':'evaluation_failed');
  $pdo->prepare('UPDATE handwriting_pages SET state=? WHERE id=? AND user_id=? AND state=? AND active_operation_id=?')->execute([$next,$id,$user,$p['state'],$op['id']]);$p=cssv_handwriting_page($pdo,$id,$user);
 }
 cssv_handwriting_purge($pdo,$id);$p=cssv_handwriting_page($pdo,$id,$user);
 $t=(int)$p['transcription_version']>0?cssv_handwriting_transcription($pdo,$p,(int)$p['transcription_version']):null;
 $image=cssv_handwriting_image_available($p);
 return ['id'=>$id,'attempt_id'=>$p['attempt_id'],'title'=>$p['title'],'state'=>!$image && $p['state']==='uploaded'?'image_expired':$p['state'],'transcription'=>$t?['text'=>$t['text'],'version'=>(int)$t['version'],'hash'=>$t['text_hash'],'uncertain'=>(bool)$t['uncertain'],'source'=>$t['source']]:null,'confirmed_version'=>$p['confirmed_transcription_version']===null?null:(int)$p['confirmed_transcription_version'],'writing_id'=>$p['writing_id'],'confirmed_text_version_id'=>$p['confirmed_text_version_id'],'image_available'=>$image,'image_expires_at'=>cssv_pro_iso($p['image_expires_at']),'image_cleanup_pending'=>!$image && $p['image_path']!==null,'operation'=>$op,'created_at'=>cssv_pro_iso($p['created_at'])];
}
function cssv_handwriting_cleanup(PDO $pdo,?DateTimeImmutable $now=null): array {
 $now??=new DateTimeImmutable('now',new DateTimeZone('UTC'));$date=$now->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
 // Reconcile abandoned operations conservatively, without repeating a provider call.
 $pdo->exec("UPDATE handwriting_pages p JOIN ai_operations o ON o.id=p.active_operation_id SET p.state=CASE WHEN o.state='unknown' THEN 'outcome_unknown' WHEN o.feature='handwriting_extract' THEN 'extraction_failed' ELSE 'evaluation_failed' END WHERE p.state IN ('extracting','evaluating') AND o.state IN ('failed','unknown')");
 $q=$pdo->prepare('SELECT id FROM handwriting_pages WHERE image_path IS NOT NULL AND (image_expires_at<=? OR confirmed_text_version_id IS NOT NULL) LIMIT 100');$q->execute([$date]);$purged=0;foreach($q->fetchAll(PDO::FETCH_COLUMN) as $id)if(cssv_handwriting_purge($pdo,$id,$now))$purged++;
 // Uncommitted staging files can survive a worker crash; sweep only generated names.
 $base=cssv_env('CSSV_PRIVATE_STORAGE_DIR');$orphans=0;
 if($base && is_dir($base.'/handwriting') && !is_link($base.'/handwriting'))foreach(glob($base.'/handwriting/*/*.jpg')?:[] as $file){
  if(is_link($file) || is_link(dirname($file)) || !preg_match('~^([a-f0-9-]{36})\.jpg$~D',basename($file),$m) || filemtime($file)>$now->getTimestamp()-86400)continue;
  $q=$pdo->prepare('SELECT COUNT(*) FROM handwriting_pages WHERE id=? AND image_path IS NOT NULL');$q->execute([$m[1]]);if((int)$q->fetchColumn()===0 && unlink($file))$orphans++;
 }
 return ['images_purged'=>$purged,'orphan_images_purged'=>$orphans];
}

function cssv_handwriting_problem(Throwable $error): never {
 if($error instanceof DomainException)cssv_fail($error->getMessage(),409,'handwriting_conflict');
 if($error instanceof LogicException && !($error instanceof InvalidArgumentException))cssv_fail($error->getMessage(),503,'handwriting_unavailable');
 cssv_pro_problem($error);
}
