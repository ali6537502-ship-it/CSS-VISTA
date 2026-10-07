<?php
declare(strict_types=1);
require_once __DIR__.'/_learning_core.php';
/** Links audited against the existing authored 30-day course, not a new curriculum. */
function cssv_expression_skills(): array {
 return [
 'article_usage'=>['label'=>'Articles and determiners','category'=>'Grammar','day'=>13],
 'subject_verb_agreement'=>['label'=>'Subject–verb agreement','category'=>'Grammar','day'=>5],
 'run_on_sentence'=>['label'=>'Run-on sentences','category'=>'Sentence structure','day'=>4],
 'sentence_fragment'=>['label'=>'Sentence fragments','category'=>'Sentence structure','day'=>4],
 'tense_consistency'=>['label'=>'Tense consistency','category'=>'Grammar','day'=>9],
 'punctuation'=>['label'=>'Punctuation','category'=>'Punctuation','day'=>21],
 'weak_transition'=>['label'=>'Transitions','category'=>'Coherence','day'=>19],
 'vocabulary_repetition'=>['label'=>'Repeated vocabulary','category'=>'Vocabulary','day'=>23],
 'vague_expression'=>['label'=>'Precise expression','category'=>'Clarity','day'=>23],
 'weak_topic_sentence'=>['label'=>'Topic sentence','category'=>'Organization','day'=>24],
 'coherence'=>['label'=>'Paragraph coherence','category'=>'Coherence','day'=>24],
 'awkward_word_choice'=>['label'=>'Word choice','category'=>'Vocabulary','day'=>23],
 'redundancy'=>['label'=>'Concision','category'=>'Conciseness','day'=>22],
 'informal_expression'=>['label'=>'Formal expression','category'=>'Register','day'=>23],
 'preposition_error'=>['label'=>'Prepositions','category'=>'Grammar','day'=>16],
 'pronoun_reference'=>['label'=>'Pronoun reference','category'=>'Clarity','day'=>14],
 ];
}
function cssv_expression_feedback(array $result): array {
 $skills=cssv_expression_skills();
 foreach($result['findings'] as &$f){$skill=$skills[$f['code']];$f['category']=$skill['category'];$f['label']=$skill['label'];$f['lesson_day']=$skill['day'];$f['rewrite_instruction']='Rewrite the affected sentence in your own words, applying the hint. Keep the intended meaning and check '.$skill['label'].'.';}unset($f);
 return $result;
}
function cssv_expression_compare(array $before, array $after): array {
 if($before['writing_id']!==$after['writing_id'] || $before['version'] >= $after['version'])throw new InvalidArgumentException('Choose an earlier and a later version of the same writing.');
 $a=$before['feedback'] ?? null;$b=$after['feedback'] ?? null;
 $codes=static fn($r)=>$r?array_values(array_unique(array_column($r['findings'],'code'))):[];
 $old=$codes($a);$new=$codes($b);
 return ['before'=>$before,'after'=>$after,'word_delta'=>$after['word_count']-$before['word_count'],'same_wording'=>hash_equals($before['text_hash'],$after['text_hash']),'feedback_available'=>$a!==null && $b!==null,'no_longer_reported'=>$a && $b?array_values(array_diff($old,$new)):[],'still_reported'=>$a && $b?array_values(array_intersect($old,$new)):[],'newly_reported'=>$a && $b?array_values(array_diff($new,$old)):[]];
}
/** Bounded evidence sample; one copied text cannot become repeated independent evidence. */
function cssv_expression_profile(array $rows): array {
 $samples=[];$seen=[];
 foreach($rows as $row){if(isset($seen[$row['text_hash']]))continue;$seen[$row['text_hash']]=true;$samples[]=$row;if(count($samples)===100)break;}
 $profile=[];
 foreach(cssv_expression_skills() as $code=>$skill){
  $affected=[];$records=[];$lastReported=null;
  foreach($samples as $row){
   if(in_array($code,['weak_topic_sentence','coherence','weak_transition'],true) && $row['kind']!=='paragraph')continue;
   $flagged=in_array($code,array_column($row['result']['findings'],'code'),true);
   if(!isset($records[$row['writing_id']]))$records[$row['writing_id']]=$flagged;
   if($flagged){$affected[$row['writing_id']]=true;$lastReported ??=$row['created_at'];}
  }
  if(!$affected)continue;
  $recent=array_slice(array_values($records),0,3);$enough=count($affected)>=3;
  $state=$enough?(count($recent)===3 && !in_array(true,$recent,true)?'Improving':'Weak'):'Insufficient evidence';
  $profile[]=['code'=>$code,...$skill,'state'=>$state,'flagged_writings'=>count($affected),'reviewed_writings'=>count($records),'last_reported_at'=>$lastReported];
 }
 return ['window_days'=>30,'sample_limit'=>100,'reviewed_wordings'=>count($samples),'items'=>$profile,'basis'=>'Latest feedback in a bounded 30-day sample; repeated copies and re-evaluations of the same wording count once. Weak requires findings in at least three different writing records. Improving additionally requires the latest three relevant records to omit the category. Omission is a feedback trend, not proof of mastery.'];
}
