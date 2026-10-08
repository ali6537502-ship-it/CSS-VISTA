<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_planner_reading.php';require __DIR__.'/../../public/api/_planner_core.php';require __DIR__.'/../../public/api/_planner_schema.php';
$count=0;function check(bool $value,string $why): void {global $count;$count++;if(!$value)throw new RuntimeException($why);}
$schema=implode(";\n",cssv_reading_schema_statements()).';';
$migration=file_get_contents(__DIR__.'/../../server/sql/021_connected_reading.sql');$migration=preg_replace('/^--[^\n]*\n/m','',$migration);check(trim($schema)===trim($migration),'Additive migration/runtime parity');
$source=['source_hash'=>str_repeat('a',64),'date'=>'2026-10-07'];$r=['version'=>2,'saved'=>true,'read_date'=>'2026-10-08','last_review'=>null,'next_revision'=>'2026-10-09','review_count'=>0,'source_hash'=>$source['source_hash'],'read_hash'=>$source['source_hash']];
check(cssv_reading_card($source,null)['read_date']===null,'Page view invents reading');check(!cssv_reading_card($source,$r)['source_changed'],'Unchanged source');
foreach(['source_hash','read_hash'] as $k){$changed=$r;$changed[$k]=str_repeat('b',64);check(cssv_reading_card($source,$changed)['source_changed'],'Corrected source needs review');}
check(!cssv_reading_card($source,$r,false)['available'],'Withdrawn snapshot retained');
check(cssv_planner_day(new DateTimeImmutable('2026-10-07T19:01:00Z'))==='2026-10-08','Pakistan publication/completion boundary');
foreach([0,1,2,3,4,5,99] as $step){$review=cssv_planner_revision('2026-10-08',$step,'recalled');check($review['next_revision']>'2026-10-08','Due review moves forward');check(cssv_planner_revision('2026-10-08',$step,'needs_review')['next_revision']==='2026-10-09','Failed recall schedules tomorrow');}
echo "PASS: $count reading assertions for source-version change, withdrawn snapshots, no view credit, Pakistan midnight, revision intervals and migration/runtime parity.\n";
