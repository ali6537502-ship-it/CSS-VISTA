<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';
require_once __DIR__.'/_topics_core.php';
require_once __DIR__.'/_topics_schema.php';

function cssv_topics_ensure(PDO $pdo): void {
    static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
    if((int)$pdo->query("SELECT GET_LOCK('cssvista-topics-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('topics_schema_busy');
    try{foreach(cssv_topics_schema_statements() as $sql)$pdo->exec($sql);$ready=true;}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-topics-schema-v1')");}
}
function cssv_topic_progress(PDO $pdo,string $user,string $attempt,string $version): array {
    $q=$pdo->prepare('SELECT * FROM attempt_topic_progress WHERE user_id=? AND attempt_id=? AND topic_version_id=?');$q->execute([$user,$attempt,$version]);$r=$q->fetch();
    if(!$r)return ['version'=>0,'state'=>'not_started','completed'=>[],'bookmarked'=>false,'started_at'=>null,'notes'=>'','draft'=>'','draft_version'=>0,'draft_words'=>0,'learn_score'=>null,'revision_score'=>null,'next_revision'=>null,'last_review'=>null,'review_count'=>0];
    foreach(['attempt_id','user_id','topic_id','topic_version_id'] as $key)unset($r[$key]);
    foreach(['version','draft_version','draft_words','review_count'] as $key)$r[$key]=(int)$r[$key];
    foreach(['learn_score','revision_score'] as $key)$r[$key]=isset($r[$key])?(int)$r[$key]:null;
    $r['bookmarked']=(bool)$r['bookmarked'];$r['completed']=json_decode($r['completed'],true,32,JSON_THROW_ON_ERROR);
    $r['started_at']=cssv_pro_iso($r['started_at']);$r['updated_at']=cssv_pro_iso($r['updated_at']);return $r;
}
function cssv_topic_published(PDO $pdo,string $topic,bool $lock=false): array {
    $q=$pdo->prepare('SELECT t.id,t.title,t.summary,t.category,t.revision,v.id version_id,v.content_hash,v.content FROM pro_topics t JOIN pro_topic_versions v ON v.id=t.published_version_id AND v.topic_id=t.id WHERE t.id=?'.($lock?' FOR UPDATE':''));$q->execute([$topic]);$row=$q->fetch();
    if(!$row)throw new OutOfBoundsException('Published topic not found.');
    $row['definition']=json_decode($row['content'],true,64,JSON_THROW_ON_ERROR);unset($row['content']);return $row;
}
function cssv_topic_catalog(PDO $pdo,string $user,?string $attempt,int $offset,string $category,string $search): array {
    if($attempt)cssv_learning_attempt($pdo,$attempt,$user);
    if($category!==''&&!in_array($category,['history','governance','society','economy','security','international','environment'],true))throw new InvalidArgumentException('Choose an available category.');
    $where='t.published_version_id IS NOT NULL';$args=[];
    if($category!==''){$where.=' AND t.category=?';$args[]=$category;}
    if($search!==''){$where.=' AND (t.title LIKE ? OR t.summary LIKE ?)';$args[]='%'.$search.'%';$args[]='%'.$search.'%';}
    $q=$pdo->prepare('SELECT COUNT(*) FROM pro_topics t WHERE '.$where);$q->execute($args);$total=(int)$q->fetchColumn();
    $q=$pdo->prepare('SELECT t.id,t.title,t.summary,t.category,t.published_version_id version_id,v.content_hash FROM pro_topics t JOIN pro_topic_versions v ON v.id=t.published_version_id AND v.topic_id=t.id WHERE '.$where.' ORDER BY t.category,t.title,t.id LIMIT 21 OFFSET '.$offset);$q->execute($args);$items=$q->fetchAll();$more=count($items)>20;$items=array_slice($items,0,20);
    if($attempt&&$items){$versions=array_column($items,'version_id');$q=$pdo->prepare('SELECT topic_version_id,state,bookmarked,next_revision,learn_score,review_count FROM attempt_topic_progress WHERE user_id=? AND attempt_id=? AND topic_version_id IN ('.implode(',',array_fill(0,count($versions),'?')).')');$q->execute([$user,$attempt,...$versions]);$progress=array_column($q->fetchAll(),null,'topic_version_id');
        foreach($items as &$item){$r=$progress[$item['version_id']]??[];$state=$r['state']??'not_started';if(in_array($state,['practised','mastered'],true)&&!empty($r['next_revision'])&&$r['next_revision']<=cssv_topic_today())$state='revision_due';$item['state']=$state;$item['bookmarked']=(bool)($r['bookmarked']??false);$item['next_revision']=$r['next_revision']??null;}unset($item);
    }else foreach($items as &$item){$item['state']='not_started';$item['bookmarked']=false;$item['next_revision']=null;}unset($item);
    $categories=$pdo->query('SELECT category,COUNT(*) count FROM pro_topics WHERE published_version_id IS NOT NULL GROUP BY category ORDER BY category')->fetchAll();foreach($categories as &$row)$row['count']=(int)$row['count'];unset($row);
    $stats=['started'=>0,'understood'=>0,'practised'=>0,'mastered'=>0,'due'=>0,'bookmarked'=>0];
    if($attempt){$q=$pdo->prepare('SELECT p.state,p.next_revision,p.bookmarked FROM attempt_topic_progress p JOIN pro_topics t ON t.published_version_id=p.topic_version_id AND t.id=p.topic_id WHERE p.user_id=? AND p.attempt_id=?');$q->execute([$user,$attempt]);foreach($q->fetchAll() as $row){if(in_array($row['state'],['practised','mastered'],true)&&$row['next_revision']&&$row['next_revision']<=cssv_topic_today())$row['state']='revision_due';if($row['state']!=='not_started')$stats['started']++;if(in_array($row['state'],['understood','practised','mastered','revision_due'],true))$stats['understood']++;if(in_array($row['state'],['practised','mastered','revision_due'],true))$stats['practised']++;if($row['state']==='mastered')$stats['mastered']++;if($row['state']==='revision_due')$stats['due']++;if($row['bookmarked'])$stats['bookmarked']++;}}
    return ['membership'=>cssv_pro_membership($pdo,$user),'today'=>cssv_topic_today(),'items'=>$items,'total'=>$total,'has_more'=>$more,'categories'=>$categories,'stats'=>$stats];
}
function cssv_topic_detail(PDO $pdo,string $user,string $attempt,string $topic): array {
    cssv_learning_attempt($pdo,$attempt,$user);$membership=cssv_pro_membership($pdo,$user);$available=true;
    try{$row=cssv_topic_published($pdo,$topic);}catch(OutOfBoundsException $e){
        $q=$pdo->prepare('SELECT t.id,t.title,t.summary,t.category,v.id version_id,v.content_hash,v.content FROM attempt_topic_progress p JOIN pro_topic_versions v ON v.id=p.topic_version_id JOIN pro_topics t ON t.id=v.topic_id WHERE p.user_id=? AND p.attempt_id=? AND p.topic_id=? ORDER BY p.updated_at DESC LIMIT 1');$q->execute([$user,$attempt,$topic]);$row=$q->fetch();if(!$row)throw $e;$row['definition']=json_decode($row['content'],true,64,JSON_THROW_ON_ERROR);unset($row['content']);$available=false;
    }
    $progress=cssv_topic_progress($pdo,$user,$attempt,$row['version_id']);$progress['state']=cssv_topic_state($progress,$row['definition'],cssv_topic_today());
    $q=$pdo->prepare('SELECT COUNT(*) FROM attempt_topic_progress WHERE user_id=? AND attempt_id=? AND topic_id=? AND topic_version_id<>?');$q->execute([$user,$attempt,$topic,$row['version_id']]);$older=(int)$q->fetchColumn();
    return ['membership'=>$membership,'today'=>cssv_topic_today(),'available'=>$available,'topic'=>array_intersect_key($row,array_flip(['id','title','summary','category','version_id','content_hash'])),'content'=>$available&&$membership['status']==='active'?cssv_topic_client_content($row['definition']):null,'progress'=>$progress,'older_versions'=>$older];
}
function cssv_topic_history(PDO $pdo,string $user,string $attempt,?string $topic,int $offset): array {
    cssv_learning_attempt($pdo,$attempt,$user);$where='p.user_id=? AND p.attempt_id=?';$args=[$user,$attempt];if($topic){$where.=' AND p.topic_id=?';$args[]=$topic;}
    $q=$pdo->prepare('SELECT p.topic_id,p.topic_version_id,p.state,p.notes,p.draft,p.draft_words,p.completed,p.next_revision,p.review_count,p.updated_at,v.content_hash,JSON_UNQUOTE(JSON_EXTRACT(v.content,\'$.title\')) title,JSON_UNQUOTE(JSON_EXTRACT(v.content,\'$.as_of\')) as_of FROM attempt_topic_progress p JOIN pro_topic_versions v ON v.id=p.topic_version_id WHERE '.$where.' ORDER BY p.updated_at DESC,p.topic_version_id LIMIT 21 OFFSET '.$offset);$q->execute($args);$records=$q->fetchAll();$more=count($records)>20;$records=array_slice($records,0,20);foreach($records as &$r){$r['completed']=json_decode($r['completed'],true,32,JSON_THROW_ON_ERROR);$r['draft_words']=(int)$r['draft_words'];$r['review_count']=(int)$r['review_count'];$r['updated_at']=cssv_pro_iso($r['updated_at']);}unset($r);
    $checkWhere='c.user_id=? AND c.attempt_id=?';$checkArgs=[$user,$attempt];if($topic){$checkWhere.=' AND v.topic_id=?';$checkArgs[]=$topic;}
    $q=$pdo->prepare('SELECT c.id,c.topic_version_id,v.topic_id,c.mode,c.result,c.created_at FROM attempt_topic_checks c JOIN pro_topic_versions v ON v.id=c.topic_version_id WHERE '.$checkWhere.' ORDER BY c.created_at DESC,c.id DESC LIMIT 21 OFFSET '.$offset);$q->execute($checkArgs);$checks=$q->fetchAll();$checkMore=count($checks)>20;$checks=array_slice($checks,0,20);foreach($checks as &$c){$c['result']=json_decode($c['result'],true,64,JSON_THROW_ON_ERROR);$c['created_at']=cssv_pro_iso($c['created_at']);}unset($c);
    return ['records'=>$records,'checks'=>$checks,'has_more'=>$more||$checkMore];
}
function cssv_topic_mutation(PDO $pdo,string $user,array $body): array {
    $action=$body['action']??'';$base=['action','attempt_id','topic_id','topic_version_id','content_hash','expected_version','request_id'];
    cssv_pro_fields($body,match($action){'begin'=>$base,'checkpoint'=>[...$base,'section_id'],'bookmark'=>[...$base,'bookmarked'],'draft'=>[...$base,'notes','draft','expected_draft_version'],'quiz','review'=>[...$base,'choices'],default=>throw new InvalidArgumentException('Choose a topic learning action.')});
    $request=cssv_pro_id($body['request_id']??null);$attempt=cssv_pro_id($body['attempt_id']??null);$topic=cssv_topic_slug($body['topic_id']??null);$version=cssv_pro_id($body['topic_version_id']??null);
    $expected=$body['expected_version']??null;if(!is_int($expected)||$expected<0||$expected>1000000)throw new InvalidArgumentException('Refresh the saved topic version.');
    $payload=$body;unset($payload['request_id']);$hash=hash('sha256',json_encode(['native-topics-v1',$payload],JSON_THROW_ON_ERROR));
    $pdo->beginTransaction();try{
        cssv_learning_owner_lock($pdo,$user);cssv_learning_attempt($pdo,$attempt,$user);
        $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
        if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This request was already used for different work.');$pdo->commit();return json_decode($prior['result'],true,64,JSON_THROW_ON_ERROR);}
        cssv_pro_require_active($pdo,$user);$row=cssv_topic_published($pdo,$topic,true);
        if($row['version_id']!==$version||!is_string($body['content_hash']??null)||!hash_equals($row['content_hash'],$body['content_hash']))throw new DomainException('This lesson changed. Earlier work is preserved; open the current edition before continuing.');
        $definition=$row['definition'];$r=cssv_topic_progress($pdo,$user,$attempt,$version);
        if($r['version']!==$expected)throw new DomainException('This topic was updated on another device. Keep your draft and refresh its saved version.');
        $today=cssv_topic_today();$result=['topic_id'=>$topic,'topic_version_id'=>$version,'version'=>$expected+1];
        if($action==='bookmark'){
            if(!is_bool($body['bookmarked']??null))throw new InvalidArgumentException('Choose a bookmark state.');$r['bookmarked']=$body['bookmarked'];
        }else{
            if(!$r['started_at'])$r['started_at']=(new DateTimeImmutable('now',new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.u\Z');
            if($action==='checkpoint'){
                $section=$body['section_id']??null;if(!is_string($section)||!in_array($section,array_column($definition['sections'],'id'),true))throw new InvalidArgumentException('Choose an actual section of this lesson.');
                if(in_array($section,$r['completed'],true))throw new DomainException('This section is already recorded.');$r['completed'][]=$section;
            }elseif($action==='draft'){
                if(!is_int($body['expected_draft_version']??null)||$body['expected_draft_version']<0)throw new InvalidArgumentException('Provide the saved draft version.');
                if($body['expected_draft_version']!==$r['draft_version'])throw new DomainException('Your notes or writing changed elsewhere. Compare the saved draft before replacing it.');
                foreach(['notes','draft'] as $key){$value=$body[$key]??null;if(!is_string($value)||!mb_check_encoding($value,'UTF-8')||mb_strlen($value)>8000)throw new InvalidArgumentException('Keep notes and writing within 8,000 characters each.');$r[$key]=trim($value);}
                $r['draft_words']=cssv_learning_words($r['draft']);if($r['draft_words']>$definition['practice']['max_words'])throw new InvalidArgumentException('Keep independent writing within the stated word limit.');$r['draft_version']++;
            }elseif(in_array($action,['quiz','review'],true)){
                if($action==='review'&&(!$r['next_revision']||$r['next_revision']>$today))throw new DomainException('Revision becomes available on its scheduled Pakistan date.');
                $graded=cssv_topic_grade($definition,$action==='review'?'revision':'learn',$body['choices']??null);
                $pdo->prepare('INSERT INTO attempt_topic_checks(id,attempt_id,user_id,topic_version_id,mode,result) VALUES(?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$attempt,$user,$version,$graded['mode'],json_encode($graded,JSON_THROW_ON_ERROR)]);
                if($action==='quiz'){$r['learn_score']=$graded['score'];$r['revision_score']=null;$r['next_revision']=cssv_topic_add_days($today,1);}
                else{$r['revision_score']=$graded['score'];$r['review_count']++;$r['last_review']=$today;$streak=0;if($graded['passed']){$q=$pdo->prepare('SELECT result FROM attempt_topic_checks WHERE user_id=? AND attempt_id=? AND topic_version_id=? AND mode=\'revision\' ORDER BY created_at DESC,id DESC LIMIT 4');$q->execute([$user,$attempt,$version]);foreach($q->fetchAll() as $previous){if(!json_decode($previous['result'],true,64,JSON_THROW_ON_ERROR)['passed'])break;$streak++;}}$days=$graded['passed']?([3,7,14,30][min(max($streak-1,0),3)]):1;$r['next_revision']=cssv_topic_add_days($today,$days);}
                $result['check']=$graded;
            }
        }
        $r['state']=cssv_topic_state($r,$definition,$today);
        $started=$r['started_at']?(new DateTimeImmutable($r['started_at']))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'):null;
        $pdo->prepare('INSERT INTO attempt_topic_progress(attempt_id,user_id,topic_id,topic_version_id,version,state,completed,bookmarked,started_at,notes,draft,draft_version,draft_words,learn_score,revision_score,next_revision,last_review,review_count) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),state=VALUES(state),completed=VALUES(completed),bookmarked=VALUES(bookmarked),started_at=VALUES(started_at),notes=VALUES(notes),draft=VALUES(draft),draft_version=VALUES(draft_version),draft_words=VALUES(draft_words),learn_score=VALUES(learn_score),revision_score=VALUES(revision_score),next_revision=VALUES(next_revision),last_review=VALUES(last_review),review_count=VALUES(review_count)')->execute([$attempt,$user,$topic,$version,$expected+1,$r['state'],json_encode($r['completed']),$r['bookmarked']?1:0,$started,$r['notes'],$r['draft'],$r['draft_version'],$r['draft_words'],$r['learn_score'],$r['revision_score'],$r['next_revision'],$r['last_review'],$r['review_count']]);
        $result['state']=$r['state'];$pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();return $result;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function cssv_topic_admin_mutation(PDO $pdo,array $admin,array $body): array {
    $action=$body['action']??'';$fields=['action','request_id','expected_revision'];
    cssv_pro_fields($body,match($action){'import'=>[...$fields,'topic'],'publish'=>[...$fields,'topic_id','version_id','reviewed','review_note'],'unpublish'=>[...$fields,'topic_id'],default=>throw new InvalidArgumentException('Choose a topic publication action.')});
    $request=cssv_pro_id($body['request_id']??null);$expected=$body['expected_revision']??null;if(!is_int($expected)||$expected<0||$expected>1000000)throw new InvalidArgumentException('Refresh the topic publication revision.');
    $definition=$action==='import'?cssv_topic_definition($body['topic']??null):null;$topic=$definition['id']??cssv_topic_slug($body['topic_id']??null);
    $payload=$body;unset($payload['request_id']);$hash=hash('sha256',json_encode(['topic-editor-v1',$payload],JSON_THROW_ON_ERROR));$adminId=(string)$admin['admin_id'];
    $pdo->beginTransaction();try{
        $q=$pdo->prepare('SELECT id FROM admin_accounts WHERE id=? AND disabled_at IS NULL FOR UPDATE');$q->execute([$adminId]);if(!$q->fetchColumn())throw new UnexpectedValueException('Your admin access ended.');
        $session=cssv_admin_current_session($pdo,true);if(!$session||!hash_equals($session['admin_id'],$adminId))throw new UnexpectedValueException('Your admin session ended.');
        $q=$pdo->prepare('SELECT payload_hash,result FROM topic_admin_requests WHERE admin_id=? AND request_id=?');$q->execute([$adminId,$request]);
        if($prior=$q->fetch()){if(!hash_equals($prior['payload_hash'],$hash))throw new DomainException('This publication request was already used for different content.');$pdo->commit();return json_decode($prior['result'],true,32,JSON_THROW_ON_ERROR);}
        $q=$pdo->prepare('SELECT * FROM pro_topics WHERE id=? FOR UPDATE');$q->execute([$topic]);$current=$q->fetch();
        if(($current?(int)$current['revision']:0)!==$expected)throw new DomainException('This publication changed elsewhere. Refresh before editing.');
        $details=[];
        if($action==='import'){
            if(!$current)$pdo->prepare('INSERT INTO pro_topics(id,title,summary,category,revision) VALUES(?,?,?,?,1)')->execute([$topic,$definition['title'],$definition['summary'],$definition['category']]);
            $contentHash=cssv_topic_hash($definition);$q=$pdo->prepare('SELECT id FROM pro_topic_versions WHERE topic_id=? AND content_hash=?');$q->execute([$topic,$contentHash]);$version=$q->fetchColumn();
            if(!$version){$version=cssv_uuid_v4();$pdo->prepare('INSERT INTO pro_topic_versions(id,topic_id,content_hash,content,created_by) VALUES(?,?,?,?,?)')->execute([$version,$topic,$contentHash,json_encode($definition,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$adminId]);}
            if($current)$pdo->prepare('UPDATE pro_topics SET revision=revision+1 WHERE id=?')->execute([$topic]);$details=['content_hash'=>$contentHash,'publication'=>'draft'];
        }elseif($action==='publish'){
            if(!$current)throw new OutOfBoundsException('Topic not found.');
            if(($body['reviewed']??null)!==true)throw new InvalidArgumentException('Review factual sources, wording and answer keys before publishing.');
            $note=cssv_topic_text($body['review_note']??null,1000,'publication review note');$version=cssv_pro_id($body['version_id']??null);
            $q=$pdo->prepare('SELECT content,content_hash FROM pro_topic_versions WHERE id=? AND topic_id=?');$q->execute([$version,$topic]);$row=$q->fetch();if(!$row)throw new OutOfBoundsException('Choose a version belonging to this topic.');
            $approved=cssv_topic_definition(json_decode($row['content'],true,64,JSON_THROW_ON_ERROR));
            if(!hash_equals($row['content_hash'],cssv_topic_hash($approved)))throw new DomainException('This source version failed its integrity check.');
            $pdo->prepare('UPDATE pro_topics SET title=?,summary=?,category=?,published_version_id=?,revision=revision+1 WHERE id=?')->execute([$approved['title'],$approved['summary'],$approved['category'],$version,$topic]);$details=['review_note'=>$note,'content_hash'=>$row['content_hash']];
        }else{
            if(!$current||!$current['published_version_id'])throw new OutOfBoundsException('Published topic not found.');$version=$current['published_version_id'];$pdo->prepare('UPDATE pro_topics SET published_version_id=NULL,revision=revision+1 WHERE id=?')->execute([$topic]);
        }
        $result=['topic_id'=>$topic,'version_id'=>$version,'revision'=>$expected+1,'publication'=>$action==='publish'?'published':($action==='unpublish'?'unpublished':'draft')];
        $pdo->prepare('INSERT INTO topic_editor_events(id,admin_id,topic_id,version_id,action,details) VALUES(?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$adminId,$topic,$version,$action,json_encode($details,JSON_THROW_ON_ERROR)]);
        $pdo->prepare('INSERT INTO topic_admin_requests(admin_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$adminId,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);$pdo->commit();return $result;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
