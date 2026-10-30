<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';require_once dirname(__DIR__).'/_skills_ai.php';
cssv_require_method('GET','POST');header('X-Robots-Tag: noindex, nofollow');
try{
    $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];
    if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);cssv_skills_ensure($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST'){
        cssv_enforce_rate_limit($pdo,'skills_write',$user,240,3600);cssv_log_security_event($pdo,'skills_write',$user,$user);$body=cssv_request_json(50000);
        if(($body['action']??null)==='evaluate'){$id=cssv_skills_ai_reserve($pdo,$user,$body);cssv_skills_ai_execute($pdo,$id);cssv_json(['ok'=>true,'skills_receipt'=>true,'operation'=>cssv_ai_owned_operation($pdo,$id,$user)]);}
        cssv_json(['ok'=>true,...cssv_skills_mutation($pdo,$user,$body)]);
    }
    cssv_pro_fields($_GET,['feature','workspace_id','version_id','request_id','view','offset']);
    $membership=cssv_pro_membership($pdo,$user);$active=true; // Learning catalogues are free for authenticated students.
    if(isset($_GET['request_id'])){
        $request=cssv_pro_id($_GET['request_id']);$q=$pdo->prepare('SELECT result FROM learning_requests WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);$raw=$q->fetchColumn();
        if($raw){$r=json_decode($raw,true,32,JSON_THROW_ON_ERROR);if(!isset($r['skills_receipt']))throw new OutOfBoundsException('Saved skills request not found.');cssv_json(['ok'=>true,...$r]);}
        $q=$pdo->prepare('SELECT o.id FROM ai_operations o JOIN skills_ai_inputs s ON s.operation_id=o.id WHERE o.user_id=? AND o.request_id=?');$q->execute([$user,$request]);$id=$q->fetchColumn();
        if(!$id)throw new OutOfBoundsException('Saved skills request not found.');cssv_json(['ok'=>true,'skills_receipt'=>true,'operation'=>cssv_ai_owned_operation($pdo,$id,$user)]);
    }
    if(isset($_GET['workspace_id'])){
        $w=cssv_skills_workspace($pdo,$user,cssv_pro_id($_GET['workspace_id']));$v=cssv_skills_version($pdo,$user,$w,isset($_GET['version_id'])?cssv_pro_id($_GET['version_id']):null);
        $source=$w['source'];$w['source']=$active?cssv_skills_public_source($source):['title'=>$source['title'],'id'=>$source['id'],'feature'=>$source['feature'],'stages'=>array_map(fn($s)=>array_intersect_key($s,array_flip(['id','title','min_words'])),$source['stages'])];
        $versionOffset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($versionOffset===false)throw new InvalidArgumentException('Invalid version page.');
        $q=$pdo->prepare('SELECT v.id,v.version,v.word_count,v.created_at FROM writing_versions v JOIN skills_versions s ON s.version_id=v.id WHERE s.workspace_id=? ORDER BY v.version DESC LIMIT 51 OFFSET '.(int)$versionOffset);$q->execute([$w['id']]);$versions=$q->fetchAll();$versionMore=count($versions)>50;$versions=array_slice($versions,0,50);
        $q=$pdo->prepare('SELECT o.id FROM ai_operations o JOIN skills_ai_inputs s ON s.operation_id=o.id WHERE o.user_id=? AND s.workspace_id=? ORDER BY (o.version_id=?) DESC,o.created_at DESC,o.id DESC LIMIT 20');$q->execute([$user,$w['id'],$v['version_id']??null]);$ops=array_map(fn($id)=>cssv_ai_owned_operation($pdo,$id,$user),$q->fetchAll(PDO::FETCH_COLUMN));
        $q=$pdo->prepare('SELECT s.id,s.feature,s.lesson_id,s.version,s.writing_id,v.id AS version_id FROM skills_workspaces s LEFT JOIN writing_versions v ON v.writing_id=s.writing_id AND v.version=s.version WHERE s.user_id=? AND s.parent_id=? ORDER BY s.updated_at DESC LIMIT 20');$q->execute([$user,$w['id']]);$children=$q->fetchAll();
        $w['parent_feature']=$w['parent_id']?cssv_skills_workspace($pdo,$user,$w['parent_id'])['feature']:null;
        cssv_json(['ok'=>true,'membership'=>$membership,'workspace'=>$w,'saved'=>$v,'versions'=>$versions,'has_more_versions'=>$versionMore,'operations'=>$ops,'children'=>$children,'configuration'=>cssv_skills_ai_configuration($w['feature'])]);
    }
    $feature=cssv_skills_feature($_GET['feature']??'sentence');
    $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Choose a valid saved-work page.');
    $catalogOnly=($_GET['view']??null)==='catalog';
    $history=[];$attempts=[];$more=false;
    if(!$catalogOnly){
    $q=$pdo->prepare('SELECT id,feature,lesson_id,level,version,position,updated_at FROM skills_workspaces WHERE user_id=? AND feature=? ORDER BY updated_at DESC,id DESC LIMIT 21 OFFSET '.(int)$offset);$q->execute([$user,$feature]);$history=$q->fetchAll();$more=count($history)>20;
    $q=$pdo->prepare('SELECT id,target_year FROM preparation_attempts WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 50');$q->execute([$user]);$attempts=$q->fetchAll();
    }
    $catalog=[];
    if($active){
        if($feature==='essay'){$roadmap=json_decode((string)file_get_contents(dirname(__DIR__,2).'/study-material/essay-themes.json'),true,64,JSON_THROW_ON_ERROR);foreach($roadmap['themes'] as $t)$catalog[]=['id'=>$t['slug'],'title'=>$t['name'],'level'=>null,'summary'=>$t['brief']];}
        else foreach(cssv_skills_package()['lessons'] as $l)if($l['feature']===$feature)$catalog[]=['id'=>$l['id'],'title'=>$l['title'],'level'=>$l['level'],'summary'=>$l['explanation']];
    }
    cssv_json(['ok'=>true,'membership'=>$membership,'catalog'=>$catalog,'history'=>array_slice($history,0,20),'has_more'=>$more,'attempts'=>$attempts,'configuration'=>cssv_skills_ai_configuration($feature)]);
}catch(Throwable $e){
    if($e instanceof InvalidArgumentException)cssv_fail($e->getMessage(),422,'skills_invalid');
    if($e instanceof OutOfBoundsException)cssv_fail($e->getMessage(),404,'skills_not_found');
    if($e instanceof DomainException)cssv_fail($e->getMessage(),409,'skills_conflict');
    if($e instanceof LogicException)cssv_fail($e->getMessage(),503,'skills_unavailable');
    error_log('CSSV Skills request failed: '.get_class($e));cssv_fail('Your saved learning could not be loaded or updated. Keep your draft and check the saved status.',503,'skills_unavailable');
}
