<?php
declare(strict_types=1);
function cssv_daily_study_catalog(PDO $pdo,string $course,int $offset): array {
 $static=[];
 foreach([
  ['grammar-v5','English Grammar','/grammar-course','Study a concept, try examples and inspect fixed checks.'],
  ['sentence','Sentence Studio','/account/expression?view=studio','Guided sentence practice and saved revisions.'],
  ['expression-guide','English Expression Guide','/account/expression?view=guide','Read the guide and apply a writing technique.'],
  ['argument','Argumentation','/account/argumentation','Develop claims, reasons, evidence and counterarguments.'],
  ['analysis','Analysis','/account/analytical-skills','Explore mechanisms, alternatives and qualified conclusions.'],
  ['essay','Essay Builder','/account/essay-builder','Build a theme, thesis, outline and independent draft.'],
  ['precis','Précis Mentor','/account/precis','Practise source-bound compression and inspect checks.'],
  ['gsa-tutor','GSA Tutor','/account/gsa-tutor','Work through the separate free GSA learning tool.'],
 ] as [$id,$title,$destination,$summary])if($course===''||$course===$id)$static[]=['id'=>$id,'title'=>$title,'summary'=>$summary,'canonicalDestination'=>$destination,'editionId'=>$id==='grammar-v5'?'v5':null];
 $rows=array_slice($static,$offset,21);$need=21-count($rows);
 if($need>0){
  $sql='SELECT t.id,t.title,t.summary,t.published_version_id FROM pro_topics t JOIN pro_topic_versions v ON v.id=t.published_version_id AND v.topic_id=t.id WHERE t.published_version_id IS NOT NULL';$args=[];
  if($course!==''){$sql.=' AND t.id=?';$args[]=$course;}
  $q=$pdo->prepare($sql.' ORDER BY t.category,t.title,t.id LIMIT '.$need.' OFFSET '.max(0,$offset-count($static)));$q->execute($args);
  foreach($q->fetchAll() as $row)$rows[]=['id'=>$row['id'],'title'=>mb_substr(strip_tags($row['title']),0,200),'summary'=>mb_substr(strip_tags($row['summary']),0,600),'canonicalDestination'=>'/account/preparation?view=topics&topic='.rawurlencode($row['id']),'editionId'=>$row['published_version_id']];
 }
 return ['catalog'=>array_slice($rows,0,20),'has_more'=>count($rows)>20,'offset'=>$offset];
}
