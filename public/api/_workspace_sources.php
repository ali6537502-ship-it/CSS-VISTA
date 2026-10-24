<?php
declare(strict_types=1);

/** Metadata only: never copy a lesson, draft, assessment key or provider output. */
function cssv_workspace_metadata(string $table,array $tables): array {
    return match($table){
        'writing_records'=>['saved'=>'1','course_id'=>"CONCAT('writing:',r.kind)",'course_title'=>"CONCAT('Saved ',r.kind,' writing')",'source_title'=>"'Saved writing'",'aliases'=>"CONCAT(r.kind,' draft revision writing')"],
        'factbook_entries'=>['saved'=>'1','unfinished'=>"r.revision_status<>'well-prepared'",'course_id'=>"CONCAT('factbook:',r.subject_id)",'course_title'=>"(SELECT s.name FROM factbook_subjects s WHERE s.id=r.subject_id AND s.user_id=r.user_id)",'source_title'=>"'My Factbook'",'aliases'=>"CONCAT(r.entry_type,' reference notes factbook')"],
        'grammar_learning_v5'=>['saved'=>"COALESCE(JSON_LENGTH(JSON_EXTRACT(r.state,'$.bookmarks')),0)>0",'unfinished'=>"COALESCE(JSON_LENGTH(JSON_EXTRACT(r.state,'$.completed')),0)<30",'course_id'=>"'grammar-v5'",'course_title'=>"'English Grammar — reconstructed edition'",'source_id'=>"'grammar-v5'",'source_title'=>"'Grammar v5 account evidence'",'aliases'=>"'grammar english language practice recall notes bookmarks'"],
        'grammar_progress'=>['saved'=>"COALESCE(JSON_LENGTH(JSON_EXTRACT(r.state,'$.notes')),0)>0",'course_id'=>"'grammar-legacy'",'course_title'=>"'Earlier Grammar archive'",'source_id'=>"'grammar-legacy'",'source_title'=>"'Earlier Grammar account evidence'",'aliases'=>"'earlier legacy grammar archive notes writing'"],
        'skills_workspaces'=>['saved'=>'r.writing_id IS NOT NULL','unfinished'=>"r.position<GREATEST(0,JSON_LENGTH(JSON_EXTRACT(r.source_snapshot,'$.stages'))-1)",'course_id'=>"CONCAT('skills:',r.feature)",'course_title'=>"CONCAT(r.feature,' practice')",'source_title'=>"'Guided writing'",'aliases'=>"CONCAT(r.feature,' writing practice draft revision')"],
        'ability_responses'=>['unfinished'=>'0','course_id'=>"CONCAT('ability:',r.unit_id)",'course_title'=>"REPLACE(r.unit_id,'-',' ')",'source_title'=>"'General Ability recorded assessments'",'aliases'=>"CONCAT('math maths mathematics reasoning exercise quiz ',r.unit_id,' ',r.lesson_id)"],
        'handwriting_pages'=>['saved'=>'1','unfinished'=>"r.state NOT IN ('completed','image_expired')",'course_id'=>"'handwriting'",'course_title'=>"'Handwriting'",'source_title'=>"'Your uploaded writing'",'aliases'=>"'handwritten handwriting transcript confirmed text'"],
        'attempt_topic_progress'=>['saved'=>'r.bookmarked','unfinished'=>"r.state<>'mastered'",'course_id'=>'r.topic_id','course_title'=>"COALESCE((SELECT t.title FROM pro_topics t WHERE t.id=r.topic_id),CONVERT(r.topic_id USING utf8mb4) COLLATE utf8mb4_bin)",'source_title'=>"'Affairs topic editions'",'aliases'=>"CONCAT('affairs topic lesson ',REPLACE(r.topic_id,'-',' '))"],
        'mentor_answers'=>['saved'=>'1','unfinished'=>"r.status<>'evaluated'",'course_id'=>'r.subject_id','course_title'=>"CONCAT('Mentor records: ',r.subject_id)",'source_title'=>"'Student-entered external evaluations'",'aliases'=>"'mentor marks evaluation external human feedback'"],
        'attempt_reading_records'=>['saved'=>'r.saved','unfinished'=>'r.read_date IS NULL','course_id'=>"CONCAT('reading:',r.kind)",'course_title'=>"CONCAT('Reading: ',REPLACE(r.kind,'_',' '))",'source_id'=>'r.kind','source_title'=>"REPLACE(r.kind,'_',' ')",'source_date'=>"JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.date'))",'aliases'=>"'saved reading article source recall'"],
        default=>[],
    };
}

