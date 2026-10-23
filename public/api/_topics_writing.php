<?php
declare(strict_types=1);
function cssv_topic_writing_schema(): array {
    return [trim(<<<'SQL'
CREATE TABLE IF NOT EXISTS topic_writing_bindings (
 writing_id CHAR(36) NOT NULL PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 attempt_id CHAR(36) NOT NULL,
 topic_version_id CHAR(36) NOT NULL,
 slot VARCHAR(8) NOT NULL,
 baseline_version_id CHAR(36) NOT NULL,
 UNIQUE KEY topic_writing_slot (user_id,attempt_id,topic_version_id,slot),
 CONSTRAINT topic_writing_record_fk FOREIGN KEY (writing_id) REFERENCES writing_records(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_owner_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_edition_fk FOREIGN KEY (topic_version_id) REFERENCES pro_topic_versions(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_baseline_fk FOREIGN KEY (baseline_version_id) REFERENCES writing_versions(id) ON DELETE RESTRICT,
 CONSTRAINT topic_writing_slot_chk CHECK (slot IN ('draft','notes'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL)];
}
/** Called inside the existing account lock / receipt transaction. Never invent pre-baseline edits. */
function cssv_topic_writing_append(PDO $pdo,string $user,string $attempt,string $edition,string $slot,string $before,string $after,string $title): void {
    $q=$pdo->prepare('SELECT b.writing_id,w.version FROM topic_writing_bindings b JOIN writing_records w ON w.id=b.writing_id AND w.user_id=b.user_id AND w.attempt_id=b.attempt_id WHERE b.user_id=? AND b.attempt_id=? AND b.topic_version_id=? AND b.slot=? FOR UPDATE');$q->execute([$user,$attempt,$edition,$slot]);$binding=$q->fetch();
    if(!$binding){
        $writing=cssv_uuid_v4();$baseline=cssv_uuid_v4();
        $pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,'paragraph',?,1)")->execute([$writing,$user,$attempt,mb_substr($title.' — '.$slot,0,180)]);
        $pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,1,?,?,?)')->execute([$baseline,$writing,$before,hash('sha256',$before),cssv_learning_words($before)]);
        $pdo->prepare('INSERT INTO topic_writing_bindings(writing_id,user_id,attempt_id,topic_version_id,slot,baseline_version_id) VALUES(?,?,?,?,?,?)')->execute([$writing,$user,$attempt,$edition,$slot,$baseline]);
        $binding=['writing_id'=>$writing,'version'=>1];
    }
    if($before===$after)return;
    $next=(int)$binding['version']+1;
    $pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$binding['writing_id'],$next,$after,hash('sha256',$after),cssv_learning_words($after)]);
    $pdo->prepare('UPDATE writing_records SET version=? WHERE id=? AND user_id=?')->execute([$next,$binding['writing_id'],$user]);
}
function cssv_topic_writing_history(PDO $pdo,string $user,string $attempt,string $edition,int $offset=0): array {
    cssv_learning_attempt($pdo,$attempt,$user);
    $q=$pdo->prepare('SELECT b.slot,b.topic_version_id,b.writing_id,v.id,v.version,v.text,v.text_hash,v.created_at,(v.id=b.baseline_version_id) imported_baseline FROM topic_writing_bindings b JOIN writing_records w ON w.id=b.writing_id AND w.user_id=b.user_id AND w.attempt_id=b.attempt_id JOIN writing_versions v ON v.writing_id=w.id WHERE b.user_id=? AND b.attempt_id=? AND b.topic_version_id=? ORDER BY v.created_at DESC,b.slot,v.version DESC LIMIT 21 OFFSET '.$offset);$q->execute([$user,$attempt,$edition]);$rows=$q->fetchAll();$more=count($rows)>20;foreach($rows as &$r){$r['version']=(int)$r['version'];$r['imported_baseline']=(bool)$r['imported_baseline'];}unset($r);
    return ['versions'=>array_slice($rows,0,20),'has_more'=>$more];
}
