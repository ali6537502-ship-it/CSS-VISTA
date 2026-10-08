<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';
require_once __DIR__.'/_mentor_core.php';
require_once __DIR__.'/_mentor_schema.php';
function cssv_mentor_ensure(PDO $pdo): void {
 static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
 if((int)$pdo->query("SELECT GET_LOCK('cssvista-mentor-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('mentor_schema_busy');
 try{foreach(cssv_mentor_schema_statements() as $sql)$pdo->exec($sql);$ready=true;}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-mentor-schema-v1')");}
}
function cssv_mentor_normalize(array $a): array {
 foreach(['version','sequence','evaluation_revision'] as $key)$a[$key]=(int)$a[$key];
 foreach(['created_at','updated_at'] as $key)$a[$key]=cssv_pro_iso($a[$key]);
 $a['percentage']=$a['maximum_marks']!==null ? cssv_mentor_percentage((int)$a['obtained_marks'],(int)$a['maximum_marks']) : null;
 foreach(['obtained_marks','maximum_marks'] as $key)$a[$key]=$a[$key]===null ? null : (int)$a[$key];
 return $a;
}
function cssv_mentor_select(): string { return 'SELECT a.*,e.obtained_marks,e.maximum_marks,e.evaluation_date,e.mentor_comment FROM mentor_answers a LEFT JOIN mentor_evaluations e ON e.answer_id=a.id AND e.revision=a.evaluation_revision'; }
function cssv_mentor_answer(PDO $pdo,string $id,string $user): array {
 $q=$pdo->prepare(cssv_mentor_select().' WHERE a.id=? AND a.user_id=?');$q->execute([$id,$user]);$a=$q->fetch();if(!$a)throw new OutOfBoundsException('Answer record not found.');
 $a=cssv_mentor_normalize($a);$q=$pdo->prepare('SELECT * FROM mentor_evaluations WHERE answer_id=? ORDER BY revision DESC');$q->execute([$id]);$a['evaluations']=$q->fetchAll();
 foreach($a['evaluations'] as &$e){foreach(['revision','obtained_marks','maximum_marks'] as $key)$e[$key]=(int)$e[$key];$e['created_at']=cssv_pro_iso($e['created_at']);$e['percentage']=cssv_mentor_percentage($e['obtained_marks'],$e['maximum_marks']);}unset($e);
 $root=$a['root_id']??$id;$q=$pdo->prepare(cssv_mentor_select().' WHERE a.user_id=? AND (a.id=? OR a.root_id=?) ORDER BY a.sequence');$q->execute([$user,$root,$root]);$a['series']=array_map('cssv_mentor_normalize',$q->fetchAll());
 return $a;
}
function cssv_mentor_mutation(PDO $pdo,string $user,array $body): array {
 $action=$body['action']??null;$base=['action','request_id','expected_version'];
 cssv_pro_fields($body,match($action){'question_save'=>[...$base,'attempt_id','subject_id','topic','question','provenance','source_reference'],'retry_save'=>[...$base,'id'],'written_save'=>[...$base,'id','written_date'],'evaluation_save'=>[...$base,'id','obtained_marks','maximum_marks','evaluation_date','mentor_comment','correction_reason'],default=>throw new InvalidArgumentException('Choose an answer-record action.')});
 $request=cssv_pro_id($body['request_id']??null);$expected=$body['expected_version']??null;
 if(!is_int($expected)||$expected<0||$expected>100000)throw new InvalidArgumentException('Reload this record before saving.');
 $id=$action==='question_save'?null:cssv_pro_id($body['id']??null);
 $input=match($action){'question_save'=>cssv_mentor_question_input($body),'written_save'=>['written_date'=>cssv_mentor_date($body['written_date']??null)],'evaluation_save'=>cssv_mentor_evaluation_input($body),default=>[]};
 $hash=hash('sha256',json_encode(['mentor-v1',$action,$id,$expected,$input],JSON_THROW_ON_ERROR));
 $pdo->beginTransaction();try{
  cssv_learning_owner_lock($pdo,$user);
  $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
  if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This request was already used for different work.');$pdo->commit();return json_decode($prior['result'],true,16,JSON_THROW_ON_ERROR);}
  $current=$id ? cssv_mentor_answer($pdo,$id,$user) : null;
  if($current&&$current['version']!==$expected)throw new DomainException('This record changed elsewhere. Reload before saving.');
  if($action==='question_save'||$action==='retry_save'){
   if($action==='question_save'){if($expected!==0)throw new InvalidArgumentException('A new record starts at version zero.');cssv_learning_attempt($pdo,$input['attempt_id'],$user);$root=null;$retry=null;$sequence=1;}
   else{if($current['status']!=='evaluated')throw new DomainException('Record the mentor evaluation before starting a repeat attempt.');$input=array_intersect_key($current,array_flip(['attempt_id','subject_id','topic','question','provenance','source_reference']));$root=$current['root_id']??$id;$retry=$id;$q=$pdo->prepare('SELECT MAX(sequence) FROM mentor_answers WHERE user_id=? AND (id=? OR root_id=?)');$q->execute([$user,$root,$root]);$sequence=(int)$q->fetchColumn()+1;$pdo->prepare('UPDATE mentor_answers SET version=version+1 WHERE id=? AND user_id=?')->execute([$id,$user]);}
   $id=cssv_uuid_v4();$pdo->prepare('INSERT INTO mentor_answers(id,user_id,attempt_id,subject_id,topic,question,provenance,source_reference,root_id,retry_of,sequence) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([$id,$user,$input['attempt_id'],$input['subject_id'],$input['topic'],$input['question'],$input['provenance'],$input['source_reference'],$root,$retry,$sequence]);$version=1;
  }elseif($action==='written_save'){
   if($current['status']!=='not_attempted')throw new DomainException('This answer has already been marked written.');
   $pdo->prepare("UPDATE mentor_answers SET written_date=?,status='awaiting_evaluation',version=version+1 WHERE id=? AND user_id=?")->execute([$input['written_date'],$id,$user]);$version=$expected+1;
  }else{
   if($current['status']==='not_attempted')throw new DomainException('Mark the answer written before entering a mentor evaluation.');
   if($input['evaluation_date']<$current['written_date'])throw new InvalidArgumentException('The evaluation date must be on or after the writing date.');
   if($current['evaluation_revision']>0&&$input['correction_reason']==='')throw new InvalidArgumentException('Explain the correction so the original entry remains understandable.');
   $revision=$current['evaluation_revision']+1;$pdo->prepare('INSERT INTO mentor_evaluations(id,answer_id,revision,obtained_marks,maximum_marks,evaluation_date,mentor_comment,correction_reason) VALUES(?,?,?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$id,$revision,$input['obtained_marks'],$input['maximum_marks'],$input['evaluation_date'],$input['mentor_comment'],$input['correction_reason']]);
   $pdo->prepare("UPDATE mentor_answers SET evaluation_revision=?,status='evaluated',version=version+1 WHERE id=? AND user_id=?")->execute([$revision,$id,$user]);$version=$expected+1;
  }
  $result=['answer_id'=>$id,'version'=>$version];$pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();return $result;
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_mentor_overview(PDO $pdo,string $user,array $filters): array {
 cssv_pro_fields($filters,['attempt','subject','topic','status','provenance','from','to','minimum','maximum','offset']);
 $where=['a.user_id=?'];$values=[$user];
 if(!empty($filters['attempt'])){$id=cssv_pro_id($filters['attempt']);cssv_learning_attempt($pdo,$id,$user);$where[]='a.attempt_id=?';$values[]=$id;}
 if(!empty($filters['subject'])){if(!in_array($filters['subject'],array_column(cssv_mentor_catalog(),'slug'),true))throw new InvalidArgumentException('Choose an available subject.');$where[]='a.subject_id=?';$values[]=$filters['subject'];}
 if(!empty($filters['topic'])){$where[]='a.topic=?';$values[]=cssv_learning_string($filters['topic'],180,'topic');}
 foreach(['status'=>['not_attempted','awaiting_evaluation','evaluated'],'provenance'=>['practice','student_past_paper']] as $key=>$allowed){if(!empty($filters[$key])){if(!in_array($filters[$key],$allowed,true))throw new InvalidArgumentException('Choose a valid filter.');$where[]="a.$key=?";$values[]=$filters[$key];}}
 foreach(['from'=>'>=','to'=>'<='] as $key=>$op)if(!empty($filters[$key])){$where[]="e.evaluation_date $op ?";$values[]=cssv_mentor_date($filters[$key]);}
 if(!empty($filters['from'])&&!empty($filters['to'])&&$filters['from']>$filters['to'])throw new InvalidArgumentException('The start date must be before the end date.');
 foreach(['minimum'=>'>=','maximum'=>'<='] as $key=>$op)if(isset($filters[$key])&&$filters[$key]!==''){$number=filter_var($filters[$key],FILTER_VALIDATE_FLOAT);if($number===false||!is_finite($number)||$number<0||$number>100)throw new InvalidArgumentException('Choose a score percentage from 0 through 100.');$where[]="100.0 * e.obtained_marks / e.maximum_marks $op ?";$values[]=$number;}
 if(isset($filters['minimum'],$filters['maximum'])&&$filters['minimum']!==''&&$filters['maximum']!==''&&(float)$filters['minimum']>(float)$filters['maximum'])throw new InvalidArgumentException('Minimum score must not exceed maximum score.');
 $offset=filter_var($filters['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid history page.');
 $clause=implode(' AND ',$where);$q=$pdo->prepare(cssv_mentor_select().' WHERE '.$clause.' ORDER BY a.created_at DESC,a.id LIMIT 51 OFFSET '.(int)$offset);$q->execute($values);$rows=$q->fetchAll();$more=count($rows)>50;$rows=array_map('cssv_mentor_normalize',array_slice($rows,0,50));
 $q=$pdo->prepare('SELECT a.subject_id,a.topic,(a.sequence>1) AS is_retry,COUNT(*) AS count,SUM(e.obtained_marks) AS obtained,SUM(e.maximum_marks) AS maximum FROM mentor_answers a JOIN mentor_evaluations e ON e.answer_id=a.id AND e.revision=a.evaluation_revision WHERE '.$clause.' GROUP BY a.subject_id,a.topic,(a.sequence>1)');$q->execute($values);$summary=cssv_mentor_summary($q->fetchAll());
 return ['answers'=>$rows,'has_more'=>$more,'summary'=>$summary,'catalog'=>cssv_mentor_catalog()];
}
