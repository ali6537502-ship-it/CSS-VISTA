<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_admin_auth.php';
require_once dirname(__DIR__) . '/_current_affairs.php';
cssv_require_method('GET','POST');
$pdo=null;
try {
    $pdo=cssv_db(); $admin=cssv_require_separate_admin($pdo);
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        $cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE] ?? '');
        $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($cookie==='' || $token==='' || !hash_equals($cookie,$token) || !hash_equals($admin['csrf_hash'],cssv_hash_secret($token))) cssv_fail('Please refresh your admin session and try again.',403,'invalid_csrf');
    }
    ca_ensure_schema($pdo);
    if ($_SERVER['REQUEST_METHOD']==='GET') {
        $date=ca_query_param('date',10);
        if ($date!=='') {
            ca_date($date);
            $q=$pdo->prepare('SELECT metadata FROM current_affairs_days WHERE publication_date=?'); $q->execute([$date]); $meta=$q->fetchColumn();
            if (!$meta) cssv_fail('Edition not found.',404,'edition_not_found');
            $q=$pdo->prepare('SELECT content FROM current_affairs_items WHERE publication_date=? AND active=1 ORDER BY id'); $q->execute([$date]);
            $dataset=json_decode($meta,true,512,JSON_THROW_ON_ERROR);
            $dataset['stories']=array_map(fn($s)=>json_decode($s,true,512,JSON_THROW_ON_ERROR),$q->fetchAll(PDO::FETCH_COLUMN));
            cssv_json(['ok'=>true,'dataset'=>$dataset]);
        }
        cssv_json(['ok'=>true,'today'=>ca_today(),
            'days'=>$pdo->query('SELECT publication_date,published_at,edition,story_count,is_published,ingested_at FROM current_affairs_days ORDER BY publication_date DESC LIMIT 60')->fetchAll(),
            'runs'=>$pdo->query('SELECT publication_date,status,story_count,error_code,created_at FROM current_affairs_ingestion_runs ORDER BY created_at DESC LIMIT 20')->fetchAll(),
            'tokens'=>$pdo->query('SELECT id,label,expires_at,last_used_at,revoked_at FROM current_affairs_publish_tokens ORDER BY created_at DESC LIMIT 20')->fetchAll()]);
    }
    $body=ca_request_json();
    switch ($body['action'] ?? '') {
        case 'publish':
            if (!is_array($body['dataset'] ?? null)) throw new InvalidArgumentException('Provide a dataset object.');
            cssv_json(['ok'=>true]+ca_publish($pdo,$body['dataset']));
        case 'unpublish':
            $date=ca_date($body['date'] ?? null);
            $pdo->prepare('UPDATE current_affairs_days SET is_published=0 WHERE publication_date=?')->execute([$date]);
            ca_log_run($pdo,$date,'unpublished');
            cssv_json(['ok'=>true]);
        case 'create_token':
            $label=ca_text($body['label'] ?? null,'token label',120);
            $plain='cssv_ca_'.rtrim(strtr(base64_encode(random_bytes(48)),'+/','-_'),'=');
            $id=cssv_uuid_v4();
            $pdo->prepare('INSERT INTO current_affairs_publish_tokens (id,token_hash,label,created_by,expires_at) VALUES (?,?,?,?,DATE_ADD(NOW(6),INTERVAL 365 DAY))')
                ->execute([$id,cssv_hash_secret($plain),$label,$admin['admin_id']]);
            cssv_json(['ok'=>true,'token'=>$plain,'id'=>$id]);
        case 'revoke_token':
            $id=ca_text($body['id'] ?? null,'token id',36);
            $pdo->prepare('UPDATE current_affairs_publish_tokens SET revoked_at=COALESCE(revoked_at,NOW(6)) WHERE id=?')->execute([$id]);
            cssv_json(['ok'=>true]);
        default: throw new InvalidArgumentException('Unknown publishing action.');
    }
} catch (Throwable $e) { ca_problem($e,$pdo,$_SERVER['REQUEST_METHOD']==='POST'); }
