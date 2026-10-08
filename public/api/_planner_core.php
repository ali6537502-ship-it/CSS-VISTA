<?php
declare(strict_types=1);
require_once __DIR__.'/_learning_core.php';
require_once __DIR__.'/_grammar_core.php';
require_once __DIR__.'/_planner_rules.php';
function cssv_planner_hash(array $value): string {return hash('sha256',cssv_grammar_canonical($value));}
function cssv_planner_day(?DateTimeImmutable $now=null): string {return ($now??new DateTimeImmutable('now'))->setTimezone(new DateTimeZone('Asia/Karachi'))->format('Y-m-d');}
function cssv_planner_date(mixed $value): string {
 if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value))throw new InvalidArgumentException('Choose a valid planning date.');$d=DateTimeImmutable::createFromFormat('!Y-m-d',$value,new DateTimeZone('Asia/Karachi'));if(!$d||$d->format('Y-m-d')!==$value||$value<'2000-01-01'||$value>'2100-12-31')throw new InvalidArgumentException('Choose a valid planning date.');return $value;
}
function cssv_planner_add_days(string $date,int $days): string {return (new DateTimeImmutable(cssv_planner_date($date),new DateTimeZone('Asia/Karachi')))->modify(($days>=0?'+':'').$days.' days')->format('Y-m-d');}
function cssv_planner_catalog(): array {
 static $units=null;if($units!==null)return $units;$units=[];
 $data=json_decode((string)file_get_contents(dirname(__DIR__).'/fpsc-syllabus.json'),true,64,JSON_THROW_ON_ERROR);
 $index=json_decode((string)file_get_contents(dirname(__DIR__).'/css-past-paper-analysis-index.json'),true,64,JSON_THROW_ON_ERROR);$papers=array_column($index['subjects'],null,'slug');
 foreach($data['subjects'] as $s)foreach($s['sections'] as $i=>$section){
  $id=$s['slug'].':section:'.$i;$legacy=[];foreach($section['items'] as $j=>$item)$legacy[]=$s['slug'].':'.$i.':'.$j;
  $questionCount=0;foreach($papers[$s['slug']]['sections']??[] as $ps)foreach($ps['topics'] as $pt)if($pt['syllabusSectionIndex']===$i)$questionCount+=(int)$pt['questionCount'];
  $units[$id]=['id'=>$id,'subject_id'=>$s['slug'],'subject'=>$s['name'],'designation'=>$s['designation'],'title'=>preg_replace('/\s+/u',' ',trim($section['title'])),'items'=>$section['items'],'legacy_ids'=>$legacy,'source_kind'=>'syllabus_section','paper_count'=>$questionCount,'to'=>'/fpsc-syllabus?subject='.rawurlencode($s['slug']).'&unit='.rawurlencode($id),'paper_to'=>'/css-past-paper-analysis?subject='.rawurlencode($s['slug'])];
 }
 $units['essay:practice']=['id'=>'essay:practice','subject_id'=>'essay','subject'=>'English Essay','designation'=>'compulsory','title'=>'Independent essay outline and writing','items'=>['Use the existing essay preparation resources. Write independently and obtain human mentor feedback.'],'legacy_ids'=>[],'source_kind'=>'learning_resource','paper_count'=>0,'to'=>'/subjects/compulsory/essay','paper_to'=>'/css-past-paper-analysis?subject=essay'];return $units;
}
function cssv_planner_selected(array $attempt,?string $religion): array {
 return array_filter(cssv_planner_catalog(),fn($u)=>$u['designation']==='optional'?in_array($u['subject_id'],$attempt['optional_subject_ids'],true):(!in_array($u['subject_id'],['islamic-studies','comparative-religions'],true)||$u['subject_id']===$religion));
}
function cssv_planner_unit(array $selected,mixed $id): array {if(!is_string($id)||!isset($selected[$id]))throw new InvalidArgumentException('Choose a study unit from this attempt’s selected subjects.');return $selected[$id];}
function cssv_planner_revision(string $today,int $count,string $outcome): array {
 if(!in_array($outcome,['recalled','needs_review'],true))throw new InvalidArgumentException('Record recalled or needs review.');$intervals=cssv_planner_rules()['revision_days'];$next=$outcome==='needs_review'?0:min($count+1,count($intervals)-1);return ['review_count'=>$next,'next_revision'=>cssv_planner_add_days($today,$intervals[$next])];
}
function cssv_planner_import(array $units,array $statuses): array {
 $out=[];foreach($units as $u){$values=[];foreach($u['legacy_ids'] as $id)if(isset($statuses[$id])&&in_array($statuses[$id],['not-started','in-progress','completed'],true))$values[$id]=$statuses[$id];if(!$values)continue;
  $covered=count(array_filter($values,fn($v)=>$v==='completed'));$started=count(array_filter($values,fn($v)=>$v!=='not-started'));$state=$covered===count($u['legacy_ids'])?'covered':($started?'learning':'not_started');$out[]=['unit_id'=>$u['id'],'coverage'=>$state,'legacy_states'=>$values];
 }return $out;
}
function cssv_planner_unit_hash(array $u): string {return cssv_planner_hash(array_intersect_key($u,array_flip(['id','subject_id','title','items'])));}
function cssv_planner_source_changed(array $u,array $r): bool {return isset($r['source']['unit'])&&cssv_planner_unit_hash($r['source']['unit'])!==cssv_planner_unit_hash($u);}
function cssv_planner_capacity(array $attempt,array $units,array $progress,string $today): array {
 $remaining=0;$learnMinutes=0;$covered=0;$total=0;$due=0;
 foreach($units as $u){if($u['source_kind']!=='syllabus_section')continue;$total++;$r=$progress[$u['id']]??[];if(cssv_planner_source_changed($u,$r))$r=[];$isCovered=($r['coverage']??'not_started')==='covered';if($isCovered)$covered++;else{$remaining++;$learnMinutes+=($r['coverage']??'')==='learning'?15:cssv_planner_rules()['minutes']['learn'];}if($isCovered&&isset($r['next_revision'])&&$r['next_revision']<=$today)$due++;}
 $days=$attempt['target_date']?max(0,(int)(new DateTimeImmutable($today))->diff(new DateTimeImmutable($attempt['target_date']))->format('%r%a')):null;
 $capacity=$days===null?null:(int)floor($days*$attempt['daily_minutes']*cssv_planner_rules()['coverage_capacity_share']);
 return ['total'=>$total,'covered'=>$covered,'remaining'=>$remaining,'coverage_percentage'=>$total?round(100*$covered/$total,1):null,'revision_due'=>$due,'days_remaining'=>$days,'estimated_coverage_minutes'=>$learnMinutes,'coverage_capacity_minutes'=>$capacity,'estimated_shortfall_minutes'=>$capacity===null?null:max(0,$learnMinutes-$capacity),'basis'=>'Self-reported repository syllabus-section coverage; the separate essay resource is excluded. Estimates reserve 60% of available time for coverage, not a guarantee of completion or an examination score.'];
}
/** Stable lane-balanced allocation. Completed and partial allocations are never replaced. */
function cssv_planner_allocate(array $candidates,int $budget,array $tasks,?string $day=null): array {
 $locked=[];$used=0;$blocked=[];
 foreach($tasks as $task){$used+=$task['actual_minutes'];if(in_array($task['status'],['completed','partial'],true)){$used+=$task['status']==='partial'?$task['minutes']-$task['actual_minutes']:0;$blocked[$task['work_key']]=true;if($task['status']==='partial')$locked[]=$task;}elseif(in_array($task['status'],['skipped','moved'],true))$blocked[$task['work_key']]=true;}
 $unique=[];foreach($candidates as $c)if(!isset($blocked[$c['work_key']])&&(!isset($unique[$c['work_key']])||$c['priority']>$unique[$c['work_key']]['priority']))$unique[$c['work_key']]=$c;
 $sorted=array_values($unique);usort($sorted,fn($a,$b)=>($b['priority']<=>$a['priority'])?:strcmp($a['work_key'],$b['work_key']));$first=[];$rest=[];$seen=[];
 foreach($sorted as $c){if(isset($seen[$c['lane']]))$rest[]=$c;else{$seen[$c['lane']]=true;$first[]=$c;}}
 $urgent=array_values(array_filter($sorted,fn($c)=>$c['priority']>=85));$rest=array_values(array_filter($rest,fn($c)=>$c['priority']<85));$routine=array_values(array_filter($first,fn($c)=>$c['priority']<85));if($day&&count($routine)>1){usort($routine,fn($a,$b)=>strcmp($a['lane'],$b['lane']));$turn=intdiv((int)(new DateTimeImmutable(cssv_planner_date($day),new DateTimeZone('UTC')))->format('U'),86400);$shift=(int)$turn%count($routine);$routine=[...array_slice($routine,$shift),...array_slice($routine,0,$shift)];}$selected=[];$left=max(0,$budget-$used);foreach([...$urgent,...$routine,...$rest] as $c){if(count($selected)+count($locked)>=cssv_planner_rules()['maximum_tasks']||$left===0)break;if($left<min(cssv_planner_rules()['minimum_block'],$c['minutes']))continue;$c['minutes']=min($c['minutes'],$left);$left-=$c['minutes'];$selected[]=$c;}
 return ['tasks'=>$selected,'locked'=>$locked,'allocated_minutes'=>$budget-$left,'remaining_minutes'=>$left,'recorded_over_budget_minutes'=>max(0,$used-$budget)];
}
