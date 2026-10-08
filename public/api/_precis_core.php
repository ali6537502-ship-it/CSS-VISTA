<?php
declare(strict_types=1);
require_once __DIR__.'/_learning_core.php';
function cssv_precis_handbook(): array { static $book; return $book ??= require __DIR__.'/_precis_handbook.php'; }
function cssv_precis_skills(): array {
 return ['central_idea'=>'Central idea','argument_structure'=>'Argument structure','selection'=>'Selection','compression'=>'Conceptual compression','paraphrasing'=>'Faithful paraphrasing','fidelity'=>'Fidelity','qualifications'=>'Qualifications','coherence'=>'Coherence','grammar'=>'Language control','economy'=>'Economy','title'=>'Title writing','independence'=>'Independence'];
}
function cssv_precis_rubric(): array {
 return ['central_idea'=>'Did I capture the whole argument?','fidelity'=>'Did I preserve meaning and strength of claim?','selection'=>'Did I keep major supports and remove minor detail?','compression'=>'Did I generalize and merge effectively?','logic'=>'Did I preserve cause, contrast, condition and conclusion?','coherence'=>'Does it read as one connected paragraph?','language'=>'Are grammar, spelling and prepositions correct?','title'=>'Does the title capture the controlling idea?','independence'=>'Can it stand alone?','economy'=>'Can any phrase be shortened faithfully?'];
}
function cssv_precis_course(): array {
 $groups = [
  [1,5,'Find the controlling idea',[1,2,3,4,5],'central_idea','Identify the topic, tone and direction. Write a one-sentence controlling idea; explain why it covers the argument.'],
  [6,10,'Map and select',[5,6,9,15],'selection','Label idea units. Decide what to keep, compress or remove; protect causes, contrasts, conditions and conclusions.'],
  [11,15,'Compress concepts',[7,8,9,17,23],'compression','Find accurate umbrella terms, merge related ideas and preserve the strength of qualified claims.'],
  [16,20,'Draft a connected précis',[10,11,12,13,14,18,19],'coherence','Draft from your skeleton, add a specific title and self-check fidelity before tightening the length.'],
  [21,25,'Handle mixed arguments',[8,9,16,18,20,24],'fidelity','Practise implied arguments, contrasts and qualifications. Use the source passage to check what was lost or strengthened.'],
  [26,28,'Practise with a timer',[14,15,19,22],'economy','Choose your own practice duration. Draft, revise and self-check before it ends; timing is a practice aid, not a verified exam rule.'],
  [29,30,'Review and repair',[16,19,21,22,24],'grammar','Compare saved revisions, log recurring mistakes and practise the related Grammar lesson. Use an appropriately sourced longer passage for simulation.']
 ];
 $days=[];foreach($groups as [$start,$end,$title,$chapters,$skill,$task])for($day=$start;$day<=$end;$day++)$days[]=['day'=>$day,'title'=>$title,'chapters'=>array_map('strval',$chapters),'skill'=>$skill,'task'=>$task];return $days;
}
function cssv_precis_context(array $body): array {
 $scratch=$body['scratch'] ?? null;$scores=$body['self_check'] ?? null;
 if(!is_array($scratch)||array_is_list($scratch)||!is_array($scores)||array_is_list($scores))throw new InvalidArgumentException('Include valid scratch notes and a self-check.');
 cssv_pro_fields($scratch,['topic','central_idea','skeleton','essential','removable','compression','paraphrase','reflection','rewrite_task']);$clean=[];
 foreach(['topic','central_idea','skeleton','essential','removable','compression','paraphrase','reflection','rewrite_task'] as $k)$clean[$k]=cssv_learning_string($scratch[$k] ?? '',4000,'scratch notes',true);
 cssv_pro_fields($scores,array_keys(cssv_precis_rubric()));$rubric=[];
 foreach(cssv_precis_rubric() as $k=>$_){$v=$scores[$k] ?? null;if($v!==null&&(!is_int($v)||$v<0||$v>5))throw new InvalidArgumentException('Self-check scores must be 0–5 or left unscored.');$rubric[$k]=$v;}
 $timer=$body['timer'] ?? null;
 if($timer!==null){if(!is_array($timer))throw new InvalidArgumentException('Invalid practice timer.');cssv_pro_fields($timer,['minutes','started_at','finished_at']);if(!is_int($timer['minutes'] ?? null)||$timer['minutes']<1||$timer['minutes']>120)throw new InvalidArgumentException('Choose 1–120 practice minutes.');foreach(['started_at','finished_at'] as $k)if(($timer[$k] ?? null)!==null&&(!is_int($timer[$k])||$timer[$k]<0||$timer[$k]>4102444800000))throw new InvalidArgumentException('Invalid timer date.');}
 return ['title'=>cssv_learning_string($body['title'] ?? null,180,'précis title'),'scratch'=>$clean,'self_check'=>$rubric,'timer'=>$timer];
}
function cssv_precis_source(array $body): array {
 $id=$body['passage_id'] ?? null;
 if($id!==null){if(!is_string($id))throw new InvalidArgumentException('Choose a handbook passage.');foreach(cssv_precis_handbook()['passages'] as $p)if($p['id']===$id)return array_intersect_key($p,array_flip(['id','label','text','source','limit']));throw new InvalidArgumentException('Unknown handbook passage.');}
 $text=cssv_learning_string($body['original'] ?? null,20000,'original passage');if(cssv_learning_words($text)<20)throw new InvalidArgumentException('Include an original passage of at least 20 words.');
 $limit=$body['word_limit'] ?? null;if($limit!==null&&(!is_int($limit)||$limit<10||$limit>2000))throw new InvalidArgumentException('An explicit word limit must be 10–2,000 words.');
 return ['id'=>null,'label'=>'Your sourced passage','text'=>$text,'source'=>cssv_learning_string($body['source_label'] ?? null,500,'source or attribution'),'limit'=>$limit];
}
function cssv_precis_profile(array $rows): array {
 $questions=cssv_precis_questions();$by=[];
 foreach($rows as $r){$id=$r['question_id'];if(!isset($questions[$id]))continue;$by[$id][]=$r;}
 $items=[];foreach(cssv_precis_skills() as $skill=>$label){$seen=0;$correct=0;$due=[];$resolved=0;
  foreach($by as $id=>$responses){if($questions[$id]['skill']!==$skill)continue;$seen++;if((int)$responses[0]['choice']===$questions[$id]['answer'])$correct++;
   $last=$responses[count($responses)-1];$lastWrong=$last['last_wrong_at'] ?? null;
   if(!array_key_exists('last_wrong_at',$last))foreach($responses as $response)if((int)$response['choice']!==$questions[$id]['answer'])$lastWrong=$response['created_at'];
   $lastGood=(int)$last['choice']===$questions[$id]['answer'];$spaced=$lastWrong!==null&&$lastGood&&strtotime($last['created_at'])-strtotime($lastWrong)>=3*86400;
   if(($lastWrong!==null&&!$spaced)||!$lastGood)$due[]=$id;elseif($lastWrong!==null)$resolved++;
  }
  $items[]=['skill'=>$skill,'label'=>$label,'state'=>$due?'Needs review':($resolved?'Improving':($seen?'Practising':'Not started')),'questions'=>$seen,'first_correct'=>$correct,'review_ids'=>$due];
 }return ['items'=>$items,'basis'=>'Fixed recognition drills only. First responses remain unchanged after retry. A correct review at least three days after the most recent error can resolve a drill error. These checks do not assess free-text meaning or establish Stable/Mastered writing ability.'];
}
