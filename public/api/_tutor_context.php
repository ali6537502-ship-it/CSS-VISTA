<?php
declare(strict_types=1);
require_once __DIR__.'/_tutor_core.php';
require_once __DIR__.'/_precis_core.php';
require_once __DIR__.'/_current_affairs.php';
function cssv_tutor_static_contexts(): array {
 static $contexts=null;if($contexts!==null)return $contexts;
 $contexts=array_column(require __DIR__.'/_tutor_grammar.php',null,'id');
 // Exclude the pending official framework and chapters containing full models.
 foreach(cssv_precis_handbook()['chapters'] as $chapter){
  if(!in_array($chapter['id'],['1','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','19','21','22'],true))continue;
  $parts=[];foreach($chapter['blocks'] as $b){if($b['type']==='table'){foreach($b['rows'] as $row)$parts[]=implode(' | ',$row);}else $parts[]=$b['text'];}
  $id='precis:'.$chapter['id'];$text=implode("\n\n",$parts);if(mb_strlen($text)>16000)continue;
  $contexts[$id]=['id'=>$id,'category'=>'precis','title'=>$chapter['title'],'text'=>$text,'attribution'=>'Owner-supplied Précis handbook. Teaching guidance, not independently verified examination rules.','return_path'=>'/account/precis?view=course&chapter='.$chapter['id'],'date'=>null,'sources'=>[],'feature'=>'tutor'];
 }
 $maths=[
  'percentage'=>['Percentages','A percentage expresses a part per hundred. Percentage = (part ÷ whole) × 100. The whole must be nonzero. For a practice example, 15 out of 60 is '.(15/60*100).'%. To find 20% of 80, calculate (20 ÷ 100) × 80 = '.(20/100*80).'. Distinguish percentage points from percentage change: from 20% to 30% is 10 percentage points, while relative change is ((30 − 20) ÷ 20) × 100 = '.((30-20)/20*100).'%.'],
  'mean'=>['Arithmetic mean','The arithmetic mean is the sum of the values divided by their count. At least one value is required. For the practice values 4, 6 and 8, the sum is '.(4+6+8).' and the count is 3, so the mean is '.((4+6+8)/3).'. A mean can be affected by extreme values. Do not confuse the mean with the median (middle ordered value) or mode (most frequent value).'],
  'ratio'=>['Equivalent ratios','A ratio compares quantities in a stated order and consistent units. Divide both terms by the same nonzero factor to obtain an equivalent ratio. The practice ratio 12:18 becomes '.(12/6).':'.(18/6).' after division by 6. If a total of 50 is divided in the ratio 2:3, there are 5 equal parts; each part is 10, giving shares of 20 and 30. The order of the quantities matters.'],
 ];
 foreach($maths as $slug=>[$title,$text]){$id='maths:'.$slug;$contexts[$id]=['id'=>$id,'category'=>'maths','title'=>$title,'text'=>$text,'attribution'=>'CSS Vista conceptual Maths notes with deterministic practice calculations. Original examples, not past-paper questions.','return_path'=>'/subjects/compulsory/general-science-ability','date'=>null,'sources'=>[],'feature'=>'maths'];}
 $data=json_decode((string)file_get_contents(dirname(__DIR__).'/fpsc-syllabus.json'),true,64,JSON_THROW_ON_ERROR);
 foreach($data['subjects'] as $s){$id='syllabus:'.$s['slug'];$titles=array_map(fn($section)=>preg_replace('/\s*\([^)]*marks[^)]*\)/iu','',$section['title']),$s['sections']);$contexts[$id]=['id'=>$id,'category'=>'syllabus','title'=>$s['name'].' — topic map','text'=>$s['name']."\nSyllabus topic headings:\n".implode("\n",$titles),'attribution'=>'Repository syllabus topic map. Headings establish study scope, not conceptual definitions or current official eligibility/rules.','return_path'=>'/fpsc-syllabus','date'=>null,'sources'=>[],'feature'=>'tutor'];}
 return $contexts;
}
function cssv_tutor_context(PDO $pdo,string $id): array {
 $static=cssv_tutor_static_contexts();if(isset($static[$id]))return $static[$id];
 if(!str_starts_with($id,'current-affairs:'))throw new OutOfBoundsException('This approved learning context is unavailable.');
 $storyId=substr($id,16);$q=$pdo->prepare('SELECT i.id,i.headline,i.publication_date,i.content FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date WHERE i.id=? AND '.ca_visible());$q->execute([$storyId]);$row=$q->fetch();if(!$row)throw new OutOfBoundsException('This published development is unavailable.');
 return cssv_tutor_published_context($row);
}
function cssv_tutor_published_context(array $row): array {
 $id='current-affairs:'.$row['id'];$story=json_decode($row['content'],true,64,JSON_THROW_ON_ERROR);$sources=[];
 foreach($story['sources']??[] as $source){if(!is_array($source)||!is_string($source['publisher']??null))continue;try{$url=ca_url($source['url']??null);$publisher=cssv_learning_string($source['publisher'],300,'publisher');}catch(InvalidArgumentException){continue;}$sources[]=['publisher'=>$publisher,'url'=>$url];}
 if($sources===[])throw new OutOfBoundsException('This development has no usable published source attribution.');
 $parts=['Edition date: '.$row['publication_date'],$row['headline']];foreach(['summary','what_happened','explanation','background','why_it_matters','pakistan_perspective','regional_implications','global_implications'] as $key)if(is_string($story[$key]??null))$parts[]=$key.': '.$story[$key];
 $text=implode("\n\n",$parts);if(mb_strlen($text)>16000)throw new OutOfBoundsException('This development exceeds the current contextual-help limit. Read it in the original workspace.');
 return ['id'=>$id,'category'=>'current-affairs','title'=>$row['headline'],'text'=>$text,'attribution'=>'Published CSS Vista briefing and its listed sources. Explain only developments at the edition date; no live news verification.','return_path'=>'/account/current-affairs/'.rawurlencode($row['id']),'date'=>$row['publication_date'],'sources'=>array_slice($sources,0,10),'feature'=>'current_affairs'];
}
function cssv_tutor_catalog(PDO $pdo,string $category,int $offset): array {
 if(!in_array($category,['grammar','precis','maths','syllabus','current-affairs'],true))throw new InvalidArgumentException('Choose an available learning area.');
 if($category==='current-affairs'){
  $q=$pdo->query('SELECT i.id,i.headline,i.publication_date,i.content FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date WHERE '.ca_visible().' ORDER BY i.publication_date DESC,i.id LIMIT 51 OFFSET '.$offset);$rows=$q->fetchAll();$more=count($rows)>50;
  $items=[];foreach(array_slice($rows,0,50) as $row){try{$context=cssv_tutor_published_context($row);$items[]=array_intersect_key($context,array_flip(['id','title','category','date']));}catch(OutOfBoundsException|InvalidArgumentException){/* Unusable source attribution is never offered as a teaching context. */}}
 }else{$rows=array_values(array_filter(cssv_tutor_static_contexts(),fn($c)=>$c['category']===$category));$more=count($rows)>$offset+50;$items=array_map(fn($c)=>array_intersect_key($c,array_flip(['id','title','category','date'])),array_slice($rows,$offset,50));}
 return ['contexts'=>$items,'has_more'=>$more];
}
