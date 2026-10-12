<?php
declare(strict_types=1);
require_once __DIR__.'/_learning.php';require_once __DIR__.'/_skills_core.php';require_once __DIR__.'/_skills_schema.php';
function cssv_skills_ensure(PDO $pdo): void {
    static $ready=false;if($ready)return;cssv_learning_ensure($pdo);
    if((int)$pdo->query("SELECT GET_LOCK('cssvista-skills-schema-v1',5)")->fetchColumn()!==1)throw new RuntimeException('skills_schema_busy');
    try{foreach(cssv_skills_schema_statements() as $sql)$pdo->exec($sql);$ready=true;}finally{$pdo->query("SELECT RELEASE_LOCK('cssvista-skills-schema-v1')");}
}
function cssv_skills_resume(PDO $pdo,string $user,string $attempt): array {
    if(!cssv_learning_has_guided($pdo)||cssv_pro_membership($pdo,$user)['status']!=='active')return [];
    $q=$pdo->prepare('SELECT id FROM skills_workspaces WHERE user_id=? AND attempt_id=? AND version>0 ORDER BY updated_at DESC,id DESC LIMIT 6');$q->execute([$user,$attempt]);$rows=[];
    foreach($q->fetchAll(PDO::FETCH_COLUMN) as $id){
        $w=cssv_skills_workspace($pdo,$user,$id);$v=cssv_skills_version($pdo,$user,$w);$stage=$w['source']['stages'][$v['evidence']['next']];
        $path=match($w['feature']){'sentence'=>'/account/expression?view=studio&','argument'=>'/account/argumentation?','analysis'=>'/account/analytical-skills?','essay'=>'/account/essay-builder?'};
        $rows[]=['id'=>$id,'feature'=>$w['feature'],'title'=>$w['source']['title'],'version'=>$v['version'],'level'=>$w['level'],'next_stage'=>$stage['title'],'recorded'=>count($v['evidence']['recorded']),'all_recorded'=>$v['evidence']['all_recorded'],'to'=>$path.'workspace='.$id];
    }return $rows;
}
function cssv_skills_workspace(PDO $pdo,string $user,string $id): array {
    $q=$pdo->prepare('SELECT * FROM skills_workspaces WHERE id=? AND user_id=?');$q->execute([$id,$user]);$w=$q->fetch();if(!$w)throw new OutOfBoundsException('Saved skills workspace not found.');
    $w['source']=json_decode($w['source_snapshot'],true,64,JSON_THROW_ON_ERROR);unset($w['source_snapshot']);
    if(!hash_equals($w['source_hash'],cssv_skills_hash($w['source'])))throw new LogicException('Saved lesson context is unavailable.');
    $w['version']=(int)$w['version'];$w['position']=(int)$w['position'];$w['updated_at']=cssv_pro_iso($w['updated_at']);return $w;
}
function cssv_skills_version(PDO $pdo,string $user,array $w,?string $id=null): ?array {
    if(!$w['writing_id'])return null;
    $q=$pdo->prepare('SELECT s.version_id,s.answers,s.evidence,v.version,v.text,v.word_count,v.created_at FROM skills_versions s JOIN writing_versions v ON v.id=s.version_id WHERE s.workspace_id=?'.($id?' AND s.version_id=?':'').' ORDER BY v.version DESC LIMIT 1');$q->execute($id?[$w['id'],$id]:[$w['id']]);$v=$q->fetch();if(!$v)throw new OutOfBoundsException('Saved version not found in this workspace.');
    cssv_learning_version($pdo,$v['version_id'],$user);foreach(['answers','evidence'] as $k)$v[$k]=json_decode($v[$k],true,32,JSON_THROW_ON_ERROR);$v['version']=(int)$v['version'];$v['word_count']=(int)$v['word_count'];$v['created_at']=cssv_pro_iso($v['created_at']);return $v;
}
function cssv_skills_append(PDO $pdo,string $user,array $w,array $answers,int $position,?string $field=null): array {
    $responseStage=$field;
    if($w['feature']==='sentence'&&!in_array($field,['draft','revision'],true)){
        $prior=cssv_skills_version($pdo,$user,$w);$field=$prior['evidence']['writing_field']??null;
    }
    $text=cssv_skills_wording($w['source'],$answers,$field);if($text==='')throw new InvalidArgumentException('Record a response before saving this version.');
    $writing=$w['writing_id']??cssv_uuid_v4();$version=$w['version']+1;$id=cssv_uuid_v4();
    if($w['writing_id']){
        $q=$pdo->prepare('SELECT version FROM writing_records WHERE id=? AND user_id=?');$q->execute([$writing,$user]);$current=$q->fetchColumn();
        if($current===false||(int)$current!==$w['version'])throw new DomainException('This writing changed in another workspace. Compare the newer saved version before continuing.');
        $pdo->prepare('UPDATE writing_records SET version=? WHERE id=? AND user_id=?')->execute([$version,$writing,$user]);
    }else $pdo->prepare('INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version) VALUES(?,?,?,?,?,?)')->execute([$writing,$user,$w['attempt_id'],$w['feature']==='sentence'?'sentence':'paragraph',$w['source']['title'],$version]);
    $pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,?,?,?,?)')->execute([$id,$writing,$version,$text,hash('sha256',$text),cssv_learning_words($text)]);
    $evidence=cssv_skills_evidence($w['source'],$answers);$evidence['response_stage']=$responseStage;if($w['feature']==='sentence')$evidence['writing_field']=$field;
    $pdo->prepare('INSERT INTO skills_versions(version_id,workspace_id,answers,evidence) VALUES(?,?,?,?)')->execute([$id,$w['id'],json_encode($answers,JSON_THROW_ON_ERROR),json_encode($evidence,JSON_THROW_ON_ERROR)]);
    $pdo->prepare('UPDATE skills_workspaces SET writing_id=?,version=?,position=? WHERE id=? AND user_id=?')->execute([$writing,$version,$position,$w['id'],$user]);
    return ['workspace_id'=>$w['id'],'writing_id'=>$writing,'version_id'=>$id,'version'=>$version,'evidence'=>$evidence];
}
/** Bounded owned references; paging never loads or changes student writing. */
function cssv_skills_linked(PDO $pdo,string $user,string $parent,mixed $offset=0): array {
    $offset=filter_var($offset,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
    if($offset===false)throw new InvalidArgumentException('Choose a valid linked-practice page.');
    $q=$pdo->prepare('SELECT s.id,s.feature,s.lesson_id,s.version,s.writing_id,v.id AS version_id FROM skills_workspaces s LEFT JOIN writing_versions v ON v.writing_id=s.writing_id AND v.version=s.version WHERE s.user_id=? AND s.parent_id=? ORDER BY s.updated_at DESC,s.id DESC LIMIT 21 OFFSET '.(int)$offset);$q->execute([$user,$parent]);$children=$q->fetchAll();
    return ['children'=>array_slice($children,0,20),'children_offset'=>(int)$offset,'has_more_children'=>count($children)>20];
}
function cssv_skills_mutation(PDO $pdo,string $user,array $body): array {
    $action=$body['action']??'';
    cssv_pro_fields($body,match($action){
        'start'=>['action','request_id','feature','lesson','level','attempt_id','statement'],
        'save'=>['action','request_id','workspace_id','expected_version','stage','response','advance'],
        'transfer'=>['action','request_id','workspace_id','version_id','field','feature','lesson','level','start','end'],
        'adopt'=>['action','request_id','workspace_id','expected_version','child_id','child_version_id'],
        default=>throw new InvalidArgumentException('Choose a supported skills action.')});
    $request=cssv_pro_id($body['request_id']??null);$intent=$body;unset($intent['request_id']);ksort($intent);$hash=hash('sha256',json_encode(['skills-v1',$intent],JSON_THROW_ON_ERROR));
    $pdo->beginTransaction();try{
        cssv_learning_owner_lock($pdo,$user);
        $q=$pdo->prepare('SELECT payload_hash,result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
        if($r=$q->fetch()){if(!hash_equals($r['payload_hash'],$hash))throw new DomainException('This request identity was used for different work.');$pdo->commit();return json_decode($r['result'],true,32,JSON_THROW_ON_ERROR);}
        cssv_pro_require_active($pdo,$user);
        if($action==='start'||$action==='transfer'){
            $feature=cssv_skills_feature($body['feature']??null);$level=$body['level']??'';$source=cssv_skills_source($feature,$body['lesson']??null,$level);
            if($action==='transfer'){
                $parent=cssv_skills_workspace($pdo,$user,cssv_pro_id($body['workspace_id']??null));$v=cssv_skills_version($pdo,$user,$parent,cssv_pro_id($body['version_id']??null));$field=$body['field']??null;
                if(!is_string($field)||$field==='check'||!isset($v['answers'][$field])||!is_string($v['answers'][$field])||$v['answers'][$field]==='')throw new InvalidArgumentException('Choose a saved independent response to transfer.');
                $statement=$v['answers'][$field];
                if(isset($body['start'])||isset($body['end'])){
                    $start=$body['start']??null;$end=$body['end']??null;
                    if(!is_int($start)||!is_int($end)||$start<0||$end<=$start||$end>mb_strlen($statement))throw new InvalidArgumentException('Select a valid passage from the saved response.');
                    $source['transfer_range']=['start'=>$start,'end'=>$end];$statement=mb_substr($statement,$start,$end-$start);
                }
                $statement=cssv_learning_string($statement,6000,'bounded transferred response; select a shorter passage when needed');$attempt=$parent['attempt_id'];
            }else{$statement=cssv_learning_string($body['statement']??'',1000,'practice statement',true);$attempt=cssv_pro_id($body['attempt_id']??null);}
            cssv_learning_attempt($pdo,$attempt,$user);$id=cssv_uuid_v4();
            $raw=json_encode($source,JSON_THROW_ON_ERROR);
            $pdo->prepare('INSERT INTO skills_workspaces(id,user_id,attempt_id,feature,lesson_id,level,source_hash,source_snapshot,statement,parent_id,parent_version_id,parent_field) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')->execute([$id,$user,$attempt,$feature,$source['id'],$level,cssv_skills_hash($source),$raw,$statement,$parent['id']??null,$v['version_id']??null,$field??null]);
            $result=['workspace_id'=>$id,'feature'=>$feature,'version'=>0];
        }else{
            $w=cssv_skills_workspace($pdo,$user,cssv_pro_id($body['workspace_id']??null));$expected=$body['expected_version']??null;
            if(!is_int($expected)||$expected!==$w['version'])throw new DomainException('This workspace changed elsewhere. Compare your draft with the latest saved version.');
            $latest=cssv_skills_version($pdo,$user,$w);$answers=$latest['answers']??[];
            if($action==='save'){
                $stage=$body['stage']??null;$ids=array_column($w['source']['stages'],'id');$index=array_search($stage,$ids,true);
                if($index===false)throw new InvalidArgumentException('Choose a real learning stage.');
                $evidence=cssv_skills_evidence($w['source'],$answers);
                if($index>$evidence['next'])throw new DomainException('Complete the preceding guided responses first.');
                $answers=cssv_skills_answers([...$answers,$stage=>$body['response']??null],$w['source']);
                $evidence=cssv_skills_evidence($w['source'],$answers);
                if(isset($body['advance'])&&!is_bool($body['advance']))throw new InvalidArgumentException('Choose a valid continuation action.');
                $position=($body['advance']??false)?$evidence['next']:(int)$index;
            }else{
                $child=cssv_skills_workspace($pdo,$user,cssv_pro_id($body['child_id']??null));
                if($child['parent_id']!==$w['id'])throw new DomainException('This revision belongs to a different parent workspace.');
                $v=cssv_skills_version($pdo,$user,$child,cssv_pro_id($body['child_version_id']??null));
                $field=match($child['feature']){'sentence'=>'revision','argument'=>'final','analysis'=>'conclusion','essay'=>'practice'};
                if(empty($v['answers'][$field])||!$v['evidence']['all_recorded'])throw new InvalidArgumentException('Complete and save the child workspace’s independent final revision first.');
                $replacement=$v['answers'][$field];
                if(isset($child['source']['transfer_range'])){
                    $range=$child['source']['transfer_range'];$current=$answers[$child['parent_field']]??'';
                    if(!is_string($current)||mb_substr($current,$range['start'],$range['end']-$range['start'])!==$child['statement'])throw new DomainException('The selected original passage changed. Compare the parent response and start a new linked selection before returning this revision.');
                    $replacement=mb_substr($current,0,$range['start']).$replacement.mb_substr($current,$range['end']);
                }
                $answers=cssv_skills_answers([...$answers,$child['parent_field']=>$replacement],$w['source']);$position=$w['position'];
            }
            $result=cssv_skills_append($pdo,$user,$w,$answers,$position,$action==='save'?$stage:$child['parent_field']);
        }
        $result['skills_receipt']=true;
        $pdo->prepare('INSERT INTO learning_requests(user_id,request_id,payload_hash,result) VALUES(?,?,?,?)')->execute([$user,$request,$hash,json_encode($result,JSON_THROW_ON_ERROR)]);
        $pdo->commit();return $result;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
