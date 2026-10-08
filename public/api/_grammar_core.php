<?php
declare(strict_types=1);
require_once __DIR__.'/_pro_core.php';
require_once __DIR__.'/_expression_core.php';
function cssv_grammar_catalog(): array { static $days; return $days ??= require __DIR__.'/_grammar_catalog.php'; }
function cssv_grammar_integer(mixed $value,int $min,int $max): int {
 if(!is_int($value) || $value<$min || $value>$max)throw new InvalidArgumentException('Invalid Grammar practice value.');return $value;
}
function cssv_grammar_map(mixed $value): array {
 if(!is_array($value) || ($value!==[] && array_is_list($value)))throw new InvalidArgumentException('Invalid Grammar record.');return $value;
}
function cssv_grammar_list(mixed $value,array $allowed,int $max=1000): array {
 if(!is_array($value) || !array_is_list($value) || count($value)>$max || count(array_unique($value,SORT_REGULAR))!==count($value))throw new InvalidArgumentException('Invalid Grammar list.');
 foreach($value as $id)if(!in_array($id,$allowed,true))throw new InvalidArgumentException('Unknown Grammar item.');return $value;
}
function cssv_grammar_text(mixed $value,int $max=20000): string {
 if(!is_string($value) || !mb_check_encoding($value,'UTF-8') || mb_strlen($value)>$max)throw new InvalidArgumentException('Grammar text is too long or invalid.');return $value;
}
function cssv_grammar_answers(mixed $value,array $questions): array {
 $map=cssv_grammar_map($value);$known=array_column($questions,null,'id');
 foreach($map as $id=>$answer){if(!isset($known[$id]))throw new InvalidArgumentException('Unknown authored question.');cssv_grammar_integer($answer,0,$known[$id]['options']-1);}return $map;
}
function cssv_grammar_round(array $r,bool $history=false): array {
 cssv_pro_fields($r,$history?['id','mode','day','at','ids','first']:['id','mode','day','ids','position','answers','first','drafts','revealed','startedAt','finishedAt']);
 $r['id']=cssv_pro_id($r['id'] ?? null);$mode=$r['mode'] ?? null;
 if(!in_array($mode,['targeted','mixed','revision'],true))throw new InvalidArgumentException('Unknown Grammar practice mode.');
 $questions=array_merge(...array_map(fn($d)=>array_merge($d['warmUp'],$d['drill']),cssv_grammar_catalog()));
 $r['ids']=cssv_grammar_list($r['ids'] ?? null,array_column($questions,'id'),10);if(!$r['ids'])throw new InvalidArgumentException('Empty practice round.');
 if($mode==='targeted'){
  $day=cssv_grammar_integer($r['day'] ?? null,1,30);$allowed=array_column(array_merge(cssv_grammar_catalog()[$day-1]['warmUp'],cssv_grammar_catalog()[$day-1]['drill']),'id');cssv_grammar_list($r['ids'],$allowed,10);
 }elseif(isset($r['day']))throw new InvalidArgumentException('Only focused practice has a target lesson.');
 $selected=array_values(array_filter($questions,fn($q)=>in_array($q['id'],$r['ids'],true)));
 $r['first']=cssv_grammar_answers($r['first'] ?? null,$selected);
 $time=$history?'at':'startedAt';cssv_grammar_integer($r[$time] ?? null,1,8640000000000000);
 if($history){if(count($r['first'])!==count($r['ids']))throw new InvalidArgumentException('Incomplete practice history.');return $r;}
 cssv_grammar_integer($r['position'] ?? null,0,count($r['ids'])-1);$r['answers']=cssv_grammar_answers($r['answers'] ?? null,$selected);
 $corrections=array_merge(...array_column(cssv_grammar_catalog(),'corrections'));
 $r['drafts']=cssv_grammar_map($r['drafts'] ?? null);cssv_pro_fields($r['drafts'],$corrections);foreach($r['drafts'] as &$text)$text=cssv_grammar_text($text);unset($text);
 $r['revealed']=cssv_grammar_list($r['revealed'] ?? null,$corrections);
 if(isset($r['finishedAt'])){cssv_grammar_integer($r['finishedAt'],$r['startedAt'],8640000000000000);if(count($r['first'])!==count($r['ids']))throw new InvalidArgumentException('Unfinished round cannot be recorded.');}return $r;
}
/** Validate the existing v4 study format; never silently discard text on the server. */
function cssv_grammar_state(array $s): array {
 cssv_pro_fields($s,['completed','scores','mistakes','notes','currentDay','sessions','attempts','lab','labHistory','reviews']);
 $days=cssv_grammar_catalog();$dayKeys=array_map('strval',range(1,30));$all=array_merge(...array_map(fn($d)=>array_merge($d['warmUp'],$d['drill']),$days));
 $s['completed']=cssv_grammar_list($s['completed'] ?? null,range(1,30),30);cssv_grammar_integer($s['currentDay'] ?? null,1,30);
 $s['mistakes']=cssv_grammar_list($s['mistakes'] ?? null,array_column($all,'id'),480);
 foreach(['scores','notes','sessions'] as $key){$s[$key]=cssv_grammar_map($s[$key] ?? null);cssv_pro_fields($s[$key],$dayKeys);}
 foreach($s['scores'] as $score)cssv_grammar_integer($score,0,100);
 // Historical notes were unlimited. 4MiB request limit bounds total storage;
 // oversized notes fail explicitly and remain in the browser for export.
 foreach($s['notes'] as &$note)$note=cssv_grammar_text($note,1000000);unset($note);
 foreach($s['sessions'] as $key=>&$session){
  $d=$days[(int)$key-1];$session=cssv_grammar_map($session);cssv_pro_fields($session,['step','position','warmUp','drill','first','drafts','writing','checks','revealed','recorded']);
  cssv_grammar_integer($session['step'] ?? null,0,6);if(!is_bool($session['recorded'] ?? null))throw new InvalidArgumentException('Invalid drill recording state.');
  $session['position']=cssv_grammar_map($session['position'] ?? null);cssv_pro_fields($session['position'],['warmUp','drill','corrections']);
  foreach(['warmUp','drill','corrections'] as $group)if(isset($session['position'][$group]))cssv_grammar_integer($session['position'][$group],0,count($d[$group])-1);
  foreach(['warmUp','drill','first'] as $group)$session[$group]=cssv_grammar_answers($session[$group] ?? null,$d[$group==='first'?'drill':$group]);
  $session['drafts']=cssv_grammar_map($session['drafts'] ?? null);cssv_pro_fields($session['drafts'],$d['corrections']);foreach($session['drafts'] as &$text)$text=cssv_grammar_text($text);unset($text);
  $session['writing']=cssv_grammar_text($session['writing'] ?? null);$session['checks']=cssv_grammar_list($session['checks'] ?? null,range(0,$d['checklist']-1),$d['checklist']);
  $session['revealed']=cssv_grammar_list($session['revealed'] ?? null,array_merge($d['corrections'],array_map(fn($i)=>'example:'.$i,range(0,$d['examples']-1))));
 }unset($session);
 if(!is_array($s['attempts'] ?? null) || !array_is_list($s['attempts']) || count($s['attempts'])>100)throw new InvalidArgumentException('Invalid drill history.');
 foreach($s['attempts'] as $a){cssv_pro_fields($a,['day','at','correct','total']);$day=cssv_grammar_integer($a['day'] ?? null,1,30);cssv_grammar_integer($a['at'] ?? null,1,8640000000000000);if(($a['total'] ?? null)!==count($days[$day-1]['drill']))throw new InvalidArgumentException('Invalid drill size.');cssv_grammar_integer($a['correct'] ?? null,0,$a['total']);}
 $s['lab']=isset($s['lab'])?cssv_grammar_round(cssv_grammar_map($s['lab'])):null;
 if(!is_array($s['labHistory'] ?? null) || !array_is_list($s['labHistory']) || count($s['labHistory'])>50)throw new InvalidArgumentException('Invalid Lab history.');
 $seen=[];foreach($s['labHistory'] as &$round){$round=cssv_grammar_round(cssv_grammar_map($round),true);if(isset($seen[$round['id']]))throw new InvalidArgumentException('Duplicate Lab result.');$seen[$round['id']]=true;}unset($round);
 $s['reviews']=cssv_grammar_map($s['reviews'] ?? null);cssv_pro_fields($s['reviews'],array_column($all,'id'));
 foreach($s['reviews'] as $r){cssv_pro_fields($r,['dueAt','lastAt','streak','lapses']);cssv_grammar_integer($r['lastAt'] ?? null,1,8640000000000000);cssv_grammar_integer($r['dueAt'] ?? null,$r['lastAt'],8640000000000000);cssv_grammar_integer($r['streak'] ?? null,0,5);cssv_grammar_integer($r['lapses'] ?? null,0,10000);}
 return $s;
}
function cssv_grammar_canonical(mixed $value): string {
 $sort=static function($v)use(&$sort){if(is_array($v)){if(!array_is_list($v))ksort($v);foreach($v as &$item)$item=$sort($item);unset($item);}return $v;};return json_encode($sort($value),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
}
/** Course restarts never erase first-seen question evidence; retries never improve it. */
function cssv_grammar_evidence(array $old,array $state): array {
 foreach($state['sessions'] as $session)foreach($session['first'] as $id=>$answer)if(!array_key_exists($id,$old))$old[$id]=$answer;
 foreach(array_merge($state['labHistory'],$state['lab']?[$state['lab']]:[]) as $round)foreach($round['first'] as $id=>$answer)if(!array_key_exists($id,$old))$old[$id]=$answer;return $old;
}
function cssv_grammar_history(array $previous,array $next): array {
 $history=array_column($previous['labHistory'],'id');$known=array_column($previous['labHistory'],null,'id');
 foreach($next['labHistory'] as $round){if(isset($known[$round['id']]) && cssv_grammar_canonical($known[$round['id']])!==cssv_grammar_canonical($round))throw new DomainException('A recorded Lab result cannot be changed.');if(!isset($known[$round['id']])){$known[$round['id']]=$round;$history[]=$round['id'];}}
 $prior=$previous['lab'];$current=$next['lab'];
 if($prior && $current && $prior['id']===$current['id']){
  foreach(['ids','mode','startedAt','day'] as $key)if(($prior[$key] ?? null)!==($current[$key] ?? null))throw new DomainException('This round must keep its original questions.');
  foreach($prior['first'] as $id=>$answer)if(($current['first'][$id] ?? null)!==$answer)throw new DomainException('First answers cannot be changed by retrying.');
 }
 if($current && isset($known[$current['id']]) && cssv_grammar_canonical($current['first'])!==cssv_grammar_canonical($known[$current['id']]['first']))throw new DomainException('A recorded round cannot acquire different first answers.');
 $next['labHistory']=array_map(fn($id)=>$known[$id],array_slice($history,-50));
 $drills=[];foreach(array_merge($previous['attempts'],$next['attempts']) as $a){$key=$a['day'].':'.$a['at'];if(isset($drills[$key]) && cssv_grammar_canonical($drills[$key])!==cssv_grammar_canonical($a))throw new DomainException('A recorded drill result cannot be changed.');$drills[$key]=$a;}$next['attempts']=array_slice(array_values($drills),-100);return $next;
}
/** Deterministic self-practice profile. No model call, exam prediction or mastery claim. */
function cssv_grammar_profile(array $s,array $evidence,array $writing,int $now): array {
 $items=[];$totals=['questions'=>0,'correct'=>0,'due'=>0,'completed'=>count($s['completed'] ?? [])];
 foreach(cssv_grammar_catalog() as $d){
  $questions=array_merge($d['warmUp'],$d['drill']);$answered=0;$correct=0;$due=0;$unresolved=0;$spaced=0;
  foreach($questions as $q){$id=$q['id'];if(array_key_exists($id,$evidence)){$answered++;if($evidence[$id]===$q['answer'])$correct++;}
   $r=$s['reviews'][$id] ?? null;$missed=in_array($id,$s['mistakes'] ?? [],true) || ($r['lapses'] ?? 0)>0;
   if($r && $r['dueAt']<=$now || !$r && in_array($id,$s['mistakes'] ?? [],true))$due++;
   if($missed && ($r['streak'] ?? 0)<2)$unresolved++;if(($r['streak'] ?? 0)>=2)$spaced++;
  }
  $findings=array_values(array_filter($writing['items'],fn($item)=>$item['day']===$d['day']));$weak=count(array_filter($findings,fn($i)=>$i['state']==='Weak'))>0;
  $started=isset($s['sessions'][(string)$d['day']]) || in_array($d['day'],$s['completed'] ?? [],true);
  $status=$answered?'Practising':($started?'Learning':'Not started');
  if($unresolved || $weak || $answered>=8 && ($answered-$correct)/$answered>=0.3)$status='Needs review';
  elseif($answered>=8 && $correct/$answered>=0.7 && $spaced>=3)$status='Improving';
  $items[]=['day'=>$d['day'],'title'=>$d['title'],'phase'=>$d['phase'],'state'=>$status,'answered'=>$answered,'correct'=>$correct,'available'=>count($questions),'due'=>$due,'unresolved'=>$unresolved,'spaced_questions'=>$spaced,'completed'=>in_array($d['day'],$s['completed'] ?? [],true),'writing'=>$findings];
  foreach(['questions'=>$answered,'correct'=>$correct,'due'=>$due] as $key=>$n)$totals[$key]+=$n;
 }
 return ['rule_version'=>'grammar-self-practice-v1','items'=>$items,'totals'=>$totals,'writing'=>$writing,'basis'=>'First-seen daily-drill and Error Lab responses to distinct authored questions in this attempt. Course restarts and retries do not increase this accuracy. Imported work and revision schedules are self-reported practice; independent writing feedback is shown separately. Stable and Mastered are withheld until calibrated independent assessment is available.'];
}
