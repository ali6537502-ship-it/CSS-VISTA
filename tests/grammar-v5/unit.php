<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_grammar_v5_core.php';
require_once __DIR__.'/../../public/api/_grammar_v5_progress.php';
function check(bool $ok,string $message): void {if(!$ok)throw new RuntimeException($message);}
function rejects(callable $f,string $type): void {try{$f();}catch(Throwable $e){check($e instanceof $type,'Wrong rejection: '.get_class($e));return;}throw new RuntimeException('Invalid input accepted');}
$c=cssv_gv5_catalog();$q=current(array_filter($c['items'],fn($q)=>$q['type']==='objective'));$r=current(array_filter($c['items'],fn($q)=>$q['type']==='response'));$concept=$c['concepts'][0]['id'];
$s=['curriculumVersion'=>$c['version'],'completed'=>[],'studied'=>[],'answers'=>[],'drafts'=>[],'selfReviews'=>[],'revealed'=>[],'notes'=>[],'bookmarks'=>[],'reviews'=>[],'cursor'=>['day'=>1,'section'=>'orientation','item'=>''],'checks'=>[]];
check(cssv_gv5_state($s)===$s,'Blank round-trip');
$old=$s;$old['notes'][$concept]=str_repeat('Original private note. ',12000);$old['drafts'][$r['id']]='Independent response';$old['completed']=[$c['days'][0]['id']];$old['answers'][$q['id']]=['first'=>0,'firstAt'=>1000,'latest'=>1,'latestAt'=>2000,'exposures'=>2];$old['reviews'][$q['id']]=['lastAt'=>2000,'dueAt'=>86402000,'streak'=>0,'lapses'=>1];
check(strlen(cssv_gv5_state($old)['notes'][$concept])>200000,'Long notes truncated');
$kept=cssv_gv5_preserve($old,$s);check($kept['notes']===$old['notes'] && $kept['answers']===$old['answers'] && $kept['reviews']===$old['reviews'] && $kept['completed']===$old['completed'],'Restore erased evidence');
$bad=$old;$bad['answers'][$q['id']]['first']=2;rejects(fn()=>cssv_gv5_preserve($old,$bad),DomainException::class);
$bad=$s;$bad['answers']['invented']=['first'=>0];rejects(fn()=>cssv_gv5_state($bad),InvalidArgumentException::class);
$bad=$old;$bad['answers'][$q['id']]['latest']=4;rejects(fn()=>cssv_gv5_state($bad),InvalidArgumentException::class);
$bad=$s;$bad['curriculumVersion']='legacy-v4';rejects(fn()=>cssv_gv5_state($bad),InvalidArgumentException::class);
$bad=$s;$bad['selfReviews'][$r['id']]='automatically mastered';rejects(fn()=>cssv_gv5_state($bad),InvalidArgumentException::class);
$profile=cssv_gv5_planner_progress($old,86403000);check($profile['edition']==='v5'&&$profile['profile']['totals']['questions']===1&&$profile['profile']['totals']['completed']===1,'Planner did not use distinct reconstructed evidence');check($profile['profile']['totals']['due']===1,'Planner lost due retrieval');
echo "PASS: strict edition/catalog, long original writing, additive restore, immutable first evidence, review preservation and honest self-review labels.\n";
