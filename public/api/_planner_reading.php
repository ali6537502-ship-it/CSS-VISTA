<?php
declare(strict_types=1);
function cssv_reading_schema_statements(): array {return [
"CREATE TABLE IF NOT EXISTS attempt_reading_records (
 attempt_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, kind VARCHAR(32) NOT NULL, source_id VARCHAR(128) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, saved TINYINT(1) NOT NULL DEFAULT 0,
 read_date DATE NULL, read_hash CHAR(64) NULL, last_review DATE NULL, next_revision DATE NULL, review_count INT UNSIGNED NOT NULL DEFAULT 0, review_stage SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 source_hash CHAR(64) NOT NULL, snapshot JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(attempt_id,kind,source_id), KEY reading_owner_due(user_id,attempt_id,next_revision),
 CONSTRAINT reading_attempt_fk FOREIGN KEY(attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT reading_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT reading_kind_chk CHECK(kind IN ('current_affairs','vistagram'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];}

// Published editorial content remains available under the existing free-access commitment.
// This layer stores owned, dated study declarations; it does not certify factual accuracy.
function cssv_reading_kind(mixed $kind): string {
    if (!in_array($kind, ['current_affairs', 'vistagram'], true)) throw new InvalidArgumentException('Choose Current Affairs or Vistagram.');
    return $kind;
}
function cssv_reading_sources(array $sources): array {
    $out=[];
    foreach ($sources as $s) {
        if (!is_array($s)) continue;
        try { $url=ca_url($s['url']??null); } catch (InvalidArgumentException) { continue; }
        $label=$s['publisher']??$s['label']??'';
        if (!is_string($label)||trim($label)==='') continue;
        $out[]=['label'=>mb_substr($label,0,300),'url'=>$url,'date'=>$s['published_at']??$s['date']??null];
    }
    return array_slice($out,0,20);
}
function cssv_reading_vistagram(): array {
    static $posts=null; if ($posts!==null) return $posts;
    $posts=[]; $root=dirname(__DIR__).'/vistagram-content';
    if (!is_file($root.'/index.json')) return $posts;
    $index=json_decode((string)file_get_contents($root.'/index.json'),true,64,JSON_THROW_ON_ERROR);
    foreach ($index['posts']??[] as $summary) {
        $slug=$summary['slug']??'';
        if (!is_string($slug)||!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D',$slug)) continue;
        $path=$root.'/posts/'.$slug.'.json'; if (!is_file($path)) continue;
        $post=json_decode((string)file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
        if (($post['id']??null)!==($summary['id']??null)||($post['slug']??null)!==$slug) continue;
        $time=strtotime($post['publishedAt']??''); if ($time===false||$time>time()) continue;
        $sources=cssv_reading_sources($post['sources']??[]); if (!$sources) continue;
        $id=$post['id']; if (!is_string($id)||!preg_match('/^[A-Za-z0-9_-]{1,128}$/D',$id)) continue;
        $posts[$id]=['kind'=>'vistagram','source_id'=>$id,'title'=>$post['title'],'date'=>cssv_planner_day(new DateTimeImmutable('@'.$time)),
            'category'=>$post['category'],'topic'=>$post['topic'],'summary'=>$post['excerpt'],'to'=>'/vistagram/'.$slug,
            'sources'=>$sources,'source_hash'=>cssv_planner_hash($post)];
    }
    uasort($posts,fn($a,$b)=>strcmp($b['date'],$a['date'])?:strcmp($a['source_id'],$b['source_id']));
    return $posts;
}
function cssv_reading_ca(array $row): array {
    $story=json_decode($row['content'],true,64,JSON_THROW_ON_ERROR); $sources=cssv_reading_sources($story['sources']??[]);
    if (!$sources) throw new OutOfBoundsException('This development has no usable source attribution.');
    return ['kind'=>'current_affairs','source_id'=>$row['id'],'title'=>$row['headline'],'date'=>$row['publication_date'],
        'category'=>$row['category'],'topic'=>implode(', ',array_slice($story['topics']??[],0,5)),'summary'=>$story['summary']??'',
        'to'=>'/account/current-affairs/'.rawurlencode($row['id']),'sources'=>$sources,
        'source_hash'=>cssv_planner_hash(['id'=>$row['id'],'date'=>$row['publication_date'],'content'=>$story])];
}
function cssv_reading_source(PDO $pdo,string $kind,string $id): array {
    cssv_reading_kind($kind);
    if ($kind==='vistagram') return cssv_reading_vistagram()[$id]??throw new OutOfBoundsException('This published article is unavailable.');
    $q=$pdo->prepare('SELECT i.* FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date WHERE i.id=? AND '.ca_visible().' AND i.publication_date<=?');
    $q->execute([$id,cssv_planner_day()]); $r=$q->fetch(); if (!$r) throw new OutOfBoundsException('This published development is unavailable.');
    return cssv_reading_ca($r);
}
function cssv_reading_normalize(array $r): array {
    foreach(['version','review_count','review_stage'] as $k)$r[$k]=(int)$r[$k];$r['saved']=(bool)$r['saved'];
    $r['snapshot']=json_decode($r['snapshot'],true,32,JSON_THROW_ON_ERROR);return $r;
}
function cssv_reading_records(PDO $pdo,string $user,string $attempt,string $kind,array $ids): array {
    if(!$ids)return [];$marks=implode(',',array_fill(0,count($ids),'?'));
    $q=$pdo->prepare('SELECT * FROM attempt_reading_records WHERE user_id=? AND attempt_id=? AND kind=? AND source_id IN ('.$marks.')');$q->execute([$user,$attempt,$kind,...$ids]);$out=[];
    foreach($q->fetchAll() as $row){$r=cssv_reading_normalize($row);$out[$r['kind'].':'.$r['source_id']]=$r;}return $out;
}
function cssv_reading_card(array $source,?array $r,bool $available=true): array {
    return [...$source,'available'=>$available,'version'=>$r['version']??0,'saved'=>$r['saved']??false,
        'read_date'=>$r['read_date']??null,'last_review'=>$r['last_review']??null,'next_revision'=>$r['next_revision']??null,'review_count'=>$r['review_count']??0,
        'source_changed'=>$r!==null&&(!hash_equals($r['source_hash'],$source['source_hash'])||($r['read_hash']!==null&&!hash_equals($r['read_hash'],$source['source_hash'])))];
}
function cssv_reading_view(PDO $pdo,string $user,string $attempt,array $query): array {
    $kind=cssv_reading_kind($query['kind']??'current_affairs');$today=cssv_planner_day();
    if(isset($query['source_id'])){$id=cssv_learning_string($query['source_id'],128,'source');$source=cssv_reading_source($pdo,$kind,$id);$records=cssv_reading_records($pdo,$user,$attempt,$kind,[$id]);return ['items'=>[cssv_reading_card($source,$records[$kind.':'.$id]??null)],'has_more'=>false,'today'=>$today];}
    $filter=$query['filter']??'all';if(!in_array($filter,['all','saved','read','revision'],true))throw new InvalidArgumentException('Choose a reading filter.');
    $range=$query['range']??'all';if(!in_array($range,['all','7','30'],true))throw new InvalidArgumentException('Choose a date range.');
    $offset=filter_var($query['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Choose a valid reading page.');
    $from=$range==='all'?'0001-01-01':cssv_planner_add_days($today,1-(int)$range);$items=[];
    if($filter!=='all'){
        $where=match($filter){'saved'=>'saved=1','read'=>'read_date IS NOT NULL','revision'=>'next_revision<=?'};
        $q=$pdo->prepare("SELECT * FROM attempt_reading_records WHERE user_id=? AND attempt_id=? AND kind=? AND ".$where." AND JSON_UNQUOTE(JSON_EXTRACT(snapshot,'$.date'))>=? ORDER BY JSON_UNQUOTE(JSON_EXTRACT(snapshot,'$.date')) DESC,source_id LIMIT 21 OFFSET ".$offset);
        $q->execute([$user,$attempt,$kind,...($filter==='revision'?[$today]:[]),$from]);$rows=$q->fetchAll();$more=count($rows)>20;
        foreach(array_slice($rows,0,20) as $row){$r=cssv_reading_normalize($row);
            try{$source=cssv_reading_source($pdo,$kind,$r['source_id']);$available=true;}catch(OutOfBoundsException){$source=$r['snapshot'];$available=false;}
            $items[]=cssv_reading_card($source,$r,$available);
        }
    }else{
        $sources=[];
        if($kind==='vistagram'){
            $sources=array_values(array_filter(cssv_reading_vistagram(),fn($s)=>$s['date']>=$from));$more=count($sources)>$offset+20;$sources=array_slice($sources,$offset,20);
        }else{
            $q=$pdo->prepare('SELECT i.* FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date WHERE '.ca_visible().' AND i.publication_date BETWEEN ? AND ? ORDER BY i.publication_date DESC,i.id LIMIT 21 OFFSET '.$offset);$q->execute([$from,$today]);$rows=$q->fetchAll();$more=count($rows)>20;
            foreach(array_slice($rows,0,20) as $row){try{$sources[]=cssv_reading_ca($row);}catch(OutOfBoundsException){}}
        }
        $records=cssv_reading_records($pdo,$user,$attempt,$kind,array_column($sources,'source_id'));
        foreach($sources as $source)$items[]=cssv_reading_card($source,$records[$kind.':'.$source['source_id']]??null);
    }
    return ['items'=>$items,'has_more'=>$more,'today'=>$today,'from'=>$range==='all'?null:$from];
}
function cssv_reading_save(PDO $pdo,string $user,string $attempt,array $body,string $today): array {
    $kind=cssv_reading_kind($body['kind']??null);$id=cssv_learning_string($body['source_id']??null,128,'published source');$source=cssv_reading_source($pdo,$kind,$id);
    if(!is_string($body['source_hash']??null)||!hash_equals($source['source_hash'],$body['source_hash']))throw new DomainException('The source changed. Read the updated material before saving.');
    $r=cssv_reading_records($pdo,$user,$attempt,$kind,[$id])[$kind.':'.$id]??null;$version=$r['version']??0;
    if(!is_int($body['expected_version']??null)||$body['expected_version']!==$version)throw new DomainException('This reading record changed elsewhere. Reload before saving.');
    $operation=$body['operation']??null;if(!in_array($operation,['save','unsave','read','review'],true))throw new InvalidArgumentException('Choose a reading action.');
    if($operation!=='review'&&isset($body['outcome']))throw new InvalidArgumentException('Recall outcomes belong to a due revision.');
    $saved=$r['saved']??false;$read=$r['read_date']??null;$readHash=$r['read_hash']??null;$last=$r['last_review']??null;$due=$r['next_revision']??null;$reviews=$r['review_count']??0;$stage=$r['review_stage']??0;
    if($operation==='save')$saved=true;elseif($operation==='unsave')$saved=false;
    elseif($operation==='read'){
        if($readHash!==null&&hash_equals($readHash,$source['source_hash']))throw new DomainException('This version is already marked read. Use its due revision instead.');
        if($read===null){$q=$pdo->prepare('SELECT snapshot FROM attempt_evidence_links WHERE user_id=? AND attempt_id=? AND evidence_key=?');$q->execute([$user,$attempt,$kind.':'.$id]);$prior=$q->fetchColumn();if($prior){$earlier=json_decode($prior,true,32,JSON_THROW_ON_ERROR)['date']??null;try{$earlier=cssv_planner_date($earlier);if($earlier<=$today)$read=$earlier;}catch(InvalidArgumentException){/* An unknown original date stays unknown until this explicit declaration. */}}}
        $read??=$today;$readHash=$source['source_hash'];$last=$today;$due=cssv_planner_add_days($today,1);$stage=0;
        $snapshot=[...$source,'edition_date'=>$source['date'],'date'=>$today,'basis'=>'Self-reported reading of a published source. Reading is not comprehension or independent fact verification.'];
        $pdo->prepare('INSERT IGNORE INTO attempt_evidence_links(attempt_id,user_id,evidence_key,kind,unit_id,source_id,snapshot) VALUES(?,?,?,?,NULL,?,?)')->execute([$attempt,$user,$kind.':'.$id,$kind,$id,json_encode($snapshot,JSON_THROW_ON_ERROR)]);
    }else{
        if(!$read||!$due||$due>$today||$readHash===null||!hash_equals($readHash,$source['source_hash']))throw new DomainException('Review requires a due, previously read version. Read updated material first.');
        $review=cssv_planner_revision($today,$stage,$body['outcome']??null);$due=$review['next_revision'];$stage=$review['review_count'];$reviews++;$last=$today;
    }
    $pdo->prepare('INSERT INTO attempt_reading_records(attempt_id,user_id,kind,source_id,version,saved,read_date,read_hash,last_review,next_revision,review_count,review_stage,source_hash,snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),saved=VALUES(saved),read_date=VALUES(read_date),read_hash=VALUES(read_hash),last_review=VALUES(last_review),next_revision=VALUES(next_revision),review_count=VALUES(review_count),review_stage=VALUES(review_stage),source_hash=VALUES(source_hash),snapshot=VALUES(snapshot)')->execute([$attempt,$user,$kind,$id,$version+1,(int)$saved,$read,$readHash,$last,$due,$reviews,$stage,$source['source_hash'],json_encode($source,JSON_THROW_ON_ERROR)]);
    cssv_planner_event($pdo,$user,$attempt,'reading_save',['kind'=>$kind,'source_id'=>$id,'operation'=>$operation,'outcome'=>$body['outcome']??null,'source_hash'=>$source['source_hash'],'date'=>$today,'edition_date'=>$source['date'],'next_revision'=>$due]);
    return ['version'=>$version+1,'source_id'=>$id,'kind'=>$kind];
}

function cssv_reading_summary(PDO $pdo,string $user,string $attempt,string $today): array {
    $q=$pdo->prepare('SELECT SUM(saved=1) bookmarks,SUM(read_date IS NOT NULL) read_sources,SUM(next_revision<=?) due,COALESCE(SUM(review_count),0) reviews FROM attempt_reading_records WHERE user_id=? AND attempt_id=? AND (saved=1 OR read_date IS NOT NULL)');$q->execute([$today,$user,$attempt]);$s=$q->fetch();foreach($s as &$v)$v=(int)$v;unset($v);
    $q=$pdo->prepare('SELECT kind,source_id,next_revision,version FROM attempt_reading_records WHERE user_id=? AND attempt_id=? AND next_revision<=? ORDER BY next_revision,kind,source_id LIMIT 25');$q->execute([$user,$attempt,$today]);$due=[];$rows=$q->fetchAll();$records=[];foreach(['current_affairs','vistagram'] as $kind){$ids=array_column(array_filter($rows,fn($r)=>$r['kind']===$kind),'source_id');$records=[...$records,...cssv_reading_records($pdo,$user,$attempt,$kind,$ids)];}
    foreach($rows as $r){try{$source=cssv_reading_source($pdo,$r['kind'],$r['source_id']);}catch(OutOfBoundsException){continue;}$card=cssv_reading_card($source,$records[$r['kind'].':'.$r['source_id']]??null);if($card['source_changed'])continue;$due[]=[...$source,'next_revision'=>$r['next_revision'],'version'=>(int)$r['version']];if(count($due)===3)break;}
    return ['stats'=>$s,'due'=>$due];
}
