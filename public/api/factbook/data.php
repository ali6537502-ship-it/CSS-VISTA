<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_factbook.php';
cssv_require_method('POST');account_require_json_origin();
$pdo=cssv_db();$session=cssv_require_user($pdo);cssv_require_csrf($session);$user=$session['user_id'];
$body=cssv_request_json(2097152);$action=$body['action']??'';$lock='factbook-'.$user;
try {
    $q=$pdo->prepare('SELECT GET_LOCK(?,10)');$q->execute([$lock]);if((int)$q->fetchColumn()!==1)cssv_fail('Your factbook is busy saving. Please try again.',409,'save_busy');
    $pdo->beginTransaction();
    if($action==='save_entry') {
        $input=$body['entry']??null;$sources=$body['sources']??[];$tags=$body['tags']??[];
        if(!is_array($input)||!is_array($sources)||count($sources)>100||!is_array($tags)||count($tags)>40)cssv_fail('The entry contains too many sources or tags.',422,'invalid_entry');
        $row=!empty($input['id'])?fb_update($pdo,'factbook_entries',fb_row($pdo,'factbook_entries',fb_uuid($input['id']),$user),$input,$user):fb_insert($pdo,'factbook_entries',$input,$user);
        $id=$row['id'];$pdo->prepare('DELETE FROM factbook_sources WHERE entry_id=? AND user_id=?')->execute([$id,$user]);
        foreach($sources as $position=>$source){if(!is_array($source))cssv_fail('A source is invalid.',422,'invalid_source');$source['position']=$position;$source['entry_id']=$id;fb_insert($pdo,'factbook_sources',$source,$user);}
        $pdo->prepare('DELETE FROM factbook_entry_tags WHERE entry_id=? AND user_id=?')->execute([$id,$user]);$seen=[];
        foreach($tags as $tag) {
            if(!is_string($tag))cssv_fail('A tag is invalid.',422,'invalid_tag');$tag=ltrim(trim($tag),'#');if($tag==='')continue;fb_value('VARCHAR(60)',$tag);$key=mb_strtolower($tag);if(isset($seen[$key]))continue;$seen[$key]=true;
            $q=$pdo->prepare('SELECT id FROM factbook_tags WHERE name=? AND user_id=?');$q->execute([$tag,$user]);$tagId=$q->fetchColumn();if(!$tagId)$tagId=fb_insert($pdo,'factbook_tags',['name'=>$tag],$user)['id'];
            fb_insert($pdo,'factbook_entry_tags',['entry_id'=>$id,'tag_id'=>$tagId],$user);
        }
        fb_refresh($pdo,$user);$result=['data'=>fb_decode('factbook_entries',fb_row($pdo,'factbook_entries',$id,$user))];
    } elseif($action==='collection_entries') {
        $id=fb_uuid($body['collection_id']??null);fb_row($pdo,'factbook_collections',$id,$user);$ids=$body['entry_ids']??null;
        if(!is_array($ids)||count($ids)>1000)cssv_fail('Choose up to 1,000 entries.',422,'invalid_entries');
        foreach($ids as $entry)fb_row($pdo,'factbook_entries',fb_uuid($entry),$user);
        $pdo->prepare('DELETE FROM factbook_collection_entries WHERE collection_id=? AND user_id=?')->execute([$id,$user]);
        foreach(array_values(array_unique($ids)) as $position=>$entry)fb_insert($pdo,'factbook_collection_entries',['collection_id'=>$id,'entry_id'=>$entry,'position'=>$position],$user);
        $result=['ok'=>true];
    } elseif($action==='delete_all') {
        if(($body['confirmation']??'')!=='DELETE MY FACTBOOK')cssv_fail('Type DELETE MY FACTBOOK to confirm.',422,'confirmation_required');
        $pdo->prepare('DELETE FROM factbook_entries WHERE user_id=?')->execute([$user]);
        $pdo->prepare('UPDATE factbook_categories SET parent_id=NULL WHERE user_id=?')->execute([$user]);
        foreach(['factbook_subjects','factbook_collections','factbook_tags','factbook_media','factbook_preferences'] as $table)$pdo->prepare("DELETE FROM $table WHERE user_id=?")->execute([$user]);
        $result=['ok'=>true];
    } else {
        $table=$body['table']??'';$op=$body['operation']??'select';
        if(!is_string($table)||!isset(fb_schema()[$table])||!in_array($op,['select','insert','update','delete','upsert'],true))cssv_fail('Choose a valid factbook operation.',422,'invalid_operation');
        if($op==='select') {$result=fb_select($pdo,$table,$body,$user);$result['data']=array_map(fn($row)=>fb_decode($table,$row),$result['data']);}
        else {
            if(in_array($table,['factbook_revisions','factbook_media'],true))cssv_fail('Use the dedicated image or revision controls.',403,'protected_table');
            if($op==='upsert'&&$table!=='factbook_preferences')cssv_fail('This operation is not available.',422,'invalid_operation');
            $rows=[];
            if($op==='insert') {
                $values=$body['values']??[];if(!is_array($values))cssv_fail('Invalid entry.',422,'invalid_entry');$inputs=array_is_list($values)?$values:[$values];if(count($inputs)>1000)cssv_fail('Too many entries.',422,'invalid_entry');
                foreach($inputs as $input){if(!is_array($input))cssv_fail('Invalid entry.',422,'invalid_entry');$rows[]=fb_insert($pdo,$table,$input,$user);}
            } else {
                if($op==='upsert'){$q=$pdo->prepare('SELECT * FROM factbook_preferences WHERE user_id=?');$q->execute([$user]);$existing=$q->fetch();$rows[]=$existing?fb_update($pdo,$table,$existing,$body['values']??[],$user):fb_insert($pdo,$table,$body['values']??[],$user);}
                else {
                    if(empty($body['filters']))cssv_fail('Select the items you want to change.',422,'missing_filter');
                    $selected=fb_select($pdo,$table,$body,$user,true)['data'];
                    foreach($selected as $row){if($op==='delete')fb_remove($pdo,$table,$row,$user);else $rows[]=fb_update($pdo,$table,$row,$body['values']??[],$user);}
                }
            }
            fb_refresh($pdo,$user);$result=['data'=>array_map(fn($row)=>fb_decode($table,$row),$rows),'count'=>count($rows)];
        }
    }
    $pdo->commit();
    if($action==='delete_all'||($body['operation']??'')==='delete')fb_clean_orphan_media($pdo,$user);
    cssv_json($result);
} catch(Throwable $error) {
    if($pdo->inTransaction())$pdo->rollBack();
    error_log('CSSV factbook operation failed: '.get_class($error).' '.$error->getCode());
    cssv_fail('Your factbook could not be saved. Please try again.',503,'factbook_unavailable');
} finally {$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);}
