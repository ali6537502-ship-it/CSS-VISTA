<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';
require_once __DIR__.'/_grammar_v5_core.php';
function cssv_gv5_schema(): array {
 return ['CREATE TABLE IF NOT EXISTS grammar_learning_v5 (
 attempt_id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, state JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY grammar_v5_owner (user_id,updated_at),
 CONSTRAINT grammar_v5_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT grammar_v5_attempt_fk FOREIGN KEY (attempt_id) REFERENCES preparation_attempts(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'];
}
function cssv_gv5_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
 if((int)$pdo->query("SELECT GET_LOCK('cssvista-grammar-v5-schema',5)")->fetchColumn()!==1)throw new RuntimeException('grammar_v5_schema_busy');
 try{foreach(cssv_gv5_schema() as $sql)$pdo->exec($sql);$ready=true;}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-grammar-v5-schema')");}
}
function cssv_gv5_record(PDO $pdo,string $user,string $attempt): ?array {
 $q=$pdo->prepare('SELECT version,state FROM grammar_learning_v5 WHERE user_id=? AND attempt_id=?');$q->execute([$user,$attempt]);$r=$q->fetch();
 return $r?['version'=>(int)$r['version'],'state'=>json_decode($r['state'],true,64,JSON_THROW_ON_ERROR)]:null;
}
function cssv_gv5_read(PDO $pdo,string $user,string $attempt): array {
 cssv_learning_attempt($pdo,$attempt,$user);return cssv_gv5_record($pdo,$user,$attempt) ?? ['version'=>0,'state'=>null];
}
function cssv_gv5_save(PDO $pdo,string $user,array $body): array {
 cssv_pro_fields($body,['request_id','attempt_id','expected_version','state']);
 $request=cssv_pro_id($body['request_id'] ?? null);$attempt=cssv_pro_id($body['attempt_id'] ?? null);$expected=cssv_grammar_integer($body['expected_version'] ?? null,0,1000000);
 $state=cssv_gv5_state(cssv_grammar_map($body['state'] ?? null));
 $hash=hash('sha256',cssv_grammar_canonical(['grammar_v5_save',$attempt,$expected,$state]));
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);cssv_learning_attempt($pdo,$attempt,$user);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
  if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This save identity was used for different work.');$pdo->commit();return json_decode($prior['result'],true,16,JSON_THROW_ON_ERROR);}
  $old=cssv_gv5_record($pdo,$user,$attempt);if(($old['version'] ?? 0)!==$expected)throw new DomainException('This work changed on another device. Keep your browser copy and load the account copy to continue.');
  if($old)$state=cssv_gv5_preserve($old['state'],$state);$version=$expected+1;
  $pdo->prepare('INSERT INTO grammar_learning_v5(attempt_id,user_id,version,state) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),state=VALUES(state)')->execute([$attempt,$user,$version,json_encode($state,JSON_THROW_ON_ERROR)]);
  $result=['attempt_id'=>$attempt,'version'=>$version,'state'=>$state];$pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);
  $pdo->commit();return $result;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
