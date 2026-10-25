<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_admin_auth.php';
require_once dirname(__DIR__).'/_daily_pdf.php';
cssv_require_method('GET','POST');
$pdo=null; $newPath=null; $newCover=null;
try {
    $pdo=cssv_db(); $admin=cssv_require_separate_admin($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST') {
        $cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE] ?? ''); $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if(!$cookie || !$token || !hash_equals($cookie,$token) || !hash_equals($admin['csrf_hash'],cssv_hash_secret($token))) cssv_fail('Refresh your admin session and retry.',403,'invalid_csrf');
        cssv_enforce_rate_limit($pdo,'daily_pdf_write',$admin['admin_id'],60,3600);
    }
    dp_schema($pdo); dp_sync($pdo);
    if($_SERVER['REQUEST_METHOD']==='GET') {
        if(isset($_GET['preview'])) {
            $r=null; foreach(dp_records($pdo,true) as $row) if($row['id']===$_GET['preview']) $r=$row;
            if(!$r || !is_file(dp_path($r))) cssv_fail('PDF not found.',404,'not_found');
            header('Content-Type: application/pdf'); header('Content-Disposition: inline'); header('X-Frame-Options: SAMEORIGIN'); header('Content-Length: '.filesize(dp_path($r))); readfile(dp_path($r)); exit;
        }
        $rows=dp_records($pdo,true); $page=max(1,(int)($_GET['page']??1));
        cssv_json(['ok'=>true,'items'=>array_map('dp_public',array_slice($rows,($page-1)*12,12)), 'total'=>count($rows), 'conflicts'=>$GLOBALS['DP_CONFLICTS']??[], 'audit'=>$pdo->query('SELECT edition_id,actor,action,created_at FROM daily_pdf_audit ORDER BY id DESC LIMIT 30')->fetchAll(), 'maxBytes'=>(int)(cssv_env('CSSV_DAILY_MAX_BYTES') ?: 26214400)]);
    }
    $date=(string)($_POST['date']??'');
    $d=DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone('Asia/Karachi'));
    if(!$d || $d->format('Y-m-d')!==$date) throw new InvalidArgumentException('Choose a valid edition date.');
    $id='daily-'.$date; $title=trim((string)($_POST['title']??'')); $description=trim((string)($_POST['description']??'')); $status=(string)($_POST['status']??'draft');
    if(!$title || mb_strlen($title)>240 || mb_strlen($description)>2000 || !in_array($status,['draft','scheduled','published','withdrawn','removed'],true)) throw new InvalidArgumentException('Check the title, description and status.');
    $topics=array_values(array_filter(array_map('trim',explode(',',(string)($_POST['topics']??'')))));
    if(count($topics)>30 || array_filter($topics,fn($t)=>mb_strlen($t)>80)) throw new InvalidArgumentException('Use at most 30 topics, 80 characters each.');
    $publishedAt=gmdate('c');
    if($status==='scheduled') {
        $scheduled=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',(string)($_POST['scheduledAt']??''),new DateTimeZone('Asia/Karachi'));
        if(!$scheduled || $scheduled->getTimestamp()<=time()) throw new InvalidArgumentException('Choose a future Pakistan-local publication time.');
        $publishedAt=$scheduled->format('c');
    }
    $upload=isset($_FILES['pdf']) && $_FILES['pdf']['error']!==UPLOAD_ERR_NO_FILE ? dp_validate_upload($_FILES['pdf']) : null;
    $pdo->beginTransaction();
    $q=$pdo->prepare('SELECT * FROM daily_pdf_editions WHERE id=? FOR UPDATE'); $q->execute([$id]); $old=$q->fetch();
    if($old && (int)($_POST['revision']??0)!==(int)$old['revision']) throw new InvalidArgumentException('This edition already exists or changed. Reload and edit it explicitly.');
    if(!$old && !$upload) throw new InvalidArgumentException('Select a PDF for the new edition.');
    $prior=$old?json_decode($old['metadata'],true):[];
    if($old) { $q=$pdo->prepare('SELECT metadata FROM daily_pdf_overrides WHERE id=?'); $q->execute([$id]); $override=$q->fetchColumn(); if($override) $prior=array_replace($prior,json_decode($override,true)); }
    $r=array_replace($prior,['id'=>$id,'date'=>$date,'title'=>$title,'description'=>$description,'topics'=>$topics,'status'=>$status,'publishedAt'=>$status==='published' && ($prior['status']??'')==='published' ? $prior['publishedAt'] : $publishedAt,'updatedAt'=>gmdate('c'),'source'=>$old['source']??'admin']);
    if($upload) {
        $version=($prior['version']??0)+1; $relative=substr($date,0,4).'/'.substr($date,5,2).'/'.$id.'-v'.$version.'.pdf';
        $base=cssv_private_storage_dir('daily-pdf/'.substr($date,0,4).'/'.substr($date,5,2));
        $newPath=$base.'/'.basename($relative);
        if(file_exists($newPath)) throw new RuntimeException('Version path already exists; storage needs reconciliation.');
        if(!move_uploaded_file($_FILES['pdf']['tmp_name'],$newPath)) throw new RuntimeException('Could not store PDF.');
        chmod($newPath,0600); $r=array_replace($r,$upload,['file'=>$relative,'storage'=>'admin','version'=>$version]);
    }
    if(isset($_FILES['cover']) && $_FILES['cover']['error']!==UPLOAD_ERR_NO_FILE) {
        $c=$_FILES['cover']; $info=@getimagesize($c['tmp_name']);
        if($c['error']!==UPLOAD_ERR_OK || !is_uploaded_file($c['tmp_name']) || $c['size']>2097152 || !$info || $info[2]!==IMAGETYPE_PNG || $info[0]*$info[1]>8000000) throw new InvalidArgumentException('Cover must be a valid PNG under 2 MB and 8 megapixels.');
        $name=$id.'-'.bin2hex(random_bytes(16)).'.png'; $newCover=cssv_private_storage_dir('daily-pdf/covers').'/'.$name;
        if(!move_uploaded_file($c['tmp_name'],$newCover)) throw new RuntimeException('Cover storage failed.');
        chmod($newCover,0600); $r['cover']=$name; $r['coverStorage']='admin';
    } elseif($upload) { $r['cover']=null; $r['coverStorage']=null; }
    if(!$old) { $q=$pdo->prepare('INSERT INTO daily_pdf_editions (id,edition_date,source,metadata) VALUES (?,?,?,?)'); $q->execute([$id,$date,'admin',json_encode($r,JSON_THROW_ON_ERROR)]); }
    else {
        $pdo->prepare('UPDATE daily_pdf_editions SET revision=revision+1,updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([$id]);
        $pdo->prepare('INSERT INTO daily_pdf_overrides (id,metadata) VALUES (?,?) ON DUPLICATE KEY UPDATE metadata=VALUES(metadata)')->execute([$id,json_encode($r,JSON_THROW_ON_ERROR)]);
    }
    $pdo->prepare('INSERT INTO daily_pdf_audit (edition_id,actor,action,metadata) VALUES (?,?,?,?)')->execute([$id,$admin['email'],!$old?'created':($upload?'replaced':$status),json_encode($r,JSON_THROW_ON_ERROR)]);
    $pdo->commit(); $newPath=null; $newCover=null; cssv_json(['ok'=>true,'id'=>$id]);
} catch(InvalidArgumentException $e) { if($pdo?->inTransaction()) $pdo->rollBack(); if($newPath) @unlink($newPath); if($newCover) @unlink($newCover); cssv_fail($e->getMessage(),422,'invalid_publication'); }
catch(Throwable $e) { if($pdo?->inTransaction()) $pdo->rollBack(); if($newPath) @unlink($newPath); if($newCover) @unlink($newCover); error_log('Daily PDF admin: '.$e->getMessage()); cssv_fail('Publication could not be saved. Verify server PDF validation and storage configuration, then retry.',503,'publication_failed'); }
