<?php
declare(strict_types=1);
require_once __DIR__.'/_grammar_core.php';

function cssv_gv5_catalog(): array { static $catalog; return $catalog ??= require __DIR__.'/_grammar_v5_catalog.php'; }
function cssv_gv5_state(array $s): array {
 cssv_pro_fields($s,['curriculumVersion','completed','studied','answers','drafts','selfReviews','revealed','notes','bookmarks','reviews','cursor','checks']);
 $c=cssv_gv5_catalog();if(($s['curriculumVersion'] ?? null)!==$c['version'])throw new InvalidArgumentException('This work belongs to another curriculum edition.');
 $days=array_column($c['days'],null,'id');$concepts=array_column($c['concepts'],null,'id');$items=array_column($c['items'],null,'id');
 $objective=array_filter($items,fn($q)=>$q['type']==='objective');$response=array_filter($items,fn($q)=>$q['type']==='response');
 foreach(['completed'=>array_keys($days),'studied'=>array_keys($concepts),'bookmarks'=>array_keys($concepts),'revealed'=>array_keys($items)] as $key=>$allowed)$s[$key]=cssv_grammar_list($s[$key] ?? null,$allowed,count($allowed));
 foreach(['answers','drafts','selfReviews','notes','reviews','checks'] as $key)$s[$key]=cssv_grammar_map($s[$key] ?? null);
 cssv_pro_fields($s['answers'],array_keys($objective));
 foreach($s['answers'] as $id=>$a){
  cssv_pro_fields(cssv_grammar_map($a),['first','firstAt','latest','latestAt','exposures']);$max=$objective[$id]['options']-1;
  cssv_grammar_integer($a['first'] ?? null,0,$max);cssv_grammar_integer($a['latest'] ?? null,0,$max);
  cssv_grammar_integer($a['firstAt'] ?? null,1,8640000000000000);cssv_grammar_integer($a['latestAt'] ?? null,$a['firstAt'],8640000000000000);cssv_grammar_integer($a['exposures'] ?? null,1,100000);
 }
 cssv_pro_fields($s['drafts'],array_keys($response));foreach($s['drafts'] as &$text)$text=cssv_grammar_text($text,1000000);unset($text);
 cssv_pro_fields($s['selfReviews'],array_keys($response));foreach($s['selfReviews'] as $rating)if(!in_array($rating,['needs-work','developing','meets-rubric'],true))throw new InvalidArgumentException('Unknown self-review label.');
 cssv_pro_fields($s['notes'],array_merge(array_keys($days),array_keys($concepts)));foreach($s['notes'] as &$text)$text=cssv_grammar_text($text,1000000);unset($text);
 cssv_pro_fields($s['reviews'],array_keys($objective));foreach($s['reviews'] as $r){
  cssv_pro_fields(cssv_grammar_map($r),['dueAt','lastAt','streak','lapses']);cssv_grammar_integer($r['lastAt'] ?? null,1,8640000000000000);cssv_grammar_integer($r['dueAt'] ?? null,$r['lastAt'],8640000000000000);cssv_grammar_integer($r['streak'] ?? null,0,5);cssv_grammar_integer($r['lapses'] ?? null,0,10000);
 }
 $cursor=cssv_grammar_map($s['cursor'] ?? null);cssv_pro_fields($cursor,['day','section','item']);cssv_grammar_integer($cursor['day'] ?? null,1,30);
 if(!in_array($cursor['section'] ?? null,array_merge(array_keys($concepts),['orientation','questions','corrections','transformations','writing','recall','finish']),true))throw new InvalidArgumentException('Unknown lesson section.');
 if(($cursor['item'] ?? null)!=='' && !isset($items[$cursor['item'] ?? '']))throw new InvalidArgumentException('Unknown practice position.');
 cssv_pro_fields($s['checks'],array_keys($days));foreach($s['checks'] as $id=>$checks)cssv_grammar_list($checks,range(0,$days[$id]['checklist']-1),$days[$id]['checklist']);
 return $s;
}
/** Additive preservation: no missing field can erase earlier text or first-response evidence. */
function cssv_gv5_preserve(array $old,array $next): array {
 foreach(['drafts','notes','selfReviews','answers'] as $key)$next[$key]=array_replace($old[$key],$next[$key]);
 foreach($old['answers'] as $id=>$prior){
  $a=$next['answers'][$id];
  if($a['first']!==$prior['first'] || $a['firstAt']!==$prior['firstAt'])throw new DomainException('An original response cannot be changed by retrying or restoring.');
  if($a['latestAt']<$prior['latestAt'])$a=$prior;
  $a['exposures']=max($a['exposures'],$prior['exposures']);$next['answers'][$id]=$a;
 }
 foreach($old['reviews'] as $id=>$review)if(!isset($next['reviews'][$id]) || $next['reviews'][$id]['lastAt']<$review['lastAt'])$next['reviews'][$id]=$review;
 foreach(['completed','studied'] as $key)$next[$key]=array_values(array_unique(array_merge($old[$key],$next[$key])));
 return $next;
}
