<?php
declare(strict_types=1);
require_once __DIR__.'/_pro.php';
require_once __DIR__.'/_learning_core.php';
require_once __DIR__.'/_learning_schema.php';
function cssv_learning_ensure(PDO $pdo): void {
    static $ready=false; if ($ready) return; cssv_pro_ensure_schema($pdo);
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-learning-schema-v1',5)")->fetchColumn()!==1) throw new RuntimeException('learning_schema_busy');
    try { foreach(cssv_learning_schema_statements() as $sql) $pdo->exec($sql);$ready=true; } finally { $pdo->query("SELECT RELEASE_LOCK('cssvista-learning-schema-v1')"); }
}
function cssv_learning_owner_lock(PDO $pdo,string $userId,bool $requireEnabled=true): void {
    $q=$pdo->prepare('SELECT id FROM users WHERE id=?'.($requireEnabled?' AND disabled_at IS NULL':'').' FOR UPDATE');$q->execute([$userId]);
    if (!$q->fetchColumn()) throw new OutOfBoundsException('Account not found.');
}
function cssv_learning_attempt(PDO $pdo,string $id,string $userId): array {
    $q=$pdo->prepare('SELECT * FROM preparation_attempts WHERE id=? AND user_id=?');$q->execute([$id,$userId]);$a=$q->fetch();
    if (!$a) throw new OutOfBoundsException('Preparation attempt not found.');
    $a['optional_subject_ids']=json_decode($a['optional_subject_ids'],true,16,JSON_THROW_ON_ERROR);
    foreach(['version','target_year','daily_minutes'] as $k)$a[$k]=(int)$a[$k];
    foreach(['created_at','updated_at'] as $k)$a[$k]=cssv_pro_iso($a[$k]); return $a;
}
function cssv_learning_writing(PDO $pdo,string $id,string $userId): array {
    $q=$pdo->prepare('SELECT * FROM writing_records WHERE id=? AND user_id=?');$q->execute([$id,$userId]);$w=$q->fetch();
    if (!$w)throw new OutOfBoundsException('Writing record not found.');$w['version']=(int)$w['version'];
    foreach(['created_at','updated_at'] as $k)$w[$k]=cssv_pro_iso($w[$k]);
    $q=$pdo->prepare('SELECT id,version,word_count,created_at FROM writing_versions WHERE writing_id=? ORDER BY version DESC');$q->execute([$id]);$w['versions']=$q->fetchAll();
    foreach($w['versions'] as &$v){$v['version']=(int)$v['version'];$v['word_count']=(int)$v['word_count'];$v['created_at']=cssv_pro_iso($v['created_at']);}unset($v);return $w;
}
function cssv_learning_version(PDO $pdo,string $id,string $userId): array {
    $q=$pdo->prepare('SELECT v.*,w.user_id,w.kind,w.attempt_id FROM writing_versions v JOIN writing_records w ON w.id=v.writing_id WHERE v.id=? AND w.user_id=?');$q->execute([$id,$userId]);$v=$q->fetch();
    if (!$v)throw new OutOfBoundsException('Writing version not found.');$v['version']=(int)$v['version'];$v['word_count']=(int)$v['word_count'];$v['created_at']=cssv_pro_iso($v['created_at']);return $v;
}
function cssv_learning_mutation(PDO $pdo,string $userId,array $body): array {
    $action=$body['action'] ?? '';
    $attemptFields=['target_year','target_date','optional_subject_ids','daily_minutes','stage'];
    cssv_pro_fields($body,match($action){'attempt_save'=>array_merge(['action','request_id','id','expected_version'],$attemptFields),'writing_save'=>['action','request_id','id','expected_version','attempt_id','kind','title','text'],default=>throw new InvalidArgumentException('Unknown learning action.')});
    $request=cssv_pro_id($body['request_id'] ?? null);$existing=isset($body['id']) ? cssv_pro_id($body['id']) : null;
    $expected=$body['expected_version'] ?? null;if (!is_int($expected) || $expected<0 || $expected>100000)throw new InvalidArgumentException('Refresh the saved version before trying again.');
    $input=$action==='attempt_save' ? cssv_learning_attempt_input($body) : ['attempt_id'=>cssv_pro_id($body['attempt_id'] ?? null),'kind'=>$body['kind'] ?? null,'title'=>cssv_learning_string($body['title'] ?? null,180,'title'),'text'=>cssv_learning_string($body['text'] ?? null,20000,'writing')];
    if ($action==='writing_save' && !in_array($input['kind'],['sentence','paragraph','precis'],true))throw new InvalidArgumentException('Choose sentence, paragraph or précis writing.');
    if($action==='writing_save' && $input['kind']==='precis')cssv_pro_require_active($pdo,$userId);
    $hash=hash('sha256',json_encode([$action,$existing,$expected,$input],JSON_THROW_ON_ERROR));
    $pdo->beginTransaction();
    try {
        cssv_learning_owner_lock($pdo,$userId);
        $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$userId,$request]);
        if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This save request was already used with different work.');$pdo->commit();return json_decode($prior['result'],true,16,JSON_THROW_ON_ERROR);}
        $id=$existing ?? cssv_uuid_v4();
        if($action==='attempt_save') {
            if($existing){$current=cssv_learning_attempt($pdo,$id,$userId);if($current['version']!==$expected)throw new DomainException('This attempt was updated elsewhere. Reload it before saving.');}
            elseif($expected!==0)throw new InvalidArgumentException('New attempts start at version zero.');
            $values=[$input['target_year'],$input['target_date'],json_encode($input['optional_subject_ids']),$input['daily_minutes'],$input['stage']];
            if($existing)$pdo->prepare('UPDATE preparation_attempts SET target_year=?,target_date=?,optional_subject_ids=?,daily_minutes=?,stage=?,version=version+1 WHERE id=? AND user_id=?')->execute([...$values,$id,$userId]);
            else $pdo->prepare('INSERT INTO preparation_attempts(target_year,target_date,optional_subject_ids,daily_minutes,stage,id,user_id) VALUES(?,?,?,?,?,?,?)')->execute([...$values,$id,$userId]);
            $result=['attempt_id'=>$id,'version'=>$expected+1];
        } else {
            cssv_learning_attempt($pdo,$input['attempt_id'],$userId);
            if($existing){$current=cssv_learning_writing($pdo,$id,$userId);if($current['version']!==$expected)throw new DomainException('This writing was updated elsewhere. Reload its saved version before saving.');if($current['attempt_id']!==$input['attempt_id'] || $current['kind']!==$input['kind'])throw new DomainException('Saved writing stays linked to its original attempt and type.');}
            elseif($expected!==0)throw new InvalidArgumentException('New writing starts at version zero.');
            $version=$expected+1;$versionId=cssv_uuid_v4();
            if($existing)$pdo->prepare('UPDATE writing_records SET title=?,version=? WHERE id=? AND user_id=?')->execute([$input['title'],$version,$id,$userId]);
            else $pdo->prepare('INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,?,?,?)')->execute([$id,$userId,$input['attempt_id'],$input['kind'],$input['title'],$version]);
            $pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,?,?,?,?)')->execute([$versionId,$id,$version,$input['text'],hash('sha256',$input['text']),cssv_learning_words($input['text'])]);
            $result=['writing_id'=>$id,'version_id'=>$versionId,'version'=>$version];
        }
        $pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$userId,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);
        $pdo->commit();return $result;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
