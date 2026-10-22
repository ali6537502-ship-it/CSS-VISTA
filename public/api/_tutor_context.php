<?php
declare(strict_types=1);
require_once __DIR__.'/_tutor_core.php';
require_once __DIR__.'/_precis_core.php';
require_once __DIR__.'/_current_affairs.php';
function cssv_tutor_static_contexts(): array {
 static $contexts=null;if($contexts!==null)return $contexts;
 $contexts=array_column(require __DIR__.'/_tutor_grammar_v5.php',null,'id');
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
function cssv_tutor_context(PDO $pdo,string $id,?string $user=null): array {
 if(str_starts_with($id,'ability:')){
  require_once __DIR__.'/_ability_core.php';$parts=explode(':',$id);if(count($parts)!==3)throw new InvalidArgumentException('Choose an Ability lesson.');
  $unit=cssv_ability_unit($parts[1]);$lesson=cssv_ability_lesson($unit,$parts[2]);
  $text=$lesson['title']."\n\n".$lesson['idea']."\nMethod: ".$lesson['rule']."\nDifferent worked example: ".$lesson['example']['problem']."\n".implode("\n",$lesson['example']['steps'])."\nIndependent exercise (answer withheld): ".$lesson['exercise']['prompt'];
  return ['id'=>$id,'category'=>'ability','title'=>$unit['title'].' — '.$lesson['title'],'text'=>$text,'attribution'=>cssv_ability_course()['attribution'].' Only the selected lesson is supplied. Fixed grading is deterministic; optional help must not solve the live exercise.','return_path'=>'/account/general-ability?unit='.$unit['id'].'&lesson='.$lesson['id'],'date'=>null,'sources'=>[],'feature'=>$unit['stage']==='Logical reasoning'?'tutor':'maths'];
 }
 if(str_starts_with($id,'topic:')){
  require_once __DIR__.'/_topics.php';cssv_topics_ensure($pdo);$parts=explode(':',$id);if(count($parts)!==4)throw new InvalidArgumentException('Choose a published topic section.');
  $topic=cssv_topic_published($pdo,cssv_topic_slug($parts[1]));$definition=cssv_topic_definition($topic['definition']);if($topic['version_id']!==cssv_pro_id($parts[2])||!hash_equals($topic['content_hash'],cssv_topic_hash($definition)))throw new OutOfBoundsException('This published topic edition changed. Reopen its current lesson.');
  $section=null;foreach($definition['sections'] as $s)if($s['id']===$parts[3])$section=$s;
  if(!$section)throw new OutOfBoundsException('Published section unavailable.');
  $text=$definition['title']."\nEdition as of: ".$definition['as_of']."\n\n".$section['title']."\n".implode("\n\n",$section['blocks']);
  if(mb_strlen($text)>16000)throw new OutOfBoundsException('This section exceeds bounded contextual help. Read the lesson directly.');
  $references=array_values(array_filter($definition['references'],fn($r)=>in_array($r['id'],$section['reference_ids'],true)));
  return ['id'=>$id,'category'=>'topic','title'=>$definition['title'].' — '.$section['title'],'text'=>$text,'attribution'=>'Published, reviewed CSS Vista Pro topic section. Explain only this dated source; no new factual research or current-news verification.','return_path'=>'/account/preparation?view=topics&topic='.$definition['id'].'&topicSection='.$section['id'],'date'=>$definition['as_of'],'sources'=>array_map(fn($r)=>['publisher'=>$r['label'],'url'=>$r['url']],$references),'feature'=>in_array('current-affairs',$definition['subjects'],true)?'current_affairs':'tutor'];
 }
 if(str_starts_with($id,'skills:')){
  if(!$user)throw new OutOfBoundsException('Owned learning context unavailable.');
  require_once __DIR__.'/_skills.php';cssv_skills_ensure($pdo);
  $parts=explode(':',$id);if(count($parts)!==4)throw new InvalidArgumentException('Choose a saved skills context.');
  $w=cssv_skills_workspace($pdo,$user,cssv_pro_id($parts[1]));$v=$parts[2]==='new'?null:cssv_skills_version($pdo,$user,$w,cssv_pro_id($parts[2]));
  $stage=null;foreach($w['source']['stages'] as $s)if($s['id']===$parts[3])$stage=$s;
  if(!$stage)throw new OutOfBoundsException('Learning stage unavailable.');
  $source=$w['source'];if($parts[2]!=='new'&&!$v)throw new OutOfBoundsException('Saved skills version unavailable.');$text=$source['title']."\n\n".$source['explanation']."\n\nStage guidance: ".$stage['teach']."\nDifferent instructional example: ".$stage['example']."\nLearning question: ".$stage['question'];
  $authoritative=$text;
  if($v&&isset($v['answers'][$stage['id']])&&is_string($v['answers'][$stage['id']]))$text.="\n\nStudent response (unverified assertions; not an authoritative factual source): ".$v['answers'][$stage['id']];
  if(mb_strlen($text)>16000)throw new OutOfBoundsException('Select a shorter bounded learning context.');
  $path=match($w['feature']){'sentence'=>'/account/expression?view=studio&','argument'=>'/account/argumentation?','analysis'=>'/account/analytical-skills?','essay'=>'/account/essay-builder?'};
  return ['id'=>$id,'level'=>$w['level'],'attempt_id'=>$w['attempt_id'],'category'=>'skills','title'=>$source['title'].' — '.$stage['title'],'text'=>$text,'authoritative_text'=>$authoritative,'attribution'=>$source['attribution'].' Student wording is private practice, not independently verified factual evidence.','return_path'=>$path.'workspace='.$w['id'].($v?'&version='.$v['version_id']:''),'date'=>null,'sources'=>[],'feature'=>'tutor'];
 }
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
function cssv_tutor_catalog(PDO $pdo,string $category,int $offset,?string $user=null): array {
 if($category==='ability'){
  require_once __DIR__.'/_ability_core.php';$items=[];
  foreach(cssv_ability_course()['units'] as $unit)foreach($unit['lessons'] as $lesson)$items[]=['id'=>'ability:'.$unit['id'].':'.$lesson['id'],'title'=>$unit['title'].' — '.$lesson['title'],'category'=>'ability','date'=>null];
  return ['contexts'=>array_slice($items,$offset,50),'has_more'=>count($items)>$offset+50];
 }
 if($category==='topic'){
  require_once __DIR__.'/_topics.php';cssv_topics_ensure($pdo);$q=$pdo->query('SELECT id FROM pro_topics WHERE published_version_id IS NOT NULL ORDER BY title,id LIMIT 51 OFFSET '.$offset);$rows=$q->fetchAll(PDO::FETCH_COLUMN);$items=[];
  foreach(array_slice($rows,0,50) as $id){$t=cssv_topic_published($pdo,$id);$section=$t['definition']['sections'][0];$items[]=['id'=>'topic:'.$id.':'.$t['version_id'].':'.$section['id'],'title'=>$t['title'].' — '.$section['title'],'category'=>'topic','date'=>$t['definition']['as_of']];}
  return ['contexts'=>$items,'has_more'=>count($rows)>50];
 }
 if($category==='skills'){
  if(!$user)throw new OutOfBoundsException('Owned learning catalogue unavailable.');
  require_once __DIR__.'/_skills.php';cssv_skills_ensure($pdo);
  $q=$pdo->prepare('SELECT id FROM skills_workspaces WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 51 OFFSET '.$offset);$q->execute([$user]);$rows=$q->fetchAll(PDO::FETCH_COLUMN);$items=[];
  foreach(array_slice($rows,0,50) as $id){$w=cssv_skills_workspace($pdo,$user,$id);$v=cssv_skills_version($pdo,$user,$w);$context=cssv_tutor_context($pdo,'skills:'.$id.':'.($v['version_id']??'new').':'.$w['source']['stages'][$w['position']]['id'],$user);$items[]=array_intersect_key($context,array_flip(['id','title','category','date']));}
  return ['contexts'=>$items,'has_more'=>count($rows)>50];
 }
 if(!in_array($category,['grammar','precis','maths','syllabus','current-affairs'],true))throw new InvalidArgumentException('Choose an available learning area.');
 if($category==='current-affairs'){
  $q=$pdo->query('SELECT i.id,i.headline,i.publication_date,i.content FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date WHERE '.ca_visible().' ORDER BY i.publication_date DESC,i.id LIMIT 51 OFFSET '.$offset);$rows=$q->fetchAll();$more=count($rows)>50;
  $items=[];foreach(array_slice($rows,0,50) as $row){try{$context=cssv_tutor_published_context($row);$items[]=array_intersect_key($context,array_flip(['id','title','category','date']));}catch(OutOfBoundsException|InvalidArgumentException){/* Unusable source attribution is never offered as a teaching context. */}}
 }else{$rows=array_values(array_filter(cssv_tutor_static_contexts(),fn($c)=>$c['category']===$category && empty($c['legacy_alias'])));$more=count($rows)>$offset+50;$items=array_map(fn($c)=>array_intersect_key($c,array_flip(['id','title','category','date'])),array_slice($rows,$offset,50));}
 return ['contexts'=>$items,'has_more'=>$more];
}
