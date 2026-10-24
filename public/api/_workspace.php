<?php
declare(strict_types=1);
require_once __DIR__.'/_pro.php';
require_once __DIR__.'/_workspace_sources.php';

/** Read projections only. Domain APIs retain all command, edition and save authority. */
function cssv_workspace_tables(PDO $pdo): array {
    return array_fill_keys($pdo->query('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()')->fetchAll(PDO::FETCH_COLUMN),true);
}
function cssv_workspace_text(string $value,int $max=240): string {
    return mb_substr(trim(strip_tags(html_entity_decode($value,ENT_QUOTES|ENT_HTML5,'UTF-8'))),0,$max);
}
function cssv_workspace_filters(array $input): array {
    $q=$input['q']??'';$type=$input['type']??'';$view=$input['view']??'recent';
    if(!is_string($q)||!mb_check_encoding($q,'UTF-8')||mb_strlen($q)>120||preg_match('/[\x00-\x1f]/u',$q))throw new InvalidArgumentException('Search must be valid text within 120 characters.');
    if(!is_string($type)||!in_array($type,['','catalog','writing','factbook','sources','topics','skills','ability','grammar','precis','reading','handwriting','mentor'],true))throw new InvalidArgumentException('Choose a valid result type.');
    if(!is_string($view)||!in_array($view,['recent','search','review','catalog'],true))throw new InvalidArgumentException('Choose a valid workspace view.');
    $offset=filter_var($input['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>10000]]);
    if($offset===false)throw new InvalidArgumentException('Choose a valid results page.');
    $out=['q'=>trim($q),'type'=>$type,'view'=>$view,'offset'=>$offset];
    foreach(['state','course','source','from','to','collection'] as $key){
        $value=$input[$key]??'';
        if(!is_string($value)||strlen($value)>140)throw new InvalidArgumentException('Check your library filters.');
        $out[$key]=$value;
    }
    if(!in_array($out['state'],['','saved','unfinished'],true))throw new InvalidArgumentException('Choose saved work or recorded unfinished work.');
    foreach(['course','source'] as $key)if($out[$key]!==''&&!preg_match('/^[a-z0-9][a-z0-9:_.-]{0,139}$/D',$out[$key]))throw new InvalidArgumentException('Choose a valid course or source filter.');
    foreach(['from','to'] as $key)if($out[$key]!==''&&(!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$out[$key])||!checkdate((int)substr($out[$key],5,2),(int)substr($out[$key],8,2),(int)substr($out[$key],0,4))))throw new InvalidArgumentException('Choose a real date.');
    if($out['from']!==''&&$out['to']!==''&&$out['from']>$out['to'])throw new InvalidArgumentException('The end date must follow the start date.');
    if($out['collection']!==''&&!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/Di',$out['collection']))throw new InvalidArgumentException('Choose a valid personal collection.');
    return $out;
}
/** Filters apply only to already authorized projections, before counts and paging. */
function cssv_workspace_where(array $f,string $user=''): array {
    $where=['1=1'];$args=[];
    if($f['view']==='review'){$where[]='due_at IS NOT NULL AND due_at<=?';$args[]=(new DateTimeImmutable('now',new DateTimeZone('Asia/Karachi')))->format('Y-m-d');}
    if(($f['state']??'')!=='')$where[]=($f['state']==='saved'?'saved':'unfinished').'=1';
    foreach(['course'=>'course_id','source'=>'source_id'] as $filter=>$column)if(($f[$filter]??'')!==''){$where[]=$column.'=?';$args[]=$f[$filter];}
    foreach(['from'=>'>=','to'=>'<='] as $filter=>$op)if(($f[$filter]??'')!==''){$where[]='DATE(COALESCE(source_date,updated_at))'.$op.'?';$args[]=$f[$filter];}
    if(($f['collection']??'')!==''&&!($f['collections_available']??true))$where[]='0=1';
    elseif(($f['collection']??'')!==''){$where[]="domain='factbook' AND EXISTS(SELECT 1 FROM factbook_collection_entries ce WHERE ce.user_id=? AND ce.entry_id=results.id AND ce.collection_id=?)";array_push($args,$user,$f['collection']);}
    if($f['q']!==''){
        $terms=preg_split('/\s+/u',mb_strtolower(preg_replace('/[^\p{L}\p{N}:_.-]+/u',' ',$f['q'])), -1,PREG_SPLIT_NO_EMPTY);
        $terms=array_values(array_filter($terms,fn($word)=>!in_array($word,['my','the','a','an','and','about'],true)));
        if(count($terms)>8)throw new InvalidArgumentException('Search with at most eight meaningful words.');
        $matches=[];foreach($terms as $word){$matches[]='LOCATE(?,search_text)>0';$args[]=$word;}
        if($matches)$where[]='('.implode(' AND ',$matches).')';
    }
    return [implode(' AND ',$where),$args];
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
    $f['collections_available']=isset($tables['factbook_collection_entries']);
    $parts=[];$args=[];
    $add=function(string $table,string $domain,string $id,string $title,string $path,string $edition,string $evidence,string $updated,string $where='1=1',string $due='NULL',array $extra=[])use(&$parts,&$args,$user,$f,$tables):void{
        if(($table!==''&&!isset($tables[$table]))||($f['type']!==''&&$f['type']!==$domain))return;
        $columns=['id'=>$id,'title'=>$title,'domain'=>"'$domain'",'destination'=>$path,'edition'=>$edition,'evidence'=>$evidence,'updated_at'=>$updated,'due_at'=>$due,
            'course_id'=>"'$domain'",'course_title'=>"'$domain'",'source_id'=>"'$domain'",'source_title'=>"'$domain'",'source_date'=>'NULL',
            'saved'=>'0','unfinished'=>'NULL','review_reason'=>"'scheduled_recall'",'review_count'=>'0','collection_ids'=>"''",'aliases'=>"'$domain'"];
        $extra=array_replace(cssv_workspace_metadata($table,$tables),$extra);
        foreach($columns as $key=>$_)if(array_key_exists($key,$extra))$columns[$key]=$extra[$key];
        $columns['search_text']="CONCAT_WS(' ',".implode(',',[$columns['id'],$columns['title'],$columns['course_title'],$columns['source_title'],$columns['aliases']]).")";
        $select=[];foreach($columns as $alias=>$expression)$select[]="CONVERT($expression USING utf8mb4) COLLATE utf8mb4_unicode_ci $alias";
        $parts[]='SELECT '.implode(',',$select).' FROM '.($extra['_from']??"`$table` r")." WHERE r.user_id=? AND ($where)";
        array_push($args,...[...($extra['_source_args']??[]),$user,...($extra['_where_args']??[])]);
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
    $add('grammar_progress','grammar','r.attempt_id',"'English Grammar — earlier course'","CONCAT('/grammar-course?view=legacy&attempt=',r.attempt_id)","'legacy'","'Earlier-course evidence; separate from v5'",'r.updated_at');
    if($history){
        $add('skills_workspaces','skills','r.id',"COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.source_snapshot,'$.title')),r.lesson_id)","CONCAT(CASE r.feature WHEN 'sentence' THEN '/account/expression?view=studio&workspace=' WHEN 'argument' THEN '/account/argumentation?workspace=' WHEN 'analysis' THEN '/account/analytical-skills?workspace=' ELSE '/account/essay-builder?workspace=' END,r.id)",'r.source_hash',"'Guided participation and saved responses; no mastery claim'",'r.updated_at');
        $add('ability_responses','ability','r.id',"CONCAT('General Ability: ',r.unit_id,' / ',r.lesson_id)","'/account/general-ability?view=history'",'r.course_version',"CONCAT('Fixed assessment result: ',r.score,'%; open history for first/latest attempts')",'r.created_at');
        $add('handwriting_pages','handwriting','r.id','r.title',"CONCAT('/account/handwriting?page=',r.id)",'CAST(r.version AS CHAR)',"CONCAT('Handwriting state: ',r.state)",'r.updated_at');
        $add('attempt_topic_progress','topics',"CONCAT(r.attempt_id,':',r.topic_version_id)","COALESCE((SELECT JSON_UNQUOTE(JSON_EXTRACT(v.content,'$.title')) FROM pro_topic_versions v WHERE v.id=r.topic_version_id),CONVERT(r.topic_id USING utf8mb4) COLLATE utf8mb4_bin)","CONCAT('/account/preparation?view=topics&attempt=',r.attempt_id,'&topic=',r.topic_id,'&topicHistory=1')",'r.topic_version_id',"'Recorded sections, fixed checks and writing; open edition history'",'r.updated_at',$f['view']==='review'?"EXISTS(SELECT 1 FROM pro_topics t WHERE t.id=r.topic_id AND t.published_version_id=r.topic_version_id)":'1=1','r.next_revision');
    }
    if($premium)$add('mentor_answers','mentor','r.id','r.topic',"CONCAT('/account/answer-performance?attempt=',r.attempt_id,'&id=',r.id)",'CAST(r.evaluation_revision AS CHAR)',"'Student-entered external human evaluation record'",'r.updated_at');
    $add('attempt_reading_records','reading',"CONCAT(r.attempt_id,':',r.kind,':',r.source_id)","JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.title'))", "CONCAT(JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.to')),'?attempt=',r.attempt_id)",'r.source_hash',"'Saved reading / explicit recall evidence'",'r.updated_at',$premium?'1=1':"r.kind='vistagram'",'r.next_revision');
    cssv_workspace_extra_sources($pdo,$user,$f,$tables,$premium,$history,$add,$parts,$args);
    $rows=[];$more=false;$facets=['courses'=>[],'sources'=>[]];
    if($parts){
        [$where,$filterArgs]=cssv_workspace_where($f,$user);$allArgs=[...$args,...$filterArgs];
        $union='('.implode(' UNION ALL ',$parts).') results';
        $order="CASE WHEN title=? OR id=? THEN 0 WHEN ?<>'' AND LOCATE(?,aliases)>0 THEN 1 ELSE 2 END,";
        $sql='SELECT * FROM '.$union.' WHERE '.$where.' ORDER BY '.$order.($f['view']==='review'?'due_at ASC, ':'').'updated_at DESC,domain,id LIMIT 21 OFFSET '.$f['offset'];
        $q=$pdo->prepare($sql);$q->execute([...$allArgs,$f['q'],$f['q'],$f['q'],$f['q']]);$rows=$q->fetchAll();$more=count($rows)>20;$rows=array_slice($rows,0,20);
        foreach($rows as &$r){
            foreach(['title','evidence','course_title','source_title'] as $field)$r[$field]=cssv_workspace_text((string)$r[$field]);
            $r['updated_at']=cssv_pro_iso($r['updated_at']);$r['saved']=$r['saved']==='1';$r['unfinished']=$r['unfinished']===null?null:$r['unfinished']==='1';$r['review_count']=(int)$r['review_count'];
            unset($r['aliases'],$r['search_text'],$r['collection_ids']);
        }unset($r);
        // Facets use the same permission and search/state/date boundary as results.
        $facetFilters=$f;$facetFilters['course']='';$facetFilters['source']='';
        [$facetWhere,$facetArgs]=cssv_workspace_where($facetFilters,$user);
        foreach(['courses'=>['course_id','course_title'],'sources'=>['source_id','source_title']] as $kind=>[$idField,$titleField]){
            $q=$pdo->prepare('SELECT '.$idField.' id,MIN('.$titleField.') title,COUNT(*) count FROM '.$union.' WHERE '.$facetWhere.' GROUP BY '.$idField.' ORDER BY title,id LIMIT 101');$q->execute([...$args,...$facetArgs]);
            $facets[$kind]=array_map(fn($row)=>['id'=>$row['id'],'title'=>cssv_workspace_text($row['title']),'count'=>(int)$row['count']],array_slice($q->fetchAll(),0,100));
        }
    }
    $catalog=$f['view']==='catalog'?cssv_workspace_catalog($premium):[];
    if($f['view']==='catalog'&&$premium&&isset($tables['pro_topics'])){
        $q=$pdo->prepare('SELECT id,title,summary,category,published_version_id FROM pro_topics WHERE published_version_id IS NOT NULL AND (LOCATE(?,title)>0 OR id=?) ORDER BY category,id LIMIT 21 OFFSET '.$f['offset']);$q->execute([$f['q'],$f['q']]);$topics=$q->fetchAll();$more=count($topics)>20;
        foreach(array_slice($topics,0,20) as $t)$catalog[]=['id'=>$t['id'],'kind'=>'course','title'=>cssv_workspace_text($t['title']),'summary'=>cssv_workspace_text($t['summary'],600),'parentId'=>$t['category'],'subjectIds'=>['affairs'],'canonicalDestination'=>'/account/preparation?view=topics&topic='.rawurlencode($t['id']),'editionId'=>$t['published_version_id'],'accessClass'=>'pro','reviewState'=>'published_existing_edition','order'=>count($catalog),'syllabusRefs'=>[],'tags'=>[],'prerequisites'=>[],'outcomeSummary'=>cssv_workspace_text($t['summary'],600)];
    }
    $collections=[];
    if(isset($tables['factbook_collections'],$tables['factbook_collection_entries'],$tables['factbook_entries'])){
        $q=$pdo->prepare('SELECT c.id,c.name title,COUNT(e.id) count FROM factbook_collections c LEFT JOIN factbook_collection_entries ce ON ce.collection_id=c.id AND ce.user_id=c.user_id LEFT JOIN factbook_entries e ON e.id=ce.entry_id AND e.user_id=c.user_id AND e.deleted_at IS NULL AND e.archived_at IS NULL WHERE c.user_id=? GROUP BY c.id,c.name ORDER BY c.name,c.id LIMIT 100');
        $q->execute([$user]);$collections=array_map(fn($row)=>['id'=>$row['id'],'title'=>cssv_workspace_text($row['title']),'count'=>(int)$row['count']],$q->fetchAll());
    }
    return ['ok'=>true,'user_id'=>$user,'paused'=>$paused,'premium_available'=>$premium,'items'=>$rows,'catalog'=>$catalog,'has_more'=>$more,'offset'=>$f['offset'],'facets'=>$facets,'collections'=>$collections,'scope'=>'Account-owned native records. Device-only records remain in their original tools.','review_scope'=>'Scheduled topic, reading and Grammar v5 recall, plus recorded General Ability and Précis mistakes. Earlier Grammar stays in its own archive.'];
}
