<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
require_once __DIR__.'/../../public/api/_grammar_v5.php';
require_once __DIR__.'/../../public/api/_grammar.php';
require_once __DIR__.'/../../public/api/_ability.php';
require_once __DIR__.'/../../public/api/_precis.php';
require_once __DIR__.'/../../public/api/_mentor.php';
require_once __DIR__.'/../../public/api/_current_affairs.php';
$pdo=cssv_db();$action=$argv[1]??'';$user=$argv[2]??'';
$q=$pdo->prepare("SELECT id FROM users WHERE id=? AND email LIKE '%@example.invalid'");$q->execute([$user]);if(!$q->fetchColumn())throw new RuntimeException('Synthetic account required.');
if($action==='seed'){
    cssv_learning_ensure($pdo);cssv_gv5_ensure($pdo);cssv_grammar_ensure($pdo);cssv_ability_ensure($pdo);cssv_precis_ensure($pdo);cssv_mentor_ensure($pdo);ca_ensure_schema($pdo);
    $attempt=cssv_uuid_v4();$pdo->prepare("INSERT INTO preparation_attempts(id,user_id,target_year,optional_subject_ids,daily_minutes,stage) VALUES(?,?,2027,'[]',45,'starting')")->execute([$attempt,$user]);
    $titles=['Climate adaptation policy outline','Federalism essay revision','Water governance argument draft','Education reform précis draft','Inflation evidence paragraph','Sentence repair reflection'];$writing=[];
    foreach($titles as $index=>$title){$id=cssv_uuid_v4();$writing[$index]=$id;$pdo->prepare("INSERT INTO writing_records(id,user_id,attempt_id,kind,title,version,created_at,updated_at) VALUES(?,?,?,'paragraph',?,1,'2026-01-10','2026-01-10')")->execute([$id,$user,$attempt,$title]);$text='TEST ONLY private original response '.$index.' — اردو';$pdo->prepare('INSERT INTO writing_versions(id,writing_id,version,text,text_hash,word_count) VALUES(?,?,1,?,?,8)')->execute([cssv_uuid_v4(),$id,$text,hash('sha256',$text)]);}
    $catalog=cssv_gv5_catalog();$objective=array_values(array_filter($catalog['items'],fn($i)=>$i['type']==='objective'));$concept=$catalog['concepts'][0]['id'];$now=(int)floor(microtime(true)*1000);
    $state=['curriculumVersion'=>$catalog['version'],'completed'=>[],'studied'=>[],'answers'=>[],'drafts'=>[],'selfReviews'=>[],'revealed'=>[],'notes'=>[$concept=>'TEST ONLY PRIVATE_GRAMMAR_NOTE'],'bookmarks'=>[$concept],'reviews'=>[],'cursor'=>['day'=>1,'section'=>'orientation','item'=>''],'checks'=>[]];
    foreach(array_slice($objective,0,2) as $n=>$item){$state['answers'][$item['id']]=['first'=>0,'firstAt'=>$now-100000,'latest'=>0,'latestAt'=>$now-10000,'exposures'=>1];$state['reviews'][$item['id']]=['lastAt'=>$now-10000,'dueAt'=>$n===0?$now-1:$now+3600000,'streak'=>0,'lapses'=>1];}
    $state=cssv_gv5_state($state);$pdo->prepare('INSERT INTO grammar_learning_v5(attempt_id,user_id,version,state) VALUES(?,?,1,?)')->execute([$attempt,$user,json_encode($state,JSON_THROW_ON_ERROR)]);
    $legacy=cssv_grammar_state(['completed'=>[1],'scores'=>[],'mistakes'=>[],'notes'=>['1'=>'TEST ONLY PRIVATE_LEGACY_NOTE'],'currentDay'=>1,'sessions'=>[],'attempts'=>[],'lab'=>null,'labHistory'=>[],'reviews'=>[]]);
    $pdo->prepare("INSERT INTO grammar_progress(attempt_id,user_id,version,state,evidence) VALUES(?,?,1,?,'{}')")->execute([$attempt,$user,json_encode($legacy,JSON_THROW_ON_ERROR)]);
    $unit=cssv_ability_course()['units'][0];$lesson=$unit['lessons'][0];$feedback=cssv_ability_exercise($lesson,'-999999');if($feedback['correct'])throw new RuntimeException('Wrong fixture was not wrong.');$ability=cssv_uuid_v4();
    $pdo->prepare("INSERT INTO ability_responses(id,user_id,course_version,unit_id,mode,lesson_id,score,result,created_at) VALUES(?,?,?,?,'exercise',?,0,?,DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 5 DAY))")->execute([$ability,$user,cssv_ability_course()['version'],$unit['id'],$lesson['id'],json_encode(['feedback'=>$feedback],JSON_THROW_ON_ERROR)]);
    $questions=cssv_precis_questions();$question=array_key_first($questions);$wrong=($questions[$question]['answer']+1)%count($questions[$question]['options']);$precis=cssv_uuid_v4();
    $pdo->prepare('INSERT INTO precis_responses(id,user_id,attempt_id,question_id,choice,created_at) VALUES(?,?,?,?,?,DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 5 DAY))')->execute([$precis,$user,$attempt,$question,$wrong]);
    // A recent corrected retry remains unfinished until its spacing date, but is not due yet.
    $second=array_keys($questions)[1];$wrongSecond=($questions[$second]['answer']+1)%count($questions[$second]['options']);
    $pdo->prepare('INSERT INTO precis_responses(id,user_id,attempt_id,question_id,choice,created_at) VALUES(?,?,?,?,?,DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 DAY))')->execute([cssv_uuid_v4(),$user,$attempt,$second,$wrongSecond]);
    $pdo->prepare('INSERT INTO precis_responses(id,user_id,attempt_id,question_id,choice) VALUES(?,?,?,?,?)')->execute([cssv_uuid_v4(),$user,$attempt,$second,$questions[$second]['answer']]);
    $day='2002-03-04';$pdo->prepare("INSERT IGNORE INTO current_affairs_days(publication_date,published_at,edition,metadata,payload_hash,is_published,story_count) VALUES(?,'2002-03-04','TEST ONLY retrieval edition','{}',?,1,3)")->execute([$day,hash('sha256','TEST ONLY retrieval')]);$stories=[];
    foreach(['visible','withdrawn','future'] as $status){$id='test-only-retrieval-'.str_replace('-','',cssv_uuid_v4());$stories[$status]=$id;$storyDay=$status==='future'?'2099-02-03':$day;
        if($status==='future')$pdo->prepare("INSERT IGNORE INTO current_affairs_days(publication_date,published_at,edition,metadata,payload_hash,is_published,story_count) VALUES(?,'2099-02-03','TEST ONLY future edition','{}',?,1,1)")->execute([$storyDay,hash('sha256','TEST ONLY future')]);
        $pdo->prepare('INSERT INTO current_affairs_items(id,publication_date,category,headline,summary,content,search_text,active) VALUES(?,?,?,?,?,?,?,?)')->execute([$id,$storyDay,'TEST ONLY','TEST ONLY Climate finance briefing '.$status,'TEST ONLY',json_encode(['private_marker'=>'PRIVATE_CA_BODY_NEVER_SEARCHED'],JSON_THROW_ON_ERROR),'TEST ONLY',$status==='withdrawn'?0:1]);
        $pdo->prepare("INSERT INTO current_affairs_user_items(user_id,item_id,saved,status,saved_at,last_opened_at) VALUES(?,?,1,'opened',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")->execute([$user,$id]);
    }
    $subject=cssv_uuid_v4();$entry=cssv_uuid_v4();$source=cssv_uuid_v4();$collection=cssv_uuid_v4();
    $pdo->prepare("INSERT INTO factbook_subjects(id,user_id,name,created_at,updated_at) VALUES(?,?,'TEST ONLY Economics references',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")->execute([$subject,$user]);
    $pdo->prepare("INSERT INTO factbook_entries(id,user_id,subject_id,title,entry_type,content,importance,revision_status,bookmarked,personal_remarks,search_text,created_at,updated_at) VALUES(?,?,?,'Budget evidence notes','rich-note',?,'normal','learning',1,'','',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")->execute([$entry,$user,$subject,json_encode(['html'=>'<p>TEST ONLY PRIVATE_FACTBOOK_BODY</p>'])]);
    $pdo->prepare("INSERT INTO factbook_sources(id,user_id,entry_id,title,author_organization,publication_year,page_number,web_address,accessed_on,verification_note,position,created_at,updated_at) VALUES(?,?,?,'Fiscal statistics reference','TEST ONLY source','2026','','https://example.invalid/reference','2026-01-12','PRIVATE_SOURCE_NOTE_NEVER_SEARCHED',0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")->execute([$source,$user,$entry]);
    $pdo->prepare("INSERT INTO factbook_collections(id,user_id,name,created_at,updated_at) VALUES(?,?,'TEST ONLY Essay evidence',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")->execute([$collection,$user]);
    $pdo->prepare('INSERT INTO factbook_collection_entries(user_id,collection_id,entry_id,position,created_at) VALUES(?,?,?,0,UTC_TIMESTAMP(6))')->execute([$user,$collection,$entry]);
    echo json_encode(['attempt'=>$attempt,'writing'=>$writing,'grammar_item'=>$objective[0]['id'],'ability_response'=>$ability,'ability_unit'=>$unit['id'],'ability_lesson'=>$lesson['id'],'precis_response'=>$precis,'precis_question'=>$question,'stories'=>$stories,'factbook'=>$entry,'source'=>$source,'subject'=>$subject,'collection'=>$collection]);
}elseif($action==='resolve'){
    $data=json_decode($argv[3],true,16,JSON_THROW_ON_ERROR);$unit=cssv_ability_unit($data['ability_unit']);$lesson=cssv_ability_lesson($unit,$data['ability_lesson']);$feedback=cssv_ability_exercise($lesson,(string)$lesson['exercise']['answer']);
    if(!$feedback['correct'])throw new RuntimeException('Fixture correction did not grade correctly.');
    $pdo->prepare("INSERT INTO ability_responses(id,user_id,course_version,unit_id,mode,lesson_id,score,result) VALUES(?,?,?,?,'exercise',?,100,?)")->execute([cssv_uuid_v4(),$user,cssv_ability_course()['version'],$unit['id'],$lesson['id'],json_encode(['feedback'=>$feedback],JSON_THROW_ON_ERROR)]);
    $question=cssv_precis_questions()[$data['precis_question']];$pdo->prepare('INSERT INTO precis_responses(id,user_id,attempt_id,question_id,choice) VALUES(?,?,?,?,?)')->execute([cssv_uuid_v4(),$user,$data['attempt'],$data['precis_question'],$question['answer']]);
}elseif($action==='digest'){
    $all=[];foreach(['preparation_attempts','writing_records','grammar_progress','grammar_learning_v5','ability_responses','ability_positions','precis_responses','current_affairs_user_items','factbook_entries','factbook_sources','factbook_collections','factbook_collection_entries'] as $table){$q=$pdo->prepare('SELECT * FROM `'.$table.'` WHERE user_id=? ORDER BY 1');$q->execute([$user]);$all[$table]=$q->fetchAll();}
    echo hash('sha256',json_encode($all,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE));
}else throw new RuntimeException('Unknown retrieval fixture.');