function cssv_workspace_extra_sources(PDO $pdo,string $user,array $f,array $tables,bool $premium,bool $history,callable $add,array &$parts,array &$args): void {
    if(isset($tables['factbook_sources'],$tables['factbook_entries'])){
        $add('factbook_sources','sources','r.id',"COALESCE(NULLIF(r.title,''),NULLIF(r.author_organization,''),'Personal source reference')", "CONCAT('/factbook?entry=',r.entry_id)",'NULL',"'Source attached to your personal entry; external claims are not independently verified'",'r.created_at',
            "EXISTS(SELECT 1 FROM factbook_entries e WHERE e.id=r.entry_id AND e.user_id=r.user_id AND e.deleted_at IS NULL AND e.archived_at IS NULL)",'NULL',
            ['saved'=>'1','course_id'=>"(SELECT CONCAT('factbook:',e.subject_id) FROM factbook_entries e WHERE e.id=r.entry_id AND e.user_id=r.user_id)",'course_title'=>"(SELECT s.name FROM factbook_entries e JOIN factbook_subjects s ON s.id=e.subject_id AND s.user_id=e.user_id WHERE e.id=r.entry_id AND e.user_id=r.user_id)",'source_id'=>"'factbook'",'source_title'=>"'My Factbook sources'",'source_date'=>'r.accessed_on','aliases'=>"CONCAT('source reference ',r.author_organization,' ',r.publication_year)"]);
    }
    // The owning Current Affairs API requires active Pro even for personal saves.
    if($premium&&isset($tables['current_affairs_user_items'],$tables['current_affairs_items'],$tables['current_affairs_days'])){
        $add('current_affairs_user_items','reading',"CONCAT('ca:',r.item_id)",'i.headline',"CONCAT('/account/current-affairs/',r.item_id)",'d.payload_hash',"CONCAT('Personal reading status: ',r.status,'; saved: ',IF(r.saved=1,'yes','no'))","GREATEST(COALESCE(r.completed_at,d.published_at),COALESCE(r.last_opened_at,d.published_at),COALESCE(r.saved_at,d.published_at),COALESCE(r.first_opened_at,d.published_at))",
            "i.active=1 AND d.is_published=1 AND d.published_at<=UTC_TIMESTAMP(6) AND (r.saved=1 OR r.status<>'unread')",'NULL',
            ['_from'=>'current_affairs_user_items r JOIN current_affairs_items i ON i.id=r.item_id JOIN current_affairs_days d ON d.publication_date=i.publication_date','saved'=>'r.saved','unfinished'=>"r.status<>'read'",'course_id'=>"'current-affairs'",'course_title'=>"'Current Affairs'",'source_id'=>"'current-affairs'",'source_title'=>"'Current Affairs personal saves'",'source_date'=>'i.publication_date','aliases'=>"CONCAT('current affairs article development ',i.category)"]);
    }
    if(isset($tables['grammar_learning_v5'])){
        $now=(string)(int)floor(microtime(true)*1000);
        $due="(SELECT MIN(j.due) FROM JSON_TABLE(r.state,'$.reviews.*' COLUMNS(due BIGINT PATH '$.dueAt' NULL ON EMPTY)) j WHERE j.due<=$now)";
        $count="(SELECT COUNT(*) FROM JSON_TABLE(r.state,'$.reviews.*' COLUMNS(due BIGINT PATH '$.dueAt' NULL ON EMPTY)) j WHERE j.due<=$now)";
        // Replace the ordinary progress row with one course/attempt reminder in Review.
        if($f['view']==='review')$add('grammar_learning_v5','grammar','r.attempt_id',"'English Grammar — scheduled retrieval'","CONCAT('/grammar-course?edition=v5&view=lab&mode=due&attempt=',r.attempt_id)","'v5'", "CONCAT($count,' scheduled retrieval items. First/latest responses and writing remain separate.')",'r.updated_at',"$due IS NOT NULL","DATE(FROM_UNIXTIME($due/1000+18000))",['review_count'=>$count]);
    }
    if($premium&&isset($tables['ability_responses'],$tables['ability_positions'])&&($f['view']==='review'||($f['state']??'')==='unfinished')&&in_array($f['type'],['','ability'],true)){
        require_once __DIR__.'/_ability_evidence.php';
        $evidence=cssv_ability_evidence($pdo,$user);
        $ids=array_column($evidence['latest_review'],'response_id');$dates=[];
        if($ids){$q=$pdo->prepare('SELECT id,created_at FROM ability_responses WHERE user_id=? AND id IN ('.implode(',',array_fill(0,count($ids),'?')).')');$q->execute([$user,...$ids]);$dates=$q->fetchAll(PDO::FETCH_KEY_PAIR);}
        foreach($evidence['latest_review'] as $r){
            $from='(SELECT ? user_id,? id,? title,? destination,? edition,? updated_at,? missed,? course_id) r';
            $add('','ability','r.id','r.title','r.destination','r.edition',"CONCAT('Latest recorded response has ',r.missed,' incorrect answer(s). Review the method; first-attempt evidence is unchanged.')",'r.updated_at','1=1',"DATE(DATE_ADD(r.updated_at,INTERVAL 5 HOUR))",
                ['_from'=>$from,'_source_args'=>[$user,'review:'.$r['response_id'],'General Ability — '.$r['title'],'/account/general-ability?'.http_build_query(['unit'=>$r['unit_id'],'lesson'=>$r['lesson_id']]),$evidence['course_version'],$dates[$r['response_id']],$r['missed'],'ability:'.$r['unit_id']],'unfinished'=>'1','course_id'=>'r.course_id','course_title'=>'r.title','source_id'=>"'ability'",'source_title'=>"'General Ability current compatible evidence'",'review_reason'=>"'unresolved_mistake'",'review_count'=>'r.missed','aliases'=>"'math maths mathematics reasoning review mistakes'"]);
        }
    }
    if($premium&&isset($tables['precis_responses'])&&($f['view']==='review'||($f['state']??'')==='unfinished')){
        require_once __DIR__.'/_precis_questions.php';
        $case='CASE p.question_id';foreach(cssv_precis_questions() as $id=>$question)$case.=' WHEN '.$pdo->quote($id).' THEN '.(int)$question['answer'];$case.=' ELSE -1 END';
        $from="(SELECT user_id,attempt_id,MAX(created_at) updated_at,COUNT(*) review_count,MIN(CASE WHEN choice<>expected THEN created_at ELSE DATE_ADD(last_wrong,INTERVAL 3 DAY) END) review_due FROM (SELECT p.*, $case expected, MAX(CASE WHEN p.choice<>$case THEN p.created_at END) OVER(PARTITION BY p.attempt_id,p.question_id) last_wrong,ROW_NUMBER() OVER(PARTITION BY p.attempt_id,p.question_id ORDER BY p.created_at DESC,p.id DESC) last_row FROM precis_responses p WHERE p.user_id=?) sampled WHERE last_row=1 AND expected>=0 AND (choice<>expected OR (last_wrong IS NOT NULL AND created_at<DATE_ADD(last_wrong,INTERVAL 3 DAY))) GROUP BY user_id,attempt_id) r";
        $add('precis_responses','precis','r.attempt_id',"'Précis — fixed-drill review'","CONCAT('/account/precis?view=review&attempt=',r.attempt_id)","'retained-drill-ids'", "CONCAT(r.review_count,' unresolved fixed drills. Recognition evidence only; not a score for free writing.')",'r.updated_at',$f['view']==='review'?'r.review_due<=UTC_TIMESTAMP(6)':'1=1',"DATE(DATE_ADD(r.review_due,INTERVAL 5 HOUR))",['_from'=>$from,'_source_args'=>[$user],'unfinished'=>'1','course_id'=>"'precis'",'course_title'=>"'Précis'",'source_id'=>"'precis'",'source_title'=>"'Précis fixed-drill evidence'",'review_reason'=>"'fixed_drill_review'",'review_count'=>'r.review_count','aliases'=>"'precis précis compression fidelity review mistakes'"]);
    }
    if($f['view']==='search'&&in_array($f['type'],['','catalog'],true)){
        $aliases=['grammar-v5'=>'english grammar rules tenses language','ability'=>'math maths mathematics quantitative reasoning','sentence'=>'sentence structure expression improvement','argument'=>'argument argumentation reasoning claims evidence','analysis'=>'analysis analytical skills','essay'=>'essay essays themes outline thesis','precis'=>'precis précis summary compression fidelity'];
        foreach(cssv_workspace_catalog($premium) as $course){
            $add('','catalog','r.id','r.title','r.destination','r.edition',"'Course metadata; opening gives no study credit'","'1970-01-01 00:00:00'",'1=1','NULL',['_from'=>'(SELECT ? user_id,? id,? title,? destination,? edition,? aliases) r','_source_args'=>[$user,$course['id'],$course['title'],$course['canonicalDestination'],$course['editionId'],$aliases[$course['id']]??$course['title']],'course_id'=>'r.id','course_title'=>'r.title','source_id'=>"'catalog'",'source_title'=>"'Course catalog'",'aliases'=>'r.aliases']);
        }
        if($premium&&isset($tables['pro_topics']))$add('pro_topics','catalog','r.id','r.title',"CONCAT('/account/preparation?view=topics&topic=',r.id)",'r.published_version_id',"'Published course metadata; existing edition'",'r.updated_at','r.published_version_id IS NOT NULL','NULL',['_from'=>'(SELECT t.*,? user_id FROM pro_topics t) r','_source_args'=>[$user],'course_id'=>'r.id','course_title'=>'r.title','source_id'=>"'catalog'",'source_title'=>"'Affairs course catalog'",'aliases'=>"CONCAT('affairs ',r.category,' ',REPLACE(r.id,'-',' '))"]);
    }
}
