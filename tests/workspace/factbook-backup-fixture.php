<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_factbook_backup.php';
$pdo=cssv_db();$user=$argv[2]??'';$q=$pdo->prepare("SELECT id FROM users WHERE id=? AND email LIKE '%@example.invalid'");$q->execute([$user]);if(!$q->fetchColumn())throw new RuntimeException('Synthetic account required.');
if($argv[1]==='roundtrip'){
 $target=$argv[3]??'';$q->execute([$target]);if(!$q->fetchColumn())throw new RuntimeException('Synthetic target required.');
 fb_backup_ensure($pdo);$backup=fb_backup_export($pdo,$user);[$tables,$blobs,$raw]=fb_backup_graph($backup);[$ids,$images]=fb_backup_validate($tables,$blobs,$target);
 $files=[];$manifest=fb_backup_manifest($target,cssv_uuid_v4());$pdo->beginTransaction();$result=fb_backup_restore($pdo,$target,$tables,$ids,$images,'new',true,$files,$raw,$manifest);$request=cssv_uuid_v4();$pdo->prepare('INSERT INTO factbook_backup_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$target,$request,hash('sha256',json_encode($backup)),json_encode($result)]);$pdo->commit();fb_backup_cleanup_stages($pdo,$target);
 $copy=fb_backup_export($pdo,$target);if(count($copy['entries'])!==17||count($copy['related']['factbook_revisions'])!==1||count($copy['collections'])!==1)throw new RuntimeException('Incomplete graph.');
 foreach($backup['entries'] as $entry){$found=array_values(array_filter($copy['entries'],fn($row)=>$row['title']===$entry['title']))[0]??[];foreach(['content','created_at','updated_at','archived_at','deleted_at'] as $key)if($found[$key]!==$entry[$key])throw new RuntimeException('Content or date mismatch.');}
 if(array_values($backup['media_blobs'])!==array_values($copy['media_blobs']))throw new RuntimeException('Private image bytes mismatch.');
 $source=fb_backup_export($pdo,$user);unset($source['exported_at'],$backup['exported_at']);$stable=function(array $file):array{foreach(['subjects','categories','entries','collections'] as $key)usort($file[$key],fn($a,$b)=>strcmp(json_encode($a),json_encode($b)));foreach($file['related'] as &$rows)usort($rows,fn($a,$b)=>strcmp(json_encode($a),json_encode($b)));unset($rows);return fb_backup_canonical($file);};if($stable($source)!=$stable($backup))throw new RuntimeException('Source changed.');
 echo json_encode(['server'=>$pdo->query('SELECT VERSION()')->fetchColumn(),'tables'=>$pdo->query('SHOW TABLES')->rowCount(),'entries'=>17,'history'=>1,'private_images'=>1,'schema_parity'=>trim(file_get_contents(__DIR__.'/../../server/sql/028_factbook_backup_receipts.sql'))===fb_backup_schema().';','originals_retained'=>true]);exit;
}
if($argv[1]==='digest'){
 $out=[];foreach(fb_schema() as $table=>$_){$q=$pdo->prepare('SELECT * FROM `'.$table.'` WHERE user_id=?');$q->execute([$user]);$rows=[];foreach($q->fetchAll() as $row){ksort($row);$rows[]=json_encode($row,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);}sort($rows,SORT_STRING);$out[$table]=hash('sha256',implode("\n",$rows));}echo hash('sha256',json_encode($out,JSON_THROW_ON_ERROR));exit;
}
if($argv[1]==='rates'){$pdo->exec("DELETE FROM login_security_events WHERE event_type IN ('factbook_backup_restore','factbook_backup_export')");exit;}
if($argv[1]==='limit'){for($i=0;$i<10;$i++)cssv_log_security_event($pdo,'factbook_backup_restore',$user,$user);exit;}
if($argv[1]==='cleanup'){$q=$pdo->prepare('SELECT GET_LOCK(?,10)');$q->execute(['factbook-'.$user]);fb_backup_cleanup_stages($pdo,$user);exit;}
if(in_array($argv[1],['crash','commit-crash'],true)){
 $backup=json_decode($argv[4],true,64,JSON_THROW_ON_ERROR);$request=fb_backup_id($argv[3]);fb_backup_ensure($pdo);[$tables,$blobs,$raw]=fb_backup_graph($backup);[$ids,$images]=fb_backup_validate($tables,$blobs,$user);$q=$pdo->prepare('SELECT GET_LOCK(?,10)');$q->execute(['factbook-'.$user]);$files=[];$pdo->beginTransaction();$result=fb_backup_restore($pdo,$user,$tables,$ids,$images,'new',true,$files,$raw,fb_backup_manifest($user,$request));
 if($argv[1]==='commit-crash'){$result+=['request_id'=>$request,'source_version'=>2,'confirmed_at'=>gmdate('c')];$q=$pdo->prepare('INSERT INTO factbook_backup_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)');$q->execute([$user,$request,hash('sha256',json_encode(fb_backup_canonical(['new',true,$backup]),JSON_THROW_ON_ERROR)),json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();}
 if(function_exists('posix_kill'))posix_kill(getmypid(),9);exit(137);
}
if($argv[1]==='seed'){
 $subjects=[];foreach(['active','archived','trashed'] as $state){$id=cssv_uuid_v4();$subjects[$state]=$id;$pdo->prepare('INSERT INTO factbook_subjects(id,user_id,name,archived_at,deleted_at,created_at,updated_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))')->execute([$id,$user,'TEST ONLY '.$state.' subject',$state==='archived'?'2025-01-01':null,$state==='trashed'?'2025-02-01':null]);}
 $parent=fb_insert($pdo,'factbook_categories',['subject_id'=>$subjects['active'],'name'=>'TEST ONLY parent'],$user)['id'];$child=fb_insert($pdo,'factbook_categories',['subject_id'=>$subjects['active'],'parent_id'=>$parent,'name'=>'TEST ONLY child'],$user)['id'];
 $content=json_decode($argv[3],true,64,JSON_THROW_ON_ERROR);$entries=[];
 foreach($content as $index=>$item){$id=cssv_uuid_v4();$entries[]=$id;$state=$item['type']==='rich-note'?'active':['active','archived','trashed'][$index%3];$html=$item['content'];$pdo->prepare('INSERT INTO factbook_entries(id,user_id,subject_id,category_id,title,entry_type,content,importance,revision_status,bookmarked,personal_remarks,archived_at,deleted_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,\'important\',\'learning\',1,\'TEST ONLY remarks — اردو\',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))')->execute([$id,$user,$subjects[$state],$state==='active'?$child:null,'TEST ONLY '.$item['type'],$item['type'],json_encode($html,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$state==='archived'?'2025-01-01':null,$state==='trashed'?'2025-02-01':null]);
  $pdo->prepare("UPDATE factbook_entries SET content=JSON_SET(content,'$.preserved_empty',JSON_OBJECT()) WHERE id=? AND user_id=?")->execute([$id,$user]);
  fb_insert($pdo,'factbook_sources',['entry_id'=>$id,'title'=>'TEST ONLY source','author_organization'=>'TEST ONLY','web_address'=>'https://example.invalid/reference','verification_note'=>'TEST ONLY private reference note'],$user);
  if($index===0){$row=fb_row($pdo,'factbook_entries',$id,$user);fb_revision($pdo,$row,$user);}
 }
 fb_insert($pdo,'factbook_entry_blocks',['entry_id'=>$entries[0],'block_type'=>'text','content'=>['text'=>'TEST ONLY retained block — اردو','rows'=>[1,true]]],$user);
 $tag=fb_insert($pdo,'factbook_tags',['name'=>'TEST ONLY retained tag'],$user)['id'];fb_insert($pdo,'factbook_entry_tags',['entry_id'=>$entries[0],'tag_id'=>$tag],$user);
 $collection=fb_insert($pdo,'factbook_collections',['name'=>'TEST ONLY mixed collection','archived_at'=>'2025-01-01'],$user)['id'];foreach([$entries[0],$entries[1],$entries[2]] as $index=>$id)fb_insert($pdo,'factbook_collection_entries',['collection_id'=>$collection,'entry_id'=>$id,'position'=>$index],$user);
 fb_insert($pdo,'factbook_preferences',['default_view'=>'compact','default_print_layout'=>'spacious','autosave_enabled'=>($argv[4]??'')==='autosave','source_reminders'=>false,'revision_labels'=>true],$user);
 $bytes=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iCfoAAAAASUVORK5CYII=',true);$path=$user.'/'.$entries[0].'/'.cssv_uuid_v4().'.png';$file=cssv_private_storage_dir('factbook/'.$user.'/'.$entries[0]).'/'.basename($path);file_put_contents($file,$bytes);chmod($file,0600);
 $media=fb_insert($pdo,'factbook_media',['entry_id'=>$entries[0],'storage_path'=>$path,'file_name'=>'TEST ONLY image.png','mime_type'=>'image/png','byte_size'=>strlen($bytes),'width'=>1,'height'=>1,'caption'=>'TEST ONLY caption','alt_text'=>'TEST ONLY dot','source'=>'TEST ONLY image source','sha256'=>hash('sha256',$bytes)],$user)['id'];fb_refresh($pdo,$user);echo json_encode(['subjects'=>$subjects,'entries'=>$entries,'collection'=>$collection,'media'=>$media]);exit;
}
if($argv[1]==='files'){$root=cssv_private_storage_dir().'/factbook/'.$user;$count=0;if(is_dir($root))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $file)if($file->isFile())$count++;echo $count;exit;}
if($argv[1]==='block'){
 $pdo->exec("CREATE TRIGGER test_only_factbook_restore_failure BEFORE INSERT ON factbook_media FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEST ONLY storage metadata failure'");exit;
}
if($argv[1]==='unblock'){$pdo->exec('DROP TRIGGER IF EXISTS test_only_factbook_restore_failure');exit;}
throw new RuntimeException('Unknown action.');
