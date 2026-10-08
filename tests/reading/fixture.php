<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable test database only.');
require __DIR__.'/../../public/api/_bootstrap.php';require __DIR__.'/../../public/api/_planner_mutations.php';
$pdo=cssv_db();cssv_planner_ensure($pdo);$user=cssv_pro_id($argv[2]??null);$attempt=cssv_pro_id($argv[3]??null);cssv_learning_attempt($pdo,$attempt,$user);$id='TEST-READING-'.$attempt;
if($argv[1]==='source'){
    $date='2003-04-05';$source=['id'=>$id,'category'=>'TEST ONLY reading','headline'=>'TEST ONLY dated reading source','summary'=>'TEST ONLY source-bound reading fixture.','what_happened'=>'TEST ONLY no published educational claims.','topics'=>['TEST ONLY'],'sources'=>[['publisher'=>'TEST ONLY original source','title'=>'TEST ONLY','url'=>'https://example.invalid/test-reading','published_at'=>$date]]];
    $pdo->prepare("INSERT INTO current_affairs_days(publication_date,published_at,edition,metadata,payload_hash,is_published,story_count) VALUES(?,'2003-04-05 00:00:00','TEST ONLY reading','{}',?,1,1) ON DUPLICATE KEY UPDATE is_published=1,published_at='2003-04-05 00:00:00'")->execute([$date,str_repeat('0',64)]);
    $pdo->prepare('INSERT INTO current_affairs_items(id,publication_date,category,headline,summary,content,search_text) VALUES(?,?,?,?,?,?,?)')->execute([$id,$date,$source['category'],$source['headline'],$source['summary'],json_encode($source),'TEST ONLY']);echo $id;
}elseif($argv[1]==='prior'){$snapshot=['title'=>'TEST ONLY old native reading','date'=>'2004-05-06','edition_date'=>'2003-04-05','basis'=>'TEST ONLY earlier owned declaration'];$pdo->prepare('INSERT INTO attempt_evidence_links(attempt_id,user_id,evidence_key,kind,unit_id,source_id,snapshot) VALUES(?,?,?,?,NULL,?,?)')->execute([$attempt,$user,'current_affairs:'.$id,'current_affairs',$id,json_encode($snapshot)]);}
elseif($argv[1]==='due'){$pdo->prepare('UPDATE attempt_reading_records SET next_revision=? WHERE user_id=? AND attempt_id=?')->execute([cssv_planner_day(),$user,$attempt]);}
elseif($argv[1]==='change'){$q=$pdo->prepare('SELECT content FROM current_affairs_items WHERE id=?');$q->execute([$id]);$s=json_decode($q->fetchColumn(),true);$s['summary'].=' TEST ONLY corrected';$pdo->prepare('UPDATE current_affairs_items SET content=? WHERE id=?')->execute([json_encode($s),$id]);}
elseif($argv[1]==='withdraw'){$pdo->prepare('UPDATE current_affairs_items SET active=0 WHERE id=?')->execute([$id]);}
elseif($argv[1]==='future'){$pdo->prepare('UPDATE current_affairs_days SET published_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY) WHERE publication_date=?')->execute(['2003-04-05']);}
elseif($argv[1]==='restore'){$pdo->prepare("UPDATE current_affairs_days SET published_at='2003-04-05 00:00:00' WHERE publication_date=?")->execute(['2003-04-05']);}
elseif($argv[1]==='counts'){$out=[];foreach(['attempt_reading_records','attempt_evidence_links','attempt_planner_events','ai_operations'] as $t){$q=$pdo->prepare('SELECT COUNT(*) FROM '.$t.' WHERE user_id=?');$q->execute([$user]);$out[$t]=(int)$q->fetchColumn();}echo json_encode($out);}
else throw new RuntimeException('Unknown test fixture.');
