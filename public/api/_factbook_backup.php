<?php
declare(strict_types=1);
require_once __DIR__.'/_factbook.php';
const FB_BACKUP_BYTES=16777216;
const FB_BACKUP_ROWS=10000;
function fb_backup_schema(): string { return <<<'SQL'
CREATE TABLE IF NOT EXISTS factbook_backup_requests (
 user_id CHAR(36) NOT NULL, request_id CHAR(36) NOT NULL, payload_hash CHAR(64) NOT NULL,
 result JSON NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (user_id,request_id),
 CONSTRAINT factbook_backup_request_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
}
function fb_backup_ensure(PDO $pdo): void {
    if((int)$pdo->query("SELECT GET_LOCK('cssvista-factbook-backup-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('Backup schema busy.');
    try{$pdo->exec(fb_backup_schema());}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-factbook-backup-schema-v1')");}
}
function fb_backup_canonical(mixed $value): mixed {
    if(is_object($value)){$vars=get_object_vars($value);ksort($vars,SORT_STRING);$out=new stdClass();foreach($vars as $key=>$item)$out->$key=fb_backup_canonical($item);return $out;}
    if(!is_array($value))return $value;
    if(!array_is_list($value))ksort($value,SORT_STRING);
    foreach($value as &$item)$item=fb_backup_canonical($item);unset($item);return $value;
}
function fb_backup_id(mixed $id): string {
    if(!is_string($id)||!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/Di',$id))throw new InvalidArgumentException('A backup item has an invalid identifier.');return strtolower($id);
}
function fb_backup_path(array $row,string $user): string {
    $path=$row['storage_path']??'';
    if(!is_string($path)||!preg_match('~^'.preg_quote($user,'~').'/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|gif|webp)$~Di',$path))throw new InvalidArgumentException('A private image path is invalid.');
    $root=realpath(cssv_private_storage_dir().'/factbook');$file=cssv_private_storage_dir().'/factbook/'.$path;$real=realpath($file);
    if(!$root||!$real||!str_starts_with($real,$root.'/'.$user.'/')||is_link($file)||!is_file($real))throw new RuntimeException('An attached image is unavailable. No incomplete backup was produced.');return $real;
}
function fb_backup_image(string $bytes): array {
    $size=strlen($bytes);$info=@getimagesizefromstring($bytes);$mime=(new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$mime]??null;
    if(!$size||$size>5242880||!$info||!$ext||$info[0]>10000||$info[1]>10000||$info[0]*$info[1]>16000000)throw new InvalidArgumentException('A backup image exceeds the supported raster image limits.');
    return ['mime'=>$mime,'ext'=>$ext,'width'=>$info[0],'height'=>$info[1],'size'=>$size,'sha256'=>hash('sha256',$bytes)];
}
function fb_backup_export(PDO $pdo,string $user): array {
    $tables=[];$total=0;
    foreach(fb_schema() as $table=>$schema){
        $q=$pdo->prepare('SELECT * FROM `'.$table.'` WHERE user_id=? LIMIT '.(FB_BACKUP_ROWS+1));$q->execute([$user]);$rows=$q->fetchAll();$total+=count($rows);
        if($total>FB_BACKUP_ROWS)throw new InvalidArgumentException('This Factbook exceeds the bounded backup limit of 10,000 records. Original records are unchanged.');
        $tables[$table]=array_map(function($row)use($table,$schema){$decoded=fb_decode($table,$row);foreach($schema as $key=>$type)if($type==='JSON'&&isset($row[$key]))$decoded[$key]=$row[$key];return $decoded;},$rows);
    }
    $blobs=[];$bytes=0;
    foreach($tables['factbook_media'] as $media){$data=file_get_contents(fb_backup_path($media,$user));if($data===false)throw new RuntimeException('An attached image could not be read.');$info=fb_backup_image($data);if(!empty($media['sha256'])&&!hash_equals($media['sha256'],$info['sha256']))throw new RuntimeException('An attached image failed its checksum.');$bytes+=$info['size'];if($bytes>8388608)throw new InvalidArgumentException('This backup exceeds the supported 8 MB of image bytes. No incomplete backup was produced.');$blobs[$media['id']]=base64_encode($data);}
    $related=[];foreach($tables as $table=>$rows)if(!in_array($table,['factbook_subjects','factbook_categories','factbook_entries','factbook_collections','factbook_preferences'],true))$related[$table]=$rows;
    $out=['format'=>'css-vista-factbook','version'=>2,'json_encoding'=>'stored-json','exported_at'=>gmdate('c'),'subjects'=>$tables['factbook_subjects'],'categories'=>$tables['factbook_categories'],'entries'=>$tables['factbook_entries'],'collections'=>$tables['factbook_collections'],'preferences'=>$tables['factbook_preferences'][0]??null,'related'=>$related,'media_blobs'=>$blobs];
    if(strlen(json_encode($out,JSON_THROW_ON_ERROR))>FB_BACKUP_BYTES-1024)throw new InvalidArgumentException('This backup exceeds the supported 16 MB JSON file limit. No incomplete backup was produced.');return $out;
}
/** Convert the old nested export to the same graph. No database or file writes. */
function fb_backup_graph(array $backup): array {
    if(($backup['format']??'')!=='css-vista-factbook'||!in_array($backup['version']??null,[1,2],true))throw new InvalidArgumentException('Unsupported Factbook backup format.');
    if($backup['version']===2&&array_diff(array_keys($backup),['format','version','json_encoding','exported_at','subjects','categories','entries','collections','preferences','related','media_blobs']))throw new InvalidArgumentException('A backup contains unsupported sections.');
    $tables=array_fill_keys(array_keys(fb_schema()),[]);$blobs=[];$rawJson=[];
    foreach(['subjects','categories','entries','collections'] as $key){$rows=$backup[$key]??($key==='collections'?[]:null);if(!is_array($rows)||!array_is_list($rows))throw new InvalidArgumentException('The backup is missing a record list.');$tables['factbook_'.$key]=$rows;}
    if(($backup['preferences']??null)!==null){if(!is_array($backup['preferences']))throw new InvalidArgumentException('Backup settings are invalid.');$tables['factbook_preferences']=[$backup['preferences']];}
    if($backup['version']===2){
        if(($backup['json_encoding']??null)!=='stored-json')throw new InvalidArgumentException('Unsupported backup JSON encoding.');
        $related=$backup['related']??null;if(!is_array($related))throw new InvalidArgumentException('The backup is missing related records.');
        if(array_diff(array_keys($related),array_diff(array_keys($tables),['factbook_subjects','factbook_categories','factbook_entries','factbook_collections','factbook_preferences'])))throw new InvalidArgumentException('A backup contains unsupported related sections.');
        foreach($tables as $table=>$_)if(!in_array($table,['factbook_subjects','factbook_categories','factbook_entries','factbook_collections','factbook_preferences'],true)){
            $rows=$related[$table]??null;if(!is_array($rows)||!array_is_list($rows))throw new InvalidArgumentException('The backup is missing a related record list.');$tables[$table]=$rows;
        }
        $blobs=$backup['media_blobs']??[];if(!is_array($blobs))throw new InvalidArgumentException('Backup image data is invalid.');
    }else{
        $tags=[];
        foreach($tables['factbook_entries'] as &$entry){
            if(!is_array($entry))throw new InvalidArgumentException('A backup entry is invalid.');$id=fb_backup_id($entry['id']??null);
            foreach(['sources','tags','media'] as $key)if(isset($entry[$key])&&(!is_array($entry[$key])||!array_is_list($entry[$key])))throw new InvalidArgumentException('An entry has an invalid related list.');
            foreach($entry['sources']??[] as $source){if(!is_array($source))throw new InvalidArgumentException('A backup source is invalid.');$source['id']=$source['id']??cssv_uuid_v4();$source['entry_id']=$id;$tables['factbook_sources'][]=$source;}
            foreach($entry['tags']??[] as $name){if(!is_string($name)||trim($name)==='')throw new InvalidArgumentException('A backup tag is invalid.');$key=mb_strtolower($name);if(!isset($tags[$key])){$tags[$key]=cssv_uuid_v4();$tables['factbook_tags'][]=['id'=>$tags[$key],'name'=>$name];}$tables['factbook_entry_tags'][]=['entry_id'=>$id,'tag_id'=>$tags[$key]];}
            foreach($entry['media']??[] as $media){if(!is_array($media)||!is_string($media['backup_data_url']??null)||!preg_match('~^data:image/(?:jpeg|png|webp|gif);base64,(.+)$~Ds',$media['backup_data_url'],$m))throw new InvalidArgumentException('A legacy image has no complete embedded bytes. No records were changed.');$media['id']=$media['id']??cssv_uuid_v4();$media['entry_id']=$id;$blobs[$media['id']]=$m[1];unset($media['backup_data_url'],$media['signed_url']);$tables['factbook_media'][]=$media;}
            unset($entry['sources'],$entry['tags'],$entry['media']);
        }unset($entry);
        foreach($tables['factbook_collections'] as &$collection){if(!is_array($collection))throw new InvalidArgumentException('A collection is invalid.');foreach($collection['entry_ids']??[] as $position=>$id)$tables['factbook_collection_entries'][]=['collection_id'=>$collection['id'],'entry_id'=>$id,'position'=>$position];unset($collection['entry_ids']);}unset($collection);
    }
    foreach($tables as $table=>&$rows)foreach($rows as &$row){if(!is_array($row))throw new InvalidArgumentException('A backup row is invalid.');if($backup['version']===2)foreach(fb_schema()[$table] as $key=>$type)if($type==='JSON'&&isset($row[$key])){if(!is_string($row[$key]))throw new InvalidArgumentException('Stored JSON is invalid.');$rawJson[$table][strtolower((string)($row['id']??''))][$key]=$row[$key];$row[$key]=json_decode($row[$key],false,32,JSON_THROW_ON_ERROR);}if($table==='factbook_revisions'&&is_object($row['snapshot']??null))$row['snapshot']=(array)$row['snapshot'];foreach(['id','subject_id','category_id','parent_id','entry_id','tag_id','collection_id'] as $key)if(!empty($row[$key]))$row[$key]=fb_backup_id($row[$key]);}unset($rows,$row);
    $normal=[];foreach($blobs as $id=>$bytes){$id=fb_backup_id($id);if(isset($normal[$id]))throw new InvalidArgumentException('Duplicate image data.');$normal[$id]=$bytes;}
    return [$tables,$normal,$rawJson];
}
/** Validate the complete graph and every image before staging any mutation. */
function fb_backup_validate(array $tables,array $blobs,string $user): array {
    $ids=[];$total=0;$images=[];$imageBytes=0;$relations=[];
    foreach($tables as $table=>$rows){$total+=count($rows);if($total>FB_BACKUP_ROWS)throw new InvalidArgumentException('The backup exceeds 10,000 supported records.');$schema=fb_schema()[$table];
        foreach($rows as $row){
            if(!is_array($row)||array_is_list($row))throw new InvalidArgumentException('A backup row is invalid.');
            $required=match($table){
                'factbook_subjects','factbook_tags','factbook_collections'=>['name'],
                'factbook_categories'=>['subject_id','name'],
                'factbook_entries'=>['subject_id','title','entry_type','content','personal_remarks'],
                'factbook_entry_blocks'=>['entry_id','block_type','content'],
                'factbook_sources'=>['entry_id'],
                'factbook_entry_tags'=>['entry_id','tag_id'],
                'factbook_collection_entries'=>['collection_id','entry_id'],
                'factbook_media'=>['file_name'],
                'factbook_revisions'=>['entry_id','snapshot'],default=>[]};
            foreach($required as $key)if(!isset($row[$key]))throw new InvalidArgumentException('A backup record is missing required data.');
            if(in_array($table,['factbook_entry_tags','factbook_collection_entries'],true)){$key=($row['entry_id']??'').'|'.($row['tag_id']??$row['collection_id']??'');if(isset($relations[$table][$key]))throw new InvalidArgumentException('Duplicate backup relation.');$relations[$table][$key]=true;}
            if(isset($schema['id'])){$id=fb_backup_id($row['id']??null);if(isset($ids[$table][$id]))throw new InvalidArgumentException('A backup contains duplicate identifiers.');$ids[$table][$id]=$row;}
            foreach($row as $key=>$value){if(!isset($schema[$key]))throw new InvalidArgumentException('A backup has an unsupported field.');if($key==='id'||$key==='user_id')continue;
                if(str_starts_with($schema[$key],'DATETIME')&&$value!==null){if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?$/D',$value))throw new InvalidArgumentException('A backup timestamp is invalid.');try{$d=new DateTimeImmutable($value,new DateTimeZone('UTC'));}catch(Exception $error){throw new InvalidArgumentException('A backup timestamp is invalid.',0,$error);}if($d->format('Y-m-d H:i:s')!==str_replace('T',' ',substr($value,0,19)))throw new InvalidArgumentException('A backup timestamp is invalid.');}
            }
            // Reuse native scalar/content/enum validation before any transaction or file staging.
            fb_values($table,[...$row,'user_id'=>$user],$user,false);
        }
    }
    foreach($tables as $table=>$rows)foreach($rows as $row){
        foreach(['subject_id'=>'factbook_subjects','category_id'=>'factbook_categories','parent_id'=>'factbook_categories','entry_id'=>'factbook_entries','tag_id'=>'factbook_tags','collection_id'=>'factbook_collections'] as $key=>$target)if(!empty($row[$key])){
            $id=fb_backup_id($row[$key]);if(!isset($ids[$target][$id]))throw new InvalidArgumentException('A backup relation points to a missing item.');
            if(in_array($key,['category_id','parent_id'],true)&&isset($row['subject_id'])&&$ids[$target][$id]['subject_id']!==$row['subject_id'])throw new InvalidArgumentException('A backup category belongs to a different subject.');
        }
        if($table==='factbook_categories'){$seen=[];$current=$row['id'];while($current){if(isset($seen[$current])||count($seen)>100)throw new InvalidArgumentException('A backup category tree contains a cycle or is too deep.');$seen[$current]=true;$current=$ids[$table][$current]['parent_id']??null;}}
        if($table==='factbook_media'){
            $encoded=$blobs[$row['id']]??null;if(!is_string($encoded))throw new InvalidArgumentException('A backup image has no embedded bytes.');$bytes=base64_decode($encoded,true);if($bytes===false)throw new InvalidArgumentException('A backup image encoding is invalid.');$info=fb_backup_image($bytes);$imageBytes+=$info['size'];if($imageBytes>8388608)throw new InvalidArgumentException('Backup images exceed 8 MB.');if(!empty($row['sha256'])&&!hash_equals($row['sha256'],$info['sha256']))throw new InvalidArgumentException('A backup image checksum does not match.');$images[$row['id']]=['bytes'=>$bytes,'info'=>$info];
        }
        if($table==='factbook_revisions'&&(!is_array($row['snapshot']??null)||array_is_list($row['snapshot'])))throw new InvalidArgumentException('A saved revision snapshot is invalid.');
    }
    if(count($blobs)!==count($images))throw new InvalidArgumentException('Backup image data does not match its records.');
    return [$ids,$images];
}
function fb_backup_insert(PDO $pdo,string $table,array $row,array $rawJson=[]): void {
    foreach(['created_at','updated_at'] as $key)if(isset(fb_schema()[$table][$key])&&!isset($row[$key]))$row[$key]=gmdate('Y-m-d H:i:s');
    $keys=array_keys($row);$values=[];foreach($row as $key=>$value)$values[]=isset(fb_schema()[$table][$key])&&fb_schema()[$table][$key]==='JSON'?($rawJson[$key]??json_encode($value,JSON_THROW_ON_ERROR)):($value===null?null:fb_value(fb_schema()[$table][$key],$value));
    $q=$pdo->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`',$keys).'`) VALUES ('.implode(',',array_fill(0,count($keys),'?')).')');$q->execute($values);
}
function fb_backup_restore(PDO $pdo,string $user,array $tables,array $ids,array $images,string $mode,bool $preferences,array &$files,array $rawJson=[],string $manifest=''): array {
    $maps=[];$reused=[];$collectionOffsets=[];
    foreach($ids as $table=>$rows)foreach($rows as $id=>$_)$maps[$table][$id]=cssv_uuid_v4();
    foreach(['factbook_subjects','factbook_categories','factbook_entries','factbook_collections','factbook_tags','factbook_entry_blocks','factbook_sources','factbook_entry_tags','factbook_collection_entries','factbook_media','factbook_revisions','factbook_preferences'] as $table){
        $pending=$tables[$table];
        while($pending){$changed=false;
            foreach($pending as $index=>$original){
                if($table==='factbook_categories'&&!empty($original['parent_id'])&&!isset($reused['category_done'][$original['parent_id']]))continue;
                $row=$original;$old=$row['id']??null;$row['user_id']=$user;
                foreach(['id'=>$table,'subject_id'=>'factbook_subjects','category_id'=>'factbook_categories','parent_id'=>'factbook_categories','entry_id'=>'factbook_entries','tag_id'=>'factbook_tags','collection_id'=>'factbook_collections'] as $key=>$target)if(!empty($row[$key]))$row[$key]=$maps[$target][$row[$key]];
                unset($row['search_text'],$row['source_count'],$row['entry_count'],$row['category_count']);
                $match=null;
                if(($mode==='merge'&&in_array($table,['factbook_subjects','factbook_categories','factbook_collections'],true))||$table==='factbook_tags'){
                    $sql='SELECT id FROM `'.$table.'` WHERE user_id=? AND '.($table==='factbook_tags'?'LOWER(name)=LOWER(?)':'LOWER(name) COLLATE utf8mb4_bin=LOWER(CONVERT(? USING utf8mb4)) COLLATE utf8mb4_bin');$args=[$user,$row['name']];
                    if($table==='factbook_categories'){$sql.=' AND subject_id=? AND parent_id <=> ?';array_push($args,$row['subject_id'],$row['parent_id']??null);}
                    $q=$pdo->prepare($sql.' ORDER BY id LIMIT 1');$q->execute($args);$match=$q->fetchColumn()?:null;
                }
                if($match){$maps[$table][$old]=$match;$reused[$table][$old]=true;}
                elseif($table==='factbook_preferences'){
                    if($preferences){$pdo->prepare('DELETE FROM factbook_preferences WHERE user_id=?')->execute([$user]);fb_backup_insert($pdo,$table,$row);}
                }else{
                    if($table==='factbook_media'){
                        $image=$images[$old];$folder=$row['entry_id']??cssv_uuid_v4();$path=$user.'/'.$folder.'/'.cssv_uuid_v4().'.'.$image['info']['ext'];$root=cssv_private_storage_dir();$dir=$root.'/factbook/'.$user.'/'.$folder;
                        if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))throw new RuntimeException('Private image staging failed.');$real=realpath($dir);$base=realpath($root);if(!$real||!$base||!str_starts_with($real,$base.'/factbook/'.$user.'/'))throw new RuntimeException('Private image staging path is invalid.');
                        $file=$dir.'/'.basename($path);$files[]=$file;fb_backup_stage_record($manifest,$files);$stream=fopen($file,'x+b');if(!$stream)throw new RuntimeException('Private image staging failed.');try{if(fwrite($stream,$image['bytes'])!==strlen($image['bytes'])||!fflush($stream)||(function_exists('fsync')&&!fsync($stream)))throw new RuntimeException('Private image staging failed.');}finally{fclose($stream);}chmod($file,0600);
                        $row['storage_path']=$path;$row['mime_type']=$image['info']['mime'];$row['byte_size']=$image['info']['size'];$row['width']=$image['info']['width'];$row['height']=$image['info']['height'];$row['sha256']=$image['info']['sha256'];
                    }
                    if($table==='factbook_revisions'){
                        $snapshot=$row['snapshot'];$originLinks=array_intersect_key($snapshot,array_flip(['id','user_id','subject_id','category_id']));$current=$ids['factbook_entries'][$original['entry_id']];foreach(['id'=>'factbook_entries','subject_id'=>'factbook_subjects','category_id'=>'factbook_categories'] as $key=>$target)if(!empty($snapshot[$key])&&isset($maps[$target][$snapshot[$key]]))$snapshot[$key]=$maps[$target][$snapshot[$key]];
                        foreach(['subject_id'=>'factbook_subjects','category_id'=>'factbook_categories'] as $key=>$target)if(!empty($snapshot[$key])&&!in_array($snapshot[$key],$maps[$target]??[],true))$snapshot[$key]=empty($current[$key])?null:$maps[$target][$current[$key]];
                        $snapshot['user_id']=$user;$snapshot['_backup_import']=['original_revision_id'=>$old,'recorded_at'=>$original['created_at']??null,'original_links'=>$originLinks,'previous'=>$snapshot['_backup_import']??null];$row['snapshot']=$snapshot;
                    }
                    if($table==='factbook_collection_entries'||$table==='factbook_entry_tags'){
                        if($table==='factbook_collection_entries'&&isset($reused['factbook_collections'][$original['collection_id']])){if(!isset($collectionOffsets[$row['collection_id']])){$q=$pdo->prepare('SELECT COALESCE(MAX(position),-1)+1 FROM factbook_collection_entries WHERE user_id=? AND collection_id=?');$q->execute([$user,$row['collection_id']]);$collectionOffsets[$row['collection_id']]=(int)$q->fetchColumn();}$row['position']=($row['position']??0)+$collectionOffsets[$row['collection_id']];}
                        $columns=$table==='factbook_collection_entries'?['collection_id','entry_id']:['entry_id','tag_id'];$q=$pdo->prepare('SELECT COUNT(*) FROM `'.$table.'` WHERE user_id=? AND `'.$columns[0].'`=? AND `'.$columns[1].'`=?');$q->execute([$user,$row[$columns[0]],$row[$columns[1]]]);if(!$q->fetchColumn())fb_backup_insert($pdo,$table,$row);
                    }else fb_backup_insert($pdo,$table,$row,$table==='factbook_revisions'?[]:($rawJson[$table][$old]??[]));
                }
                if($table==='factbook_categories')$reused['category_done'][$old]=true;
                unset($pending[$index]);$changed=true;
            }
            if(!$changed)throw new InvalidArgumentException('The backup category tree could not be restored.');
        }
    }
    fb_refresh($pdo,$user);
    foreach($tables as $table=>$rows)foreach($rows as $original)if(isset($original['id'],$maps[$table][$original['id']])&&!isset($reused[$table][$original['id']])){
        $values=[];foreach(['created_at','updated_at'] as $key)if(isset($original[$key],fb_schema()[$table][$key]))$values[$key]=fb_value(fb_schema()[$table][$key],$original[$key]);
        if($values){$q=$pdo->prepare('UPDATE `'.$table.'` SET '.implode(',',array_map(fn($key)=>'`'.$key.'`=?',array_keys($values))).' WHERE id=? AND user_id=?');$q->execute([...array_values($values),$maps[$table][$original['id']],$user]);}
    }
    return ['subjects'=>count($tables['factbook_subjects']),'categories'=>count($tables['factbook_categories']),'entries'=>count($tables['factbook_entries']),'collections'=>count($tables['factbook_collections']),'revisions'=>count($tables['factbook_revisions']),'images'=>count($tables['factbook_media']),'preferences_applied'=>$preferences&&count($tables['factbook_preferences'])>0];
}

function fb_backup_rate(PDO $pdo,string $user,string $event,int $perUser,int $perIp): void {
    cssv_enforce_rate_limit($pdo,$event,$user,$perIp,3600);
    $q=$pdo->prepare('SELECT COUNT(*) FROM login_security_events WHERE event_type=? AND email_hash=? AND occurred_at>=?');$q->execute([$event,cssv_hash_secret(strtolower($user)),gmdate('Y-m-d H:i:s',time()-3600)]);
    if((int)$q->fetchColumn()>=$perUser)cssv_fail('Too many backup attempts for this account. Check the existing receipt before retrying.',429,'rate_limited');
    cssv_log_security_event($pdo,$event,$user,$user);
}

function fb_backup_manifest(string $user,string $request): string {
    return cssv_private_storage_dir('factbook-restore-staging/'.$user).'/'.fb_backup_id($request).'.json';
}
function fb_backup_stage_record(string $manifest,array $files): void {
    if($manifest==='')return;
    $tmp=$manifest.'.'.cssv_uuid_v4().'.tmp';
    try{if(file_put_contents($tmp,json_encode($files,JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Restore staging reference unavailable.');chmod($tmp,0600);if(!rename($tmp,$manifest))throw new RuntimeException('Restore staging reference unavailable.');}finally{if(is_file($tmp))@unlink($tmp);}
}
/** Only our own abandoned restore files; never sweep legacy uploads or delete referenced bytes. */
function fb_backup_cleanup_stages(PDO $pdo,string $user): void {
    $dir=cssv_private_storage_dir('factbook-restore-staging/'.$user);$manifests=glob($dir.'/*.json')?:[];
    if(count($manifests)>1000)throw new RuntimeException('Restore staging needs operator maintenance.');
    $prefix=rtrim(cssv_private_storage_dir(),'/').'/factbook/';
    foreach($manifests as $manifest){
        if(is_link($manifest)||filesize($manifest)>2097152)throw new RuntimeException('Restore staging reference needs operator maintenance.');
        $files=json_decode((string)file_get_contents($manifest),true,16,JSON_THROW_ON_ERROR);if(!is_array($files)||!array_is_list($files))throw new RuntimeException('Restore staging reference is invalid.');
        foreach($files as $file){
            if(!is_string($file)||!str_starts_with($file,$prefix.$user.'/')||!preg_match('~^'.preg_quote($prefix.$user,'~').'/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|gif)$~D',$file)||is_link($file))throw new RuntimeException('Restore staging path is invalid.');
            $q=$pdo->prepare('SELECT COUNT(*) FROM factbook_media WHERE user_id=? AND storage_path=?');$q->execute([$user,substr($file,strlen($prefix))]);
            if(!$q->fetchColumn()&&is_file($file)&&!unlink($file))throw new RuntimeException('Restore staging cleanup failed.');
        }
        if(!unlink($manifest))throw new RuntimeException('Restore staging reference cleanup failed.');
    }
}
