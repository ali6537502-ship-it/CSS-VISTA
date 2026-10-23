<?php
declare(strict_types=1);
require_once __DIR__.'/_pro.php';

/** Read projections only. Domain APIs retain all command, edition and save authority. */
function cssv_workspace_tables(PDO $pdo): array {
    return array_fill_keys($pdo->query('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()')->fetchAll(PDO::FETCH_COLUMN),true);
}
function cssv_workspace_text(string $value,int $max=240): string {
    return mb_substr(trim(html_entity_decode(strip_tags($value),ENT_QUOTES|ENT_HTML5,'UTF-8')),0,$max);
}
function cssv_workspace_filters(array $input): array {
    $q=$input['q']??'';$type=$input['type']??'';$view=$input['view']??'recent';
    if(!is_string($q)||mb_strlen($q)>120||preg_match('/[\x00-\x1f]/u',$q))throw new InvalidArgumentException('Search must be at most 120 characters.');
    if(!is_string($type)||!in_array($type,['','catalog','writing','factbook','topics','skills','ability','grammar','reading','handwriting','mentor'],true))throw new InvalidArgumentException('Choose a valid result type.');
    if(!is_string($view)||!in_array($view,['recent','search','review','catalog'],true))throw new InvalidArgumentException('Choose a valid workspace view.');
    $offset=filter_var($input['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>10000]]);
    if($offset===false)throw new InvalidArgumentException('Choose a valid results page.');
    return ['q'=>trim($q),'type'=>$type,'view'=>$view,'offset'=>$offset];
}
function cssv_workspace_catalog(bool $premium): array {
    $rows=[['id'=>'grammar-v5','kind'=>'course','title'=>'English Grammar','summary'=>'Concepts, worked examples, practice and self-review.','parentId'=>'language','subjectIds'=>['english'],'canonicalDestination'=>'/grammar-course','accessClass'=>'free','reviewState'=>'existing_edition','editionId'=>'v5']];
    if($premium)foreach([
        ['ability','General Ability','/account/general-ability','reasoning'],
        ['sentence','Sentence Studio','/account/expression?view=studio','writing'],
        ['argument','Argumentation','/account/argumentation','writing'],
        ['analysis','Analysis','/account/analytical-skills','writing'],
        ['essay','Essays','/account/essay-builder','writing'],
        ['precis','Précis','/account/precis','writing'],
    ] as [$id,$title,$to,$parent])$rows[]=['id'=>$id,'kind'=>'course','title'=>$title,'summary'=>'Open existing lessons and saved practice.','parentId'=>$parent,'subjectIds'=>[$parent],'canonicalDestination'=>$to,'accessClass'=>'pro','reviewState'=>'academic_review_required','editionId'=>null];
    foreach($rows as $order=>&$r)$r+=['order'=>$order,'syllabusRefs'=>[],'tags'=>[],'prerequisites'=>[],'outcomeSummary'=>$r['summary']];unset($r);
    return $rows;
}
function cssv_workspace_project(PDO $pdo,string $user,array $f): array {
    $tables=cssv_workspace_tables($pdo);$paused=cssv_pro_release_paused();
    $membership=isset($tables['pro_memberships'])?cssv_pro_membership($pdo,$user):['status'=>'free'];
    $premium=!$paused&&$membership['status']==='active';
    $history=!$paused&&in_array($membership['status'],['active','expired'],true);
    $parts=[];$args=[];
    // Only fixed server-defined SQL enters this builder. All values are bound.
    $add=function(string $table,string $domain,string $id,string $title,string $path,string $edition,string $evidence,string $updated,string $where='1=1',string $due='NULL',array $values=[])use(&$parts,&$args,$user,$f,$tables):void{
        if(!isset($tables[$table])||($f['type']!==''&&$f['type']!==$domain))return;
        $columns=['id'=>$id,'title'=>$title,'domain'=>"'$domain'",'destination'=>$path,'edition'=>$edition,'evidence'=>$evidence,'updated_at'=>$updated,'due_at'=>$due];
        $select=[];foreach($columns as $alias=>$expression)$select[]="CONVERT($expression USING utf8mb4) COLLATE utf8mb4_unicode_ci $alias";
        $parts[]='SELECT '.implode(',',$select)." FROM `$table` r WHERE r.user_id=? AND ($where)";
        array_push($args,$user,...$values);
    };
    // Generic writing remains readable, but premium-derived writing must not
    // reappear during pause through its shared writing_records projection.
    $exclude='';
    if(!$history){
        $exclude="r.kind<>'precis'";
        foreach(['skills_workspaces','handwriting_pages','topic_writing_bindings'] as $table)if(isset($tables[$table]))$exclude.=" AND NOT EXISTS(SELECT 1 FROM `$table` x WHERE x.writing_id=r.id AND x.user_id=r.user_id)";
    }
    if(isset($tables['topic_writing_bindings']))$exclude=($exclude?$exclude.' AND ':'')."NOT EXISTS(SELECT 1 FROM topic_writing_bindings b WHERE b.writing_id=r.id AND b.user_id=r.user_id)";
    $add('writing_records','writing','r.id','r.title',"CONCAT('/account/preparation?writing=',r.id)",'CAST(r.version AS CHAR)',"'Writing saved; versions retained'",'r.updated_at',$exclude?:'1=1');
    $add('factbook_entries','factbook','r.id','r.title',"CONCAT('/factbook?entry=',r.id)",'NULL',"'Personal reference; verification is student-entered'",'r.updated_at','r.deleted_at IS NULL AND r.archived_at IS NULL');
    $add('grammar_learning_v5','grammar','r.attempt_id',"'English Grammar — reconstructed edition'","CONCAT('/grammar-course?edition=v5&attempt=',r.attempt_id)","'v5'","'Recorded responses and self-review; open course for first/latest evidence'",'r.updated_at');
    $add('grammar_progress','grammar','r.attempt_id',"'English Grammar — earlier course'","CONCAT('/grammar-course?edition=legacy&attempt=',r.attempt_id)","'legacy'","'Earlier-course evidence; separate from v5'",'r.updated_at');
    if($history){
        $add('skills_workspaces','skills','r.id',"COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.source_snapshot,'$.title')),r.lesson_id)","CONCAT(CASE r.feature WHEN 'sentence' THEN '/account/expression?view=studio&workspace=' WHEN 'argument' THEN '/account/argumentation?workspace=' WHEN 'analysis' THEN '/account/analytical-skills?workspace=' ELSE '/account/essay-builder?workspace=' END,r.id)",'r.source_hash',"'Guided participation and saved responses; no mastery claim'",'r.updated_at');
        $add('ability_responses','ability','r.id',"CONCAT('General Ability: ',r.unit_id,' / ',r.lesson_id)","'/account/general-ability?view=history'",'r.course_version',"CONCAT('Fixed assessment result: ',r.score,'%; open history for first/latest attempts')",'r.created_at');
        $add('handwriting_pages','handwriting','r.id','r.title',"CONCAT('/account/handwriting?page=',r.id)",'CAST(r.version AS CHAR)',"CONCAT('Handwriting state: ',r.state)",'r.updated_at');
        $add('attempt_topic_progress','topics',"CONCAT(r.attempt_id,':',r.topic_version_id)","COALESCE((SELECT JSON_UNQUOTE(JSON_EXTRACT(v.content,'$.title')) FROM pro_topic_versions v WHERE v.id=r.topic_version_id),CONVERT(r.topic_id USING utf8mb4) COLLATE utf8mb4_bin)","CONCAT('/account/preparation?view=topics&attempt=',r.attempt_id,'&topic=',r.topic_id,'&topicHistory=1')",'r.topic_version_id',"'Recorded sections, fixed checks and writing; open edition history'",'r.updated_at','1=1','r.next_revision');
    }
    if($premium)$add('mentor_answers','mentor','r.id','r.topic',"CONCAT('/account/answer-performance?attempt=',r.attempt_id,'&id=',r.id)",'CAST(r.evaluation_revision AS CHAR)',"'Student-entered external human evaluation record'",'r.updated_at');
    $add('attempt_reading_records','reading',"CONCAT(r.attempt_id,':',r.kind,':',r.source_id)","JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.title'))", "CONCAT(JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.to')),'?attempt=',r.attempt_id)",'r.source_hash',"'Saved reading / explicit recall evidence'",'r.updated_at',$premium?'1=1':"r.kind='vistagram'",'r.next_revision');
    if($f['view']==='search'&&in_array($f['type'],['','catalog'],true)){
        foreach(cssv_workspace_catalog($premium) as $course){
            $parts[]="SELECT CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci id,CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci title,'catalog' COLLATE utf8mb4_unicode_ci domain,CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci destination,CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci edition,'Course metadata; no study credit from opening' COLLATE utf8mb4_unicode_ci evidence,'1970-01-01 00:00:00' COLLATE utf8mb4_unicode_ci updated_at,NULL due_at";
            array_push($args,$course['id'],$course['title'],$course['canonicalDestination'],$course['editionId']);
        }
        if($premium&&isset($tables['pro_topics']))$parts[]="SELECT CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci id,CONVERT(title USING utf8mb4) COLLATE utf8mb4_unicode_ci title,'catalog' COLLATE utf8mb4_unicode_ci domain,CONVERT(CONCAT('/account/preparation?view=topics&topic=',id) USING utf8mb4) COLLATE utf8mb4_unicode_ci destination,CONVERT(published_version_id USING utf8mb4) COLLATE utf8mb4_unicode_ci edition,'Published course metadata; existing edition' COLLATE utf8mb4_unicode_ci evidence,CONVERT(updated_at USING utf8mb4) COLLATE utf8mb4_unicode_ci updated_at,NULL due_at FROM pro_topics WHERE published_version_id IS NOT NULL";
    }
    $rows=[];$more=false;
    if($parts){
        $where='1=1';
        if($f['view']==='review')$where="due_at IS NOT NULL AND due_at<=?";
        if($f['view']==='review')$args[]=(new DateTimeImmutable('now',new DateTimeZone('Asia/Karachi')))->format('Y-m-d');
        if($f['q']!==''){$where.=" AND (LOCATE(?,title)>0 OR id=?)";array_push($args,$f['q'],$f['q']);}
        $sql='SELECT * FROM ('.implode(' UNION ALL ',$parts).') results WHERE '.$where.' ORDER BY CASE WHEN title=? OR id=? THEN 0 ELSE 1 END, '.($f['view']==='review'?'due_at ASC, ':'').'updated_at DESC,domain,id LIMIT 21 OFFSET '.$f['offset'];
        array_push($args,$f['q'],$f['q']);$q=$pdo->prepare($sql);$q->execute($args);$rows=$q->fetchAll();$more=count($rows)>20;$rows=array_slice($rows,0,20);
        foreach($rows as &$r){$r['title']=cssv_workspace_text((string)$r['title']);$r['evidence']=cssv_workspace_text($r['evidence']);$r['updated_at']=cssv_pro_iso($r['updated_at']);}unset($r);
    }
    $catalog=$f['view']==='catalog'?cssv_workspace_catalog($premium):[];
    if($f['view']==='catalog'&&$premium&&isset($tables['pro_topics'])){
        $q=$pdo->prepare('SELECT id,title,summary,category,published_version_id FROM pro_topics WHERE published_version_id IS NOT NULL AND (LOCATE(?,title)>0 OR id=?) ORDER BY category,id LIMIT 21 OFFSET '.$f['offset']);$q->execute([$f['q'],$f['q']]);$topics=$q->fetchAll();$more=count($topics)>20;
        foreach(array_slice($topics,0,20) as $t)$catalog[]=['id'=>$t['id'],'kind'=>'course','title'=>cssv_workspace_text($t['title']),'summary'=>cssv_workspace_text($t['summary'],600),'parentId'=>$t['category'],'subjectIds'=>['affairs'],'canonicalDestination'=>'/account/preparation?view=topics&topic='.rawurlencode($t['id']),'editionId'=>$t['published_version_id'],'accessClass'=>'pro','reviewState'=>'published_existing_edition','order'=>count($catalog),'syllabusRefs'=>[],'tags'=>[],'prerequisites'=>[],'outcomeSummary'=>cssv_workspace_text($t['summary'],600)];
    }
    return ['ok'=>true,'user_id'=>$user,'paused'=>$paused,'premium_available'=>$premium,'items'=>$rows,'catalog'=>$catalog,'has_more'=>$more,'offset'=>$f['offset'],'scope'=>'Account-owned native records. Device-only records remain in their original tools.','review_scope'=>'Due topic and reading schedules. Other domains retain their own evidence review.'];
}
