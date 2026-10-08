<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';
require_once __DIR__.'/_precis_core.php';
require_once __DIR__.'/_precis_questions.php';
require_once __DIR__.'/_precis_schema.php';
function cssv_precis_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
 if((int)$pdo->query("SELECT GET_LOCK('cssvista-precis-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('precis_schema_busy');
 try{foreach(cssv_precis_schema_statements() as $sql)$pdo->exec($sql);$ready=true;}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-precis-schema-v1')");}
}
function cssv_precis_owned(PDO $pdo,string $user,string $writing): array {
 $w=cssv_learning_writing($pdo,$writing,$user);$q=$pdo->prepare('SELECT source,revealed_model FROM precis_sources WHERE writing_id=? AND user_id=?');$q->execute([$writing,$user]);$row=$q->fetch();
 if($w['kind']!=='precis'||!$row)throw new OutOfBoundsException('Précis Lab writing not found.');return ['writing'=>$w,'source'=>json_decode($row['source'],true,32,JSON_THROW_ON_ERROR),'model'=>$row['revealed_model']?json_decode($row['revealed_model'],true,32,JSON_THROW_ON_ERROR):null];
}
function cssv_precis_detail(PDO $pdo,string $user,string $writing,?string $version): array {
 $owned=cssv_precis_owned($pdo,$user,$writing);$w=$owned['writing'];$v=cssv_learning_version($pdo,$version ?? $w['versions'][0]['id'],$user);
 if($v['writing_id']!==$writing)throw new OutOfBoundsException('Choose a version of this précis.');
 $q=$pdo->prepare('SELECT context FROM precis_version_context WHERE version_id=?');$q->execute([$v['id']]);$context=$q->fetchColumn();
 return [...$owned,'version'=>$v,'context'=>$context?json_decode($context,true,32,JSON_THROW_ON_ERROR):null];
}
function cssv_precis_progress(PDO $pdo,string $user,string $attempt): array {
 cssv_learning_attempt($pdo,$attempt,$user);$q=$pdo->prepare('SELECT version,current_day,current_chapter,completed FROM precis_progress WHERE attempt_id=? AND user_id=?');$q->execute([$attempt,$user]);$row=$q->fetch();
 // Server-authored answers determine the most recent error; retries never
 // erase its three-day review interval. Only first/last rows leave the DB.
 $cases='CASE question_id';foreach(cssv_precis_questions() as $id=>$question)$cases.=' WHEN '.$pdo->quote($id).' THEN '.(int)$question['answer'];$cases.=' ELSE -1 END';
 $q=$pdo->prepare('SELECT question_id,choice,created_at,last_wrong_at FROM (SELECT question_id,choice,created_at,MAX(CASE WHEN choice<>'.$cases.' THEN created_at END) OVER(PARTITION BY question_id) AS last_wrong_at,ROW_NUMBER() OVER(PARTITION BY question_id ORDER BY created_at,id) AS first_row,ROW_NUMBER() OVER(PARTITION BY question_id ORDER BY created_at DESC,id DESC) AS last_row FROM precis_responses WHERE user_id=? AND attempt_id=?) sampled WHERE first_row=1 OR last_row=1 ORDER BY created_at');$q->execute([$user,$attempt]);$rows=$q->fetchAll();
 return ['version'=>(int)($row['version'] ?? 0),'current_day'=>(int)($row['current_day'] ?? 1),'current_chapter'=>(int)($row['current_chapter'] ?? 1),'completed'=>$row?json_decode($row['completed'],true,16,JSON_THROW_ON_ERROR):[],'profile'=>cssv_precis_profile($rows)];
}
function cssv_precis_mutation(PDO $pdo,string $user,array $body): array {
 $action=$body['action'] ?? '';cssv_pro_fields($body,match($action){
  'writing_save'=>['action','request_id','id','expected_version','attempt_id','passage_id','original','source_label','word_limit','title','text','scratch','self_check','timer'],
  'progress_save'=>['action','request_id','attempt_id','expected_version','current_day','current_chapter','completed'],
  'drill_answer'=>['action','request_id','attempt_id','question_id','choice'],
  'reveal_model'=>['action','request_id','writing_id'],
  default=>throw new InvalidArgumentException('Unknown Précis action.')});
 $request=cssv_pro_id($body['request_id'] ?? null);$payload=$body;unset($payload['request_id']);$hash=hash('sha256',json_encode(['precis-v1',$payload],JSON_THROW_ON_ERROR));
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
  if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This request identity was already used for different work.');$pdo->commit();return json_decode($prior['result'],true,32,JSON_THROW_ON_ERROR);}
  cssv_pro_require_active($pdo,$user);
  if($action==='writing_save'){
   $attempt=cssv_pro_id($body['attempt_id'] ?? null);cssv_learning_attempt($pdo,$attempt,$user);$id=isset($body['id'])?cssv_pro_id($body['id']):null;$expected=$body['expected_version'] ?? null;
   if(!is_int($expected)||$expected<0||$expected>100000)throw new InvalidArgumentException('Refresh the current writing version.');
   $context=cssv_precis_context($body);$text=cssv_learning_string($body['text'] ?? null,20000,'your précis');
   if($id){$owned=cssv_precis_owned($pdo,$user,$id);$w=$owned['writing'];if($w['attempt_id']!==$attempt||$w['version']!==$expected)throw new DomainException('This précis was updated elsewhere or belongs to another attempt. Keep your draft and review its latest saved version.');
    foreach(['passage_id','original','source_label','word_limit'] as $key)if(array_key_exists($key,$body))throw new InvalidArgumentException('A rewrite keeps its original passage and length instruction.');
    $pdo->prepare('UPDATE writing_records SET title=?,version=version+1 WHERE id=? AND user_id=?')->execute([$context['title'],$id,$user]);
   }else{if($expected!==0)throw new InvalidArgumentException('New writing starts at version zero.');$source=cssv_precis_source($body);$id=cssv_uuid_v4();
    $pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,'precis',?,1)")->execute([$id,$user,$attempt,$context['title']]);
    $pdo->prepare('INSERT INTO precis_sources(writing_id,user_id,source) VALUES(?,?,?)')->execute([$id,$user,json_encode($source,JSON_THROW_ON_ERROR)]);
   }
   $version=cssv_uuid_v4();$pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,?,?,?,?)')->execute([$version,$id,$expected+1,$text,hash('sha256',$text),cssv_learning_words($text)]);
   $pdo->prepare('INSERT INTO precis_version_context(version_id,context) VALUES(?,?)')->execute([$version,json_encode($context,JSON_THROW_ON_ERROR)]);$result=['writing_id'=>$id,'version_id'=>$version,'version'=>$expected+1];
  }elseif($action==='reveal_model'){
   $owned=cssv_precis_owned($pdo,$user,cssv_pro_id($body['writing_id'] ?? null));$q=$pdo->prepare("SELECT COUNT(DISTINCT v.text_hash) FROM writing_versions v JOIN precis_version_context c ON c.version_id=v.id WHERE v.writing_id=? AND CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(c.context,'$.scratch.central_idea')))>=10");$q->execute([$owned['writing']['id']]);
   if((int)$q->fetchColumn()<2)throw new DomainException('Identify the central idea and save two different drafts before comparing with a model.');
   $model=$owned['model'];foreach(cssv_precis_handbook()['passages'] as $p)if(!$model&&$p['id']===$owned['source']['id']&&$p['text']===$owned['source']['text'])$model=['text'=>$p['model'],'title'=>$p['model_title'],'note'=>'Handbook teaching example, not an official answer. Check its qualifications against the original; more than one faithful answer is possible.'];
   if(!$model)throw new InvalidArgumentException('No handbook model matches this saved original passage.');if(!$owned['model'])$pdo->prepare('UPDATE precis_sources SET revealed_model=? WHERE writing_id=? AND user_id=?')->execute([json_encode($model,JSON_THROW_ON_ERROR),$owned['writing']['id'],$user]);$result=['model'=>$model];
  }else{
   $attempt=cssv_pro_id($body['attempt_id'] ?? null);cssv_learning_attempt($pdo,$attempt,$user);
   if($action==='drill_answer'){
    $questions=cssv_precis_questions();$question=$body['question_id'] ?? null;$choice=$body['choice'] ?? null;
    if(!is_string($question)||!isset($questions[$question])||!is_int($choice)||$choice<0||$choice>=count($questions[$question]['options']))throw new InvalidArgumentException('Choose an available drill and answer.');$q=$questions[$question];
    $pdo->prepare('INSERT INTO precis_responses(id,user_id,attempt_id,question_id,choice) VALUES(?,?,?,?,?)')->execute([cssv_uuid_v4(),$user,$attempt,$question,$choice]);
    $result=['correct'=>$choice===$q['answer'],'answer'=>$q['answer'],'explanation'=>$q['explanation']];
   }else{
    $day=$body['current_day'] ?? null;$chapter=$body['current_chapter'] ?? 1;$expected=$body['expected_version'] ?? null;$completed=$body['completed'] ?? null;
    if(!is_int($day)||$day<1||$day>30||!is_int($expected)||$expected<0||!is_array($completed)||!array_is_list($completed)||count($completed)>30)throw new InvalidArgumentException('Choose a valid course day and saved version.');
    foreach($completed as $d)if(!is_int($d)||$d<1||$d>30)throw new InvalidArgumentException('Invalid completed day.');
    if(!is_int($chapter)||$chapter<1||$chapter>25)throw new InvalidArgumentException('Choose a valid handbook chapter.');
    $current=cssv_precis_progress($pdo,$user,$attempt);if($current['version']!==$expected)throw new DomainException('Course progress changed elsewhere. Refresh before saving; your writing drafts remain available.');
    $completed=array_values(array_unique([...$current['completed'],...$completed]));sort($completed);
    $pdo->prepare('INSERT INTO precis_progress(attempt_id,user_id,version,current_day,current_chapter,completed) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),current_day=VALUES(current_day),current_chapter=VALUES(current_chapter),completed=VALUES(completed)')->execute([$attempt,$user,$expected+1,$day,$chapter,json_encode($completed)]);$result=['version'=>$expected+1];
   }
  }
  $pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();return $result;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_precis_catalog(): array {
 $book=cssv_precis_handbook();foreach($book['passages'] as &$p)unset($p['model'],$p['model_title']);unset($p);
 $questions=array_values(cssv_precis_questions());foreach($questions as &$q)unset($q['answer'],$q['explanation']);unset($q);
 return ['chapters'=>$book['chapters'],'passages'=>$book['passages'],'questions'=>$questions,'source_sha256'=>$book['source_sha256']];
}
