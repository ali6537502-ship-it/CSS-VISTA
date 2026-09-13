<?php
declare(strict_types=1);
require_once __DIR__.'/_account_auth.php';
function fb_schema(): array { static $schema; return $schema ??= require __DIR__.'/_factbook_schema.php'; }
function fb_uuid(mixed $value): string {
    if (!is_string($value)||!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i',$value)) cssv_fail('Choose a valid factbook item.',422,'invalid_item');
    return strtolower($value);
}
function fb_row(PDO $pdo,string $table,string $id,string $user): array {
    $q=$pdo->prepare("SELECT * FROM `$table` WHERE id=? AND user_id=?");$q->execute([fb_uuid($id),$user]);$row=$q->fetch();
    if (!$row) cssv_fail('This factbook item could not be found.',404,'item_not_found'); return $row;
}
function fb_decode(string $table,array $row): array {
    foreach(fb_schema()[$table] as $key=>$type) {
        if (!array_key_exists($key,$row)||$row[$key]===null) continue;
        if ($type==='JSON') $row[$key]=json_decode($row[$key],true,64,JSON_THROW_ON_ERROR);
        elseif(str_starts_with($type,'TINYINT')) $row[$key]=(bool)$row[$key];
        elseif(str_starts_with($type,'INT')) $row[$key]=(int)$row[$key];
        elseif(str_starts_with($type,'DATETIME')) $row[$key]=str_replace(' ','T',$row[$key]).'Z';
    } return $row;
}
function fb_value(string $type,mixed $value): mixed {
    if($value===null)return null;
    if($type==='JSON') { if(!is_array($value)&&!is_object($value))cssv_fail('The entry content is invalid.',422,'invalid_content');return json_encode($value,JSON_THROW_ON_ERROR); }
    if(str_starts_with($type,'TINYINT')) { if(!is_bool($value)&&!in_array($value,[0,1],true))cssv_fail('Choose a valid preference.',422,'invalid_value');return (int)$value; }
    if(str_starts_with($type,'INT')) { if(!is_int($value)||abs($value)>100000000)cssv_fail('Choose a valid position.',422,'invalid_value');return $value; }
    if(!is_string($value)||str_contains($value,"\0"))cssv_fail('A factbook field is invalid.',422,'invalid_value');
    if(str_starts_with($type,'DATETIME')) { try { $date=new DateTimeImmutable($value,new DateTimeZone('UTC'));return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'); }catch(Throwable){cssv_fail('Choose a valid date.',422,'invalid_date');} }
    if($type==='DATE'&&(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$value)||!checkdate((int)substr($value,5,2),(int)substr($value,8,2),(int)substr($value,0,4))))cssv_fail('Choose a valid date.',422,'invalid_date');
    $max=preg_match('/^(?:VAR)?CHAR\((\d+)\)/',$type,$m)?(int)$m[1]:100000;
    if(mb_strlen($value)>$max)cssv_fail('A factbook field is too long.',422,'invalid_value');return $value;
}
function fb_values(string $table,array $values,string $user,bool $insert): array {
    $schema=fb_schema()[$table];$out=[];
    foreach($values as $key=>$value) {
        if($key==='user_id') { if($value!==$user)cssv_fail('This item belongs to another account.',403,'ownership_mismatch');continue; }
        if(in_array($key,['id','created_at','updated_at','search_text','source_count','entry_count','category_count'],true))continue;
        if(!isset($schema[$key]))cssv_fail('This factbook field cannot be changed.',422,'invalid_field');
        $out[$key]=fb_value($schema[$key],$value);
    }
    foreach(['subject_id','category_id','parent_id','entry_id','tag_id','collection_id'] as $key)if(isset($out[$key]))$out[$key]=fb_uuid($out[$key]);
    foreach(['name','title'] as $key)if(isset($out[$key])&&trim($out[$key])==='')cssv_fail('Add a title or name before saving.',422,'missing_name');
    foreach(['color','accent_color'] as $key)if(isset($out[$key])&&!preg_match('/^#[0-9a-f]{6}$/i',$out[$key]))cssv_fail('Choose a valid colour.',422,'invalid_colour');
    if(isset($out['web_address'])&&$out['web_address']!==''&&(!filter_var($out['web_address'],FILTER_VALIDATE_URL)||!in_array(strtolower(parse_url($out['web_address'],PHP_URL_SCHEME)??''),['http','https'],true)))cssv_fail('Source links must start with https:// or http://.',422,'invalid_source');
    $enums=['importance'=>['normal','important','very-important','must-revise'],'revision_status'=>['not-reviewed','learning','revised-once','well-prepared']];
    $enums['entry_type']=['fact','statistic','quotation','definition','case-study','report-index','legal-provision','event','timeline','comparison','custom-table','argument','cause-effect','problem-solution','book-note','media','rich-note'];
    foreach($enums as $key=>$options)if(isset($out[$key])&&!in_array($out[$key],$options,true))cssv_fail('Choose a valid entry option.',422,'invalid_value');
    if(isset($out['importance'])&&!in_array($out['importance'],$enums['importance'],true))cssv_fail('Choose a valid importance.',422,'invalid_value');
    $now=gmdate('Y-m-d H:i:s');
    if($insert) { $out['user_id']=$user;if(isset($schema['id']))$out['id']=cssv_uuid_v4();if(isset($schema['created_at']))$out['created_at']=$now; }
    if(isset($schema['updated_at']))$out['updated_at']=$now;
    return $out;
}
function fb_relations(PDO $pdo,string $table,array $row,string $user): void {
    foreach(['subject_id'=>'factbook_subjects','category_id'=>'factbook_categories','entry_id'=>'factbook_entries','tag_id'=>'factbook_tags','collection_id'=>'factbook_collections'] as $key=>$target) {
        if(empty($row[$key]))continue;$related=fb_row($pdo,$target,$row[$key],$user);
        if($key==='category_id'&&isset($row['subject_id'])&&$related['subject_id']!==$row['subject_id'])cssv_fail('Choose a category in this subject.',422,'invalid_category');
    }
    if($table==='factbook_categories'&&!empty($row['parent_id'])) {
        $seen=[$row['id']??''=>true];$parent=$row['parent_id'];
        while($parent) { if(isset($seen[$parent])||count($seen)>100)cssv_fail('A category cannot contain itself.',422,'category_cycle');$seen[$parent]=true;$ancestor=fb_row($pdo,$table,$parent,$user);if($ancestor['subject_id']!==$row['subject_id'])cssv_fail('Choose a parent in the same subject.',422,'invalid_parent');$parent=$ancestor['parent_id']; }
    }
    if($table==='factbook_categories'&&isset($row['id'])) {
        $q=$pdo->prepare('SELECT COUNT(*) FROM factbook_categories WHERE user_id=? AND parent_id=? AND subject_id<>?');$q->execute([$user,$row['id'],$row['subject_id']]);
        if((int)$q->fetchColumn())cssv_fail('Move child categories before changing this subject.',422,'category_has_children');
        $q=$pdo->prepare('SELECT COUNT(*) FROM factbook_entries WHERE user_id=? AND category_id=? AND subject_id<>?');$q->execute([$user,$row['id'],$row['subject_id']]);
        if((int)$q->fetchColumn())cssv_fail('Move entries before changing this category subject.',422,'category_has_entries');
    }
}
function fb_insert(PDO $pdo,string $table,array $input,string $user): array {
    $row=fb_values($table,$input,$user,true);fb_relations($pdo,$table,$row,$user);
    $keys=array_keys($row);$pdo->prepare("INSERT INTO `$table` (`".implode('`,`',$keys).'`) VALUES ('.implode(',',array_fill(0,count($keys),'?')).')')->execute(array_values($row));
    if(isset($row['id']))return fb_row($pdo,$table,$row['id'],$user);
    return $row;
}
function fb_revision(PDO $pdo,array $row,string $user): void {
    $pdo->prepare('INSERT INTO factbook_revisions(id,user_id,entry_id,snapshot,created_at) VALUES(?,?,?,?,NOW(6))')->execute([cssv_uuid_v4(),$user,$row['id'],json_encode(fb_decode('factbook_entries',$row),JSON_THROW_ON_ERROR)]);
}
function fb_update(PDO $pdo,string $table,array $old,array $input,string $user): array {
    $patch=fb_values($table,$input,$user,false);fb_relations($pdo,$table,array_merge($old,$patch),$user);
    if($table==='factbook_entries')fb_revision($pdo,$old,$user);
    if($patch) {
        $keys=array_keys($patch);$params=array_values($patch);$params[]=$user;
        $where='user_id=?';foreach(['id','entry_id','tag_id','collection_id'] as $key)if(isset($old[$key])&&($key==='id'||!isset($old['id']))){$where.=" AND `$key`=?";$params[]=$old[$key];}
        $pdo->prepare("UPDATE `$table` SET ".implode(',',array_map(fn($key)=>"`$key`=?",$keys))." WHERE $where")->execute($params);
    }
    return isset($old['id'])?fb_row($pdo,$table,$old['id'],$user):array_merge($old,$patch);
}
function fb_refresh(PDO $pdo,string $user): void {
    $pdo->prepare('UPDATE factbook_entries e SET source_count=(SELECT COUNT(*) FROM factbook_sources s WHERE s.entry_id=e.id AND s.user_id=e.user_id),search_text=CONCAT_WS(" ",e.title,e.personal_remarks,e.content,(SELECT GROUP_CONCAT(t.name SEPARATOR " ") FROM factbook_entry_tags et JOIN factbook_tags t ON t.id=et.tag_id AND t.user_id=et.user_id WHERE et.entry_id=e.id AND et.user_id=e.user_id)) WHERE e.user_id=?')->execute([$user]);
    $pdo->prepare('UPDATE factbook_subjects s SET category_count=(SELECT COUNT(*) FROM factbook_categories c WHERE c.subject_id=s.id AND c.user_id=s.user_id AND c.deleted_at IS NULL),entry_count=(SELECT COUNT(*) FROM factbook_entries e WHERE e.subject_id=s.id AND e.user_id=s.user_id AND e.deleted_at IS NULL) WHERE s.user_id=?')->execute([$user]);
    $pdo->prepare('UPDATE factbook_categories c SET entry_count=(SELECT COUNT(*) FROM factbook_entries e WHERE e.category_id=c.id AND e.user_id=c.user_id AND e.deleted_at IS NULL) WHERE c.user_id=?')->execute([$user]);
}
function fb_filters(string $table,array $filters,string $user): array {
    if(count($filters)>20)cssv_fail('Too many filters.',422,'invalid_filters');$sql='r.user_id=?';$args=[$user];$schema=fb_schema()[$table];
    foreach($filters as $filter) {
        $key=$filter['column']??'';$op=$filter['operator']??'';$value=$filter['value']??null;
        if(!isset($schema[$key]))cssv_fail('Choose a valid filter.',422,'invalid_filter');$column='r.`'.$key.'`';
        if($key==='user_id'&&$op==='eq'&&$value!==$user)cssv_fail('This item belongs to another account.',403,'ownership_mismatch');
        if(in_array($op,['is','not.is'],true)&&$value===null){$sql.=" AND $column IS ".($op==='not.is'?'NOT ':'').'NULL';continue;}
        if($op==='in') {if(!is_array($value)||count($value)>1000)cssv_fail('Too many selected items.',422,'invalid_filter');if(!$value){$sql.=' AND 1=0';continue;}$sql.=" AND $column IN (".implode(',',array_fill(0,count($value),'?')).')';foreach($value as $item)$args[]=fb_value($schema[$key],$item);continue;}
        $operator=['eq'=>'=','ilike'=>'LIKE','gte'=>'>=','gt'=>'>'][$op]??null;
        if(!$operator||$value===null)cssv_fail('Choose a valid filter.',422,'invalid_filter');$sql.=" AND $column $operator ?";$args[]=fb_value($schema[$key],$value);
    } return [$sql,$args];
}
function fb_select(PDO $pdo,string $table,array $body,string $user,bool $lock=false): array {
    [$where,$args]=fb_filters($table,$body['filters']??[],$user);$order=[];
    foreach(array_slice($body['orders']??[],0,5) as $item) { $key=$item['column']??'';if(!isset(fb_schema()[$table][$key]))cssv_fail('Choose a valid sort.',422,'invalid_sort');$order[]='r.`'.$key.'` '.(($item['ascending']??true)?'ASC':'DESC'); }
    $limit=max(1,min(1000,(int)($body['limit']??1000)));$offset=max(0,min(1000000,(int)($body['offset']??0)));
    $query=$pdo->prepare("SELECT r.* FROM `$table` r WHERE $where".($order?' ORDER BY '.implode(',',$order):'')." LIMIT $limit OFFSET $offset".($lock?' FOR UPDATE':''));$query->execute($args);$rows=$query->fetchAll();$count=null;
    if(!empty($body['count'])){$query=$pdo->prepare("SELECT COUNT(*) FROM `$table` r WHERE $where");$query->execute($args);$count=(int)$query->fetchColumn();}
    if($table==='factbook_entry_tags'&&($body['columns']??'')==='entry_id, tag:factbook_tags(name)')foreach($rows as &$row){$tag=fb_row($pdo,'factbook_tags',$row['tag_id'],$user);$row['tag']=['name'=>$tag['name']];}unset($row);
    return ['data'=>$rows,'count'=>$count];
}
function fb_remove(PDO $pdo,string $table,array $row,string $user): void {
    if($table==='factbook_subjects') {
        $pdo->prepare('DELETE FROM factbook_entries WHERE subject_id=? AND user_id=?')->execute([$row['id'],$user]);
        $pdo->prepare('UPDATE factbook_categories SET parent_id=NULL WHERE subject_id=? AND user_id=?')->execute([$row['id'],$user]);
    }
    if($table==='factbook_categories') {
        $q=$pdo->prepare('SELECT * FROM factbook_categories WHERE parent_id=? AND user_id=?');$q->execute([$row['id'],$user]);foreach($q->fetchAll() as $child)fb_remove($pdo,$table,$child,$user);
        $pdo->prepare('DELETE FROM factbook_entries WHERE category_id=? AND user_id=?')->execute([$row['id'],$user]);
    }
    $where='user_id=?';$args=[$user];foreach(['id','entry_id','tag_id','collection_id'] as $key)if(isset($row[$key])&&($key==='id'||!isset($row['id']))){$where.=" AND `$key`=?";$args[]=$row[$key];}
    $pdo->prepare("DELETE FROM `$table` WHERE $where")->execute($args);
}
function fb_clean_orphan_media(PDO $pdo,string $user): void {
    $root=cssv_private_storage_dir().'/factbook/'.$user;
    if(!is_dir($root)||is_link($root))return;
    $q=$pdo->prepare('SELECT storage_path FROM factbook_media WHERE user_id=?');$q->execute([$user]);$keep=array_fill_keys($q->fetchAll(PDO::FETCH_COLUMN),true);
    $files=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);
    foreach($files as $file){if($file->isLink())continue;if($file->isDir()){@rmdir($file->getPathname());continue;}$path=$user.'/'.substr($file->getPathname(),strlen($root)+1);if(!isset($keep[$path]))@unlink($file->getPathname());}
}
