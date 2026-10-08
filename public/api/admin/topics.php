<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_admin_auth.php';require_once dirname(__DIR__).'/_topics.php';
cssv_require_method('GET','POST');
try{
    $pdo=cssv_db();$admin=cssv_require_separate_admin($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST'){
        $cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE]??'');$token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if($cookie===''||$token===''||!hash_equals($cookie,$token)||!hash_equals($admin['csrf_hash'],cssv_hash_secret($token)))cssv_fail('Refresh your admin session before publishing.',403,'invalid_csrf');
    }
    cssv_topics_ensure($pdo);
    if($_SERVER['REQUEST_METHOD']==='GET'&&isset($_GET['request_id'])){$q=$pdo->prepare('SELECT result FROM topic_admin_requests WHERE admin_id=? AND request_id=?');$q->execute([$admin['admin_id'],cssv_pro_id($_GET['request_id'])]);$receipt=$q->fetchColumn();if(!$receipt)throw new OutOfBoundsException('Publication receipt not found.');cssv_json(['ok'=>true,...json_decode($receipt,true,32,JSON_THROW_ON_ERROR)]);}
    if($_SERVER['REQUEST_METHOD']==='POST'){cssv_enforce_rate_limit($pdo,'topic_publish',(string)$admin['admin_id'],240,3600);cssv_log_security_event($pdo,'topic_publish',(string)$admin['admin_id'],(string)$admin['admin_id']);cssv_json(['ok'=>true,...cssv_topic_admin_mutation($pdo,$admin,cssv_request_json(700000))]);}
    if(isset($_GET['version_id'])){$version=cssv_pro_id($_GET['version_id']);$q=$pdo->prepare('SELECT v.id,v.topic_id,v.content_hash,v.content,t.revision,t.published_version_id FROM pro_topic_versions v JOIN pro_topics t ON t.id=v.topic_id WHERE v.id=?');$q->execute([$version]);$row=$q->fetch();if(!$row)throw new OutOfBoundsException('Topic version not found.');$row['revision']=(int)$row['revision'];$row['content']=json_decode($row['content'],true,64,JSON_THROW_ON_ERROR);cssv_json(['ok'=>true,'version'=>$row]);}
    if(isset($_GET['topic'])){$topic=cssv_topic_slug($_GET['topic']);$q=$pdo->prepare('SELECT id,revision,published_version_id FROM pro_topics WHERE id=?');$q->execute([$topic]);$meta=$q->fetch();if($meta)$meta['revision']=(int)$meta['revision'];$q=$pdo->prepare('SELECT id,content_hash,created_at,JSON_UNQUOTE(JSON_EXTRACT(content,\'$.title\')) title,JSON_UNQUOTE(JSON_EXTRACT(content,\'$.as_of\')) as_of FROM pro_topic_versions WHERE topic_id=? ORDER BY created_at DESC,id DESC LIMIT 100');$q->execute([$topic]);cssv_json(['ok'=>true,'topic'=>$meta?:null,'versions'=>$q->fetchAll()]);}
    $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Choose a valid publication page.');
    $rows=$pdo->query('SELECT t.id,t.title,t.category,t.revision,t.published_version_id,t.updated_at,(SELECT v.id FROM pro_topic_versions v WHERE v.topic_id=t.id ORDER BY v.created_at DESC,v.id DESC LIMIT 1) latest_version_id,(SELECT COUNT(*) FROM pro_topic_versions v WHERE v.topic_id=t.id) versions FROM pro_topics t ORDER BY t.updated_at DESC,t.id LIMIT 51 OFFSET '.$offset)->fetchAll();$more=count($rows)>50;$rows=array_slice($rows,0,50);foreach($rows as &$r){$r['revision']=(int)$r['revision'];$r['versions']=(int)$r['versions'];$r['updated_at']=cssv_pro_iso($r['updated_at']);}unset($r);
    cssv_json(['ok'=>true,'admin_id'=>$admin['admin_id'],'topics'=>$rows,'has_more'=>$more]);
}catch(Throwable $e){cssv_pro_problem($e);}
