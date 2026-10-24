<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';require_once __DIR__.'/../../public/api/_topics.php';require_once __DIR__.'/../topics/source.php';
$pdo=cssv_db();cssv_topics_ensure($pdo);$user=$argv[2]??'';$q=$pdo->prepare("SELECT id FROM users WHERE id=? AND email LIKE '%@example.invalid'");$q->execute([$user]);if(!$q->fetchColumn())throw new RuntimeException('Synthetic user required.');
if($argv[1]==='counts'){$out=[];foreach(['preparation_attempts','writing_records','attempt_topic_progress','attempt_topic_checks'] as $table){$q=$pdo->prepare('SELECT COUNT(*) FROM `'.$table.'` WHERE user_id=?');$q->execute([$user]);$out[$table]=(int)$q->fetchColumn();}echo json_encode($out);exit;}
if($argv[1]==='seed'){
 $prefix='test-only-catalog-'.substr(cssv_uuid_v4(),0,8);$needle='TEST ONLY catalog '.substr(cssv_uuid_v4(),0,8);$admin=$pdo->query('SELECT id FROM admin_accounts ORDER BY id LIMIT 1')->fetchColumn();if(!$admin)throw new RuntimeException('Synthetic admin fixture required.');$ids=[];$versions=[];
 for($i=0;$i<28;$i++){$id=$prefix.'-'.sprintf('%02d',$i);$definition=cssv_test_topic($id);$definition['title']=$needle.' '.sprintf('%02d',$i);$definition['summary']='TEST ONLY catalog metadata — اردو';$definition['subjects']=$i===0?['pakistan-affairs','current-affairs']:[$i%2?'current-affairs':'pakistan-affairs'];$definition=cssv_topic_definition($definition);$json=json_encode($definition,JSON_THROW_ON_ERROR);$version=cssv_uuid_v4();$pdo->prepare('INSERT INTO pro_topics(id,title,summary,category) VALUES(?,?,?,?)')->execute([$id,$definition['title'],$definition['summary'],$definition['category']]);$pdo->prepare('INSERT INTO pro_topic_versions(id,topic_id,content_hash,content,created_by) VALUES(?,?,?,?,?)')->execute([$version,$id,hash('sha256',$json),$json,$admin]);if($i<25)$pdo->prepare('UPDATE pro_topics SET published_version_id=? WHERE id=?')->execute([$version,$id]);$ids[]=$id;$versions[]=$version;}
 // An invalid cross-topic publication pointer must not expose an unrelated edition.
 $pdo->prepare('UPDATE pro_topics SET published_version_id=? WHERE id=?')->execute([$versions[0],$ids[27]]);
 echo json_encode(['needle'=>$needle,'ids'=>array_slice($ids,0,25),'excluded'=>array_slice($ids,25),'versions'=>array_slice($versions,0,25)]);exit;
}
if($argv[1]==='withdraw'){$id=$argv[3]??'';if(!str_starts_with($id,'test-only-catalog-'))throw new RuntimeException('Synthetic topic required.');$pdo->prepare('UPDATE pro_topics SET published_version_id=NULL WHERE id=?')->execute([$id]);exit;}
throw new RuntimeException('Unknown fixture action.');
