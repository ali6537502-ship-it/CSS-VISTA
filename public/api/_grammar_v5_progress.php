<?php
declare(strict_types=1);
require_once __DIR__.'/_grammar_v5.php';
/** Read-only adapter for the existing preparation planner. It never rewrites either edition. */
function cssv_gv5_planner_progress(array $state,int $now): array {
 $catalog=cssv_gv5_catalog();$concepts=array_column($catalog['concepts'],null,'id');$days=[];$questions=0;$correct=0;$due=0;
 foreach($catalog['days'] as $day)$days[$day['day']]=['day'=>$day['day'],'title'=>$day['title'],'questions'=>0,'correct'=>0,'due'=>0,'errors'=>0,'state'=>'Not studied'];
 foreach($catalog['items'] as $item){
  if($item['type']!=='objective'||!isset($state['answers'][$item['id']]))continue;
  $a=$state['answers'][$item['id']];$r=$state['reviews'][$item['id']]??null;$questions++;if($a['first']===$item['answer'])$correct++;if($r&&$r['dueAt']<=$now)$due++;
  $day=$concepts[$item['conceptId']]['day']??0;if(!isset($days[$day]))continue;$days[$day]['questions']++;
  if($a['first']===$item['answer'])$days[$day]['correct']++;
  if($r&&$r['dueAt']<=$now)$days[$day]['due']++;
  if(($a['first']!==$item['answer']||($r['lapses']??0)>0)&&($r['streak']??0)<2)$days[$day]['errors']++;
 }
 foreach($days as &$day)$day['state']=$day['errors']?'Needs review':($day['questions']?'Practising':'Not studied');unset($day);
 $completed=[];foreach($catalog['days'] as $day)if(in_array($day['id'],$state['completed'],true))$completed[]=$day['day'];
 return ['edition'=>'v5','state'=>['currentDay'=>$state['cursor']['day'],'completed'=>$completed],'profile'=>['items'=>array_values($days),'totals'=>['questions'=>$questions,'correct'=>$correct,'due'=>$due,'completed'=>count($completed)],'basis'=>'Reconstructed grammar edition: first recorded objective responses, due retrieval and study completion. Writing remains separately self-reviewed; legacy completion is not transferred into these counts.']];
}
