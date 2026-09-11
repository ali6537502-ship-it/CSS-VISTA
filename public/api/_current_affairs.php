<?php
declare(strict_types=1);
require_once __DIR__ . '/_current_affairs_model.php';

function ca_schema_sql(): string
{
    return <<<'SQL'
CREATE TABLE IF NOT EXISTS current_affairs_days (
 publication_date DATE NOT NULL PRIMARY KEY, published_at DATETIME(6) NOT NULL,
 edition VARCHAR(160) NOT NULL, metadata JSON NOT NULL, payload_hash CHAR(64) NOT NULL,
 is_published TINYINT(1) NOT NULL DEFAULT 1, story_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 ingested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 INDEX ca_days_visible (is_published, publication_date, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_items (
 id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 publication_date DATE NOT NULL, category VARCHAR(120) NOT NULL, headline VARCHAR(350) NOT NULL,
 summary TEXT NOT NULL, content JSON NOT NULL, search_text MEDIUMTEXT NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 INDEX ca_items_day (publication_date, active), INDEX ca_items_category (category, publication_date),
 FULLTEXT INDEX ca_items_search (search_text),
 CONSTRAINT ca_items_day_fk FOREIGN KEY (publication_date) REFERENCES current_affairs_days(publication_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_user_items (
 user_id CHAR(36) NOT NULL, item_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 saved TINYINT(1) NOT NULL DEFAULT 0, status ENUM('unread','opened','read') NOT NULL DEFAULT 'unread',
 saved_at DATETIME(6) NULL, first_opened_at DATETIME(6) NULL, last_opened_at DATETIME(6) NULL, completed_at DATETIME(6) NULL,
 PRIMARY KEY (user_id, item_id), INDEX ca_user_saved (user_id, saved, saved_at),
 INDEX ca_user_reading (user_id, status, last_opened_at),
 CONSTRAINT ca_user_item_fk FOREIGN KEY (item_id) REFERENCES current_affairs_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_preferences (
 user_id CHAR(36) NOT NULL PRIMARY KEY, reading_mode ENUM('quick','full') NOT NULL DEFAULT 'quick',
 preferred_categories JSON NOT NULL, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_ingestion_runs (
 id CHAR(36) NOT NULL PRIMARY KEY, publication_date DATE NULL,
 status VARCHAR(30) NOT NULL, story_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 error_code VARCHAR(120) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX ca_ingestion_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS current_affairs_publish_tokens (
 id CHAR(36) NOT NULL PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE, label VARCHAR(120) NOT NULL,
 created_by CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 expires_at DATETIME(6) NOT NULL, last_used_at DATETIME(6) NULL, revoked_at DATETIME(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;
}
function ca_ensure_schema(PDO $pdo): void
{
    // The existing Hostinger APIs use idempotent runtime migrations. Cache a
    // successful migration outside the web root when private storage is set.
    $base = cssv_env('CSSV_PRIVATE_STORAGE_DIR');
    $marker = $base ? rtrim($base, '/\\') . '/ca-schema-v1-' . substr(hash('sha256', (string)cssv_env('CSSV_DB_HOST') . ':' . (string)cssv_env('CSSV_DB_NAME')), 0, 16) : null;
    if ($marker && is_file($marker)) return;
    foreach (explode(';', ca_schema_sql()) as $sql) if (trim($sql) !== '') $pdo->exec($sql);
    if ($marker && is_dir(dirname($marker))) { @file_put_contents($marker, '1', LOCK_EX); @chmod($marker, 0600); }
}
function ca_log_run(PDO $pdo, ?string $date, string $status, int $count = 0, ?string $error = null): void
{
    $pdo->prepare('INSERT INTO current_affairs_ingestion_runs (id,publication_date,status,story_count,error_code) VALUES (?,?,?,?,?)')
        ->execute([cssv_uuid_v4(), $date, $status, $count, $error]);
}
function ca_publish(PDO $pdo, array $dataset): array
{
    $data = ca_validate_dataset($dataset, cssv_env('CSSV_CURRENT_AFFAIRS_ALLOW_TEST_DATA', 'false') === 'true');
    $hash = hash('sha256', ca_json_encode($data));
    $date = $data['date'];
    $metadata = $data; unset($metadata['stories']);
    $at = (new DateTimeImmutable($data['published_at']))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO current_affairs_days (publication_date,published_at,edition,metadata,payload_hash) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE publication_date=VALUES(publication_date)')
            ->execute([$date,$at,$data['edition'],ca_json_encode($metadata),$hash]);
        $q = $pdo->prepare('SELECT payload_hash,story_count,is_published FROM current_affairs_days WHERE publication_date=? FOR UPDATE');
        $q->execute([$date]); $old = $q->fetch();
        if ($old['payload_hash'] === $hash && (int)$old['story_count'] > 0 && (int)$old['is_published'] === 1) {
            ca_log_run($pdo, $date, 'unchanged', (int)$old['story_count']);
            $pdo->commit();
            return ['status'=>'unchanged','date'=>$date,'story_count'=>(int)$old['story_count']];
        }
        $pdo->prepare('UPDATE current_affairs_items SET active=0 WHERE publication_date=?')->execute([$date]);
        foreach ($data['stories'] as $story) {
            // Reserve then lock the ID: concurrent editions cannot move or
            // overwrite a stable story belonging to a different publication.
            $pdo->prepare('INSERT INTO current_affairs_items (id,publication_date,category,headline,summary,content,search_text) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=VALUES(id)')
                ->execute([$story['id'],$date,$story['category'],$story['headline'],$story['summary'],ca_json_encode($story),ca_search_text($story)]);
            $q = $pdo->prepare('SELECT publication_date FROM current_affairs_items WHERE id=? FOR UPDATE');
            $q->execute([$story['id']]);
            if ($q->fetchColumn() !== $date) throw new DomainException('A stable story ID already belongs to another edition.');
            $pdo->prepare('UPDATE current_affairs_items SET category=?,headline=?,summary=?,content=?,search_text=?,active=1 WHERE id=? AND publication_date=?')
                ->execute([$story['category'],$story['headline'],$story['summary'],ca_json_encode($story),ca_search_text($story),$story['id'],$date]);
        }
        $pdo->prepare('UPDATE current_affairs_days SET published_at=?,edition=?,metadata=?,payload_hash=?,story_count=?,is_published=1,ingested_at=NOW(6),updated_at=NOW(6) WHERE publication_date=?')
            ->execute([$at,$data['edition'],ca_json_encode($metadata),$hash,count($data['stories']),$date]);
        ca_log_run($pdo, $date, 'published', count($data['stories']));
        $pdo->commit();
        return ['status'=>'published','date'=>$date,'story_count'=>count($data['stories'])];
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}
function ca_today(): string { return (new DateTimeImmutable('now', new DateTimeZone('Asia/Karachi')))->format('Y-m-d'); }
function ca_visible(): string { return 'i.active=1 AND d.is_published=1 AND d.published_at<=UTC_TIMESTAMP(6)'; }
function ca_preferences(PDO $pdo, string $userId): array
{
    $q=$pdo->prepare('SELECT reading_mode,preferred_categories FROM current_affairs_preferences WHERE user_id=?');
    $q->execute([$userId]); $row=$q->fetch();
    return ['reading_mode'=>$row['reading_mode'] ?? 'quick','preferred_categories'=>$row ? json_decode($row['preferred_categories'], true, 512, JSON_THROW_ON_ERROR) : []];
}
function ca_categories(PDO $pdo): array
{
    return $pdo->query('SELECT DISTINCT i.category FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date WHERE '.ca_visible().' ORDER BY i.category')->fetchAll(PDO::FETCH_COLUMN);
}
function ca_summary(PDO $pdo, string $userId, string $date): array
{
    $q=$pdo->prepare('SELECT edition,published_at,updated_at FROM current_affairs_days WHERE publication_date=? AND is_published=1 AND published_at<=UTC_TIMESTAMP(6)');
    $q->execute([$date]); $day=$q->fetch();
    $latest=$pdo->query('SELECT MAX(publication_date) FROM current_affairs_days WHERE is_published=1 AND published_at<=UTC_TIMESTAMP(6)')->fetchColumn();
    $q=$pdo->prepare("SELECT i.category,COUNT(*) count,SUM(COALESCE(u.status,'unread')<>'read') unread FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date LEFT JOIN current_affairs_user_items u ON u.item_id=i.id AND u.user_id=? WHERE ".ca_visible().' AND i.publication_date=? GROUP BY i.category ORDER BY i.category');
    $q->execute([$userId,$date]);
    $categories=array_map(fn($r)=>['category'=>$r['category'],'count'=>(int)$r['count'],'unread'=>(int)$r['unread']], $q->fetchAll());
    return ['date'=>$date,'published'=>(bool)$day,'latest_date'=>$latest ?: null,'edition'=>$day['edition'] ?? 'Daily Current Affairs',
        'published_at'=>$day ? str_replace(' ','T',$day['published_at']).'Z' : null,
        'updated_at'=>$day ? str_replace(' ','T',$day['updated_at']).'Z' : null,
        'categories'=>$categories,'total'=>array_sum(array_column($categories,'count')),'unread'=>array_sum(array_column($categories,'unread'))];
}
function ca_card(array $row, bool $full = false, bool $facts = false): array
{
    $story=json_decode($row['content'], true, 512, JSON_THROW_ON_ERROR);
    $result=$full ? $story : array_intersect_key($story, array_flip(['id','category','headline','summary','importance','topics','key_takeaways']));
    if ($facts) $result += array_intersect_key($story, array_flip(['facts','statistics','quick_gk','sources','countries','people','reports','organisations','treaties']));
    return array_merge($result, ['publication_date'=>$row['publication_date'],'saved'=>(bool)($row['saved'] ?? false),
        'reading_status'=>$row['status'] ?? 'unread','reading_minutes'=>max(1,(int)ceil(str_word_count(ca_search_text($story))/220))]);
}
function ca_query_items(PDO $pdo, string $userId, string $where, array $params, int $limit = 21, int $offset = 0, string $order = 'i.publication_date DESC,i.id'): array
{
    $q=$pdo->prepare('SELECT i.*,u.saved,u.status FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date LEFT JOIN current_affairs_user_items u ON u.item_id=i.id AND u.user_id=? WHERE '.ca_visible().' '.$where.' ORDER BY '.$order.' LIMIT '.(int)$limit.' OFFSET '.(int)$offset);
    $q->execute(array_merge([$userId],$params)); return $q->fetchAll();
}
function ca_query_param(string $key, int $max = 200): string
{
    $value=$_GET[$key] ?? '';
    if (!is_string($value) || strlen($value)>$max) throw new InvalidArgumentException('Invalid '.$key.' filter.');
    return trim($value);
}
function ca_filters(): array
{
    $where=''; $params=[];
    foreach (['from'=>'>=','to'=>'<='] as $key=>$op) {
        $value=ca_query_param($key,10);
        if ($value!=='') { $where.=' AND i.publication_date'.$op.'?'; $params[]=ca_date($value); }
    }
    if (($category=ca_query_param('category',120))!=='') { $where.=' AND i.category=?'; $params[]=$category; }
    if (ca_query_param('saved',1)==='1') $where.=' AND u.saved=1';
    $status=ca_query_param('reading',10);
    if ($status!=='') {
        if (!in_array($status,['read','unread','opened'],true)) throw new InvalidArgumentException('Invalid reading filter.');
        $where.=" AND COALESCE(u.status,'unread')=?"; $params[]=$status;
    }
    $search=ca_query_param('q');
    if ($search!=='') {
        $words=preg_split('/\s+/u',$search,-1,PREG_SPLIT_NO_EMPTY);
        // Fulltext narrows long queries; LIKE ensures short acronyms and
        // punctuation work without depending on MySQL's stop-word settings.
        foreach (array_slice($words ?: [],0,12) as $word) {
            $where.=" AND i.search_text LIKE ? ESCAPE '!'";
            $params[]='%'.str_replace(['!','%','_'],['!!','!%','!_'],$word).'%';
        }
    }
    return [$where,$params];
}
function ca_problem(Throwable $error, ?PDO $pdo = null, bool $ingestion = false): never
{
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    $code=$error instanceof InvalidArgumentException ? 'invalid_dataset' : ($error instanceof DomainException ? 'story_id_conflict' : 'briefing_unavailable');
    if ($pdo && $ingestion) { try { ca_log_run($pdo,null,'failed',0,$code); } catch (Throwable) {} }
    error_log('CSSV current affairs: '.$code.' ['.get_class($error).']');
    if ($error instanceof InvalidArgumentException) cssv_fail($error->getMessage(),422,$code);
    if ($error instanceof DomainException) cssv_fail($error->getMessage(),409,$code);
    cssv_fail('The briefing service is temporarily unavailable. Please try again shortly.',503,$code);
}

function ca_request_json(): array
{
    $raw=file_get_contents('php://input', false, null, 0, 2097153);
    if (!is_string($raw) || strlen($raw)>2097152) throw new InvalidArgumentException('The dataset exceeds the 2 MiB request limit.');
    try { $body=json_decode($raw,true,64,JSON_THROW_ON_ERROR); }
    catch (JsonException) { throw new InvalidArgumentException('The request must contain valid JSON.'); }
    if (!is_array($body) || array_is_list($body)) throw new InvalidArgumentException('The request must be a JSON object.');
    return $body;
}
