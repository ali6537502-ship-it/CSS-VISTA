<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';
require_once __DIR__.'/_grammar_core.php';
require_once __DIR__.'/_grammar_schema.php';
function cssv_grammar_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
 if((int)$pdo->query("SELECT GET_LOCK('cssvista-grammar-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('grammar_schema_busy');
 try{foreach(cssv_grammar_schema_statements() as $sql)$pdo->exec($sql);$ready=true;}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-grammar-schema-v1')");}
}
function cssv_grammar_record(PDO $pdo,string $user,string $attempt): ?array {
 $q=$pdo->prepare('SELECT * FROM grammar_progress WHERE attempt_id=? AND user_id=?');$q->execute([$attempt,$user]);$row=$q->fetch();
 if(!$row)return null;foreach(['state','evidence'] as $key)$row[$key]=json_decode($row[$key],true,64,JSON_THROW_ON_ERROR);$row['version']=(int)$row['version'];$row['imported_browser']=(bool)$row['imported_browser'];return $row;
}
function cssv_grammar_writing(PDO $pdo,string $user,string $attempt): array {
 $q=$pdo->prepare("SELECT JSON_EXTRACT(o.result,'$.findings[*].code') AS finding_codes,o.created_at,v.text_hash,v.writing_id,w.kind FROM ai_operations o JOIN writing_versions v ON v.id=o.version_id JOIN writing_records w ON w.id=v.writing_id WHERE o.user_id=? AND w.user_id=? AND w.attempt_id=? AND o.state='succeeded' AND o.feature IN ('paragraph','sentence','handwriting','precis') AND o.created_at>=DATE_SUB(NOW(6),INTERVAL 30 DAY) ORDER BY o.created_at DESC,o.id DESC LIMIT 200");$q->execute([$user,$user,$attempt]);$rows=$q->fetchAll();
 foreach($rows as &$row){$codes=json_decode($row['finding_codes'] ?: '[]',true,32,JSON_THROW_ON_ERROR);$row['result']=['findings'=>array_map(fn($code)=>['code'=>$code],$codes)];unset($row['finding_codes']);$row['created_at']=cssv_pro_iso($row['created_at']);}unset($row);return cssv_expression_profile($rows);
}
function cssv_grammar_read(PDO $pdo,string $user,string $attempt): array {
 $a=cssv_learning_attempt($pdo,$attempt,$user);$r=cssv_grammar_record($pdo,$user,$attempt);
 return ['attempt'=>$a,'version'=>$r['version'] ?? 0,'state'=>$r['state'] ?? null,'imported_browser'=>$r['imported_browser'] ?? false,'updated_at'=>$r?cssv_pro_iso($r['updated_at']):null,'profile'=>cssv_grammar_profile($r['state'] ?? [],$r['evidence'] ?? [],cssv_grammar_writing($pdo,$user,$attempt),(int)round(microtime(true)*1000))];
}
function cssv_grammar_save(PDO $pdo,string $user,array $body): array {
 cssv_pro_fields($body,['request_id','attempt_id','expected_version','state','import_browser']);
 $request=cssv_pro_id($body['request_id'] ?? null);$attempt=cssv_pro_id($body['attempt_id'] ?? null);$expected=cssv_grammar_integer($body['expected_version'] ?? null,0,1000000);
 if(!is_bool($body['import_browser'] ?? false))throw new InvalidArgumentException('Invalid import choice.');$import=$body['import_browser'] ?? false;
 $state=cssv_grammar_state(cssv_grammar_map($body['state'] ?? null));$hash=hash('sha256',cssv_grammar_canonical(['grammar_save',$attempt,$expected,$import,$state]));
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);cssv_learning_attempt($pdo,$attempt,$user);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
  if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This save identity was already used for different work.');$pdo->commit();return json_decode($prior['result'],true,16,JSON_THROW_ON_ERROR);}
  $old=cssv_grammar_record($pdo,$user,$attempt);if(($old['version'] ?? 0)!==$expected)throw new DomainException('Grammar work was saved elsewhere. Keep your browser copy and reload the account copy before continuing sync.');
  if($import && $old)throw new DomainException('Browser import is available only for an empty attempt.');
  if($old)$state=cssv_grammar_history($old['state'],$state);$evidence=cssv_grammar_evidence($old['evidence'] ?? [],$state);$version=$expected+1;
  $pdo->prepare('INSERT INTO grammar_progress(attempt_id,user_id,version,state,evidence,imported_browser) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),state=VALUES(state),evidence=VALUES(evidence)')->execute([$attempt,$user,$version,json_encode($state,JSON_THROW_ON_ERROR),json_encode($evidence,JSON_THROW_ON_ERROR),$import?1:0]);
  $result=['attempt_id'=>$attempt,'version'=>$version];$pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();return $result;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
