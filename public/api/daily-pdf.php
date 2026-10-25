<?php
declare(strict_types=1);
require_once __DIR__.'/_bootstrap.php';
require_once __DIR__.'/_daily_pdf.php';
cssv_require_method('GET','HEAD');
try {
    $pdo=cssv_db(); dp_schema($pdo); dp_sync($pdo);
    $rows=dp_records($pdo);
    if(isset($_GET['cover'])) {
        $r=null; foreach($rows as $row) if($row['id']===$_GET['cover']) $r=$row;
        if(!$r || empty($r['cover']) || !is_file(dp_cover_path($r))) cssv_fail('Cover unavailable.',404,'not_found');
        header('Content-Type: image/png'); header('X-Content-Type-Options: nosniff'); header('Cache-Control: private, no-cache, must-revalidate');
        header('Content-Length: '.filesize(dp_cover_path($r))); if($_SERVER['REQUEST_METHOD']!=='HEAD') readfile(dp_cover_path($r)); exit;
    }
    if(isset($_GET['file'])) {
        $r=null; foreach($rows as $row) if($row['id']===$_GET['file']) $r=$row;
        if(!$r) cssv_fail('This document is temporarily unavailable.',404,'document_unavailable');
        $path=dp_path($r); if(!hash_equals($r['sha256'],hash_file('sha256',$path))) cssv_fail('Document integrity check failed. Please retry later.',503,'document_unavailable'); $size=filesize($path); $start=0; $end=$size-1;
        header('Content-Type: application/pdf'); header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN'); header("Content-Security-Policy: sandbox; default-src 'none'");
        // Always reauthorize visibility, including after withdrawal/replacement.
        header('Cache-Control: private, no-cache, must-revalidate'); header('Accept-Ranges: bytes');
        header('X-Robots-Tag: noindex'); header('ETag: "'.$r['sha256'].'"');
        header('Content-Disposition: '.(isset($_GET['download'])?'attachment':'inline').'; filename="CSS-VISTA-Current-Affairs-Daily-'.$r['date'].'.pdf"');
        if(isset($_SERVER['HTTP_RANGE'])) {
            if(!preg_match('/^bytes=(\d*)-(\d*)$/',$_SERVER['HTTP_RANGE'],$m) || ($m[1]==='' && $m[2]==='')) {header('Content-Range: bytes */'.$size); http_response_code(416); exit;}
            if($m[1]==='') $start=max(0,$size-(int)$m[2]); else { $start=(int)$m[1]; if($m[2]!=='') $end=min($end,(int)$m[2]); }
            if($start>$end || $start>=$size) {header('Content-Range: bytes */'.$size); http_response_code(416); exit;}
            http_response_code(206); header("Content-Range: bytes $start-$end/$size");
        }
        header('Content-Length: '.($end-$start+1));
        if($_SERVER['REQUEST_METHOD']==='HEAD') exit;
        $stream=fopen($path,'rb'); fseek($stream,$start); $left=$end-$start+1;
        while($left>0 && !feof($stream) && !connection_aborted()) { $chunk=fread($stream,min(65536,$left)); echo $chunk; $left-=strlen($chunk); }
        fclose($stream); exit;
    }
    $dates=array_column($rows,'date'); $latest=$rows[0] ?? null;
    $search=mb_strtolower(substr((string)($_GET['q'] ?? ''),0,200));
    $period=(string)($_GET['period'] ?? ''); $id=(string)($_GET['id'] ?? '');
    $rows=array_values(array_filter($rows,fn($r)=> (!$id || $r['id']===$id) && (!$period || str_starts_with($r['date'],$period)) && (!$search || str_contains(mb_strtolower($r['title'].' '.$r['date'].' '.$r['description'].' '.implode(' ',$r['topics'])),$search))));
    $page=max(1,(int)($_GET['page'] ?? 1)); $total=count($rows);
    cssv_json(['ok'=>true,'items'=>array_map('dp_public',array_slice($rows,($page-1)*12,12)),'total'=>$total,'page'=>$page,'dates'=>$dates,'latest'=>$latest?dp_public($latest):null]);
} catch(Throwable $e) { error_log('Daily PDF: '.$e->getMessage()); cssv_fail('The publication service is temporarily unavailable. Please retry.',503,'publication_unavailable'); }
