<?php
declare(strict_types=1);
/** Existing subject mappings only; this catalog grants no academic completion credit. */
function cssv_workspace_subjects(): array {
    return ['english'=>'English','writing'=>'Writing','reasoning'=>'Reasoning','pakistan-affairs'=>'Pakistan Affairs','current-affairs'=>'Current Affairs','international-relations'=>'International Relations','political-science'=>'Political Science','environmental-science'=>'Environmental Science','english-essay'=>'English Essay'];
}
function cssv_workspace_catalog_page(PDO $pdo,bool $premium,array $tables,array $f): array {
    $subjects=cssv_workspace_subjects();$base=cssv_workspace_catalog($premium);$query=$f['q'];$subject=$f['subject']??'';
    $base=array_values(array_filter($base,fn($row)=>$query===''||mb_stripos($row['title'].' '.$row['summary'].' '.$row['id'],$query)!==false));
    $counts=array_fill_keys(array_keys($subjects),0);
    foreach($base as $row)foreach($row['subjectIds'] as $id)if(isset($counts[$id]))$counts[$id]++;
    $base=array_values(array_filter($base,fn($row)=>$subject===''||in_array($subject,$row['subjectIds'],true)));
    $topics=[];$extra=false;
    if($premium&&isset($tables['pro_topics'],$tables['pro_topic_versions'])){
        // Join only the edition currently published for this topic. No draft body,
        // answer key, section text or private source descriptor enters the catalog.
        $from=' FROM pro_topics t JOIN pro_topic_versions v ON v.id=t.published_version_id AND v.topic_id=t.id';
        $where=' WHERE t.published_version_id IS NOT NULL AND (LOCATE(?,t.title)>0 OR LOCATE(?,t.summary)>0 OR LOCATE(?,t.id)>0)';$args=[$query,$query,$query];
        $expressions=[];foreach(array_keys($subjects) as $id)$expressions[]="COALESCE(SUM(JSON_CONTAINS(JSON_EXTRACT(v.content,'$.subjects'),JSON_QUOTE(?))),0)";
        $q=$pdo->prepare('SELECT '.implode(',',$expressions).$from.$where);$q->execute([...array_keys($subjects),...$args]);$row=$q->fetch(PDO::FETCH_NUM);
        foreach(array_keys($subjects) as $index=>$id)$counts[$id]+=(int)$row[$index];
        if($subject!==''){$where.=" AND JSON_CONTAINS(JSON_EXTRACT(v.content,'$.subjects'),JSON_QUOTE(?))";$args[]=$subject;}
        $topicOffset=max(0,$f['offset']-count($base));$need=21-count(array_slice($base,$f['offset'],21));
        if($need>0){
            $q=$pdo->prepare("SELECT t.id,t.title,t.summary,t.category,t.published_version_id,JSON_EXTRACT(v.content,'$.subjects') subjects".$from.$where.' ORDER BY t.category,t.id LIMIT '.$need.' OFFSET '.$topicOffset);$q->execute($args);
            foreach($q->fetchAll() as $t){$mapped=json_decode($t['subjects']??'[]',true,8,JSON_THROW_ON_ERROR);$mapped=is_array($mapped)?array_values(array_intersect(array_keys($subjects),$mapped)):[];
                $topics[]=['id'=>$t['id'],'kind'=>'course','title'=>cssv_workspace_text($t['title']),'summary'=>cssv_workspace_text($t['summary'],600),'parentId'=>$t['category'],'subjectIds'=>$mapped,'canonicalDestination'=>'/account/preparation?view=topics&topic='.rawurlencode($t['id']),'editionId'=>$t['published_version_id'],'accessClass'=>'pro','reviewState'=>'published_existing_edition','order'=>0,'syllabusRefs'=>[],'tags'=>[],'prerequisites'=>[],'outcomeSummary'=>cssv_workspace_text($t['summary'],600)];
            }
        }
    }
    $rows=[...array_slice($base,$f['offset'],21),...$topics];$extra=count($rows)>20;$rows=array_slice($rows,0,20);
    foreach($rows as $index=>&$row)$row['order']=$f['offset']+$index;unset($row);
    $facets=[];foreach($counts as $id=>$count)$facets[]=['id'=>$id,'title'=>$subjects[$id],'count'=>$count];
    return ['catalog'=>$rows,'catalog_subjects'=>$facets,'has_more'=>$extra];
}
