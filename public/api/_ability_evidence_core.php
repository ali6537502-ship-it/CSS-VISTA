<?php
declare(strict_types=1);
/** Summarise stored deterministic grading. Reading and retries never improve first answers. */
function cssv_ability_learning_evidence(array $summary,array $rows): array {
    $units=array_column($summary['units'],null,'id');
    $out=['course_version'=>$summary['course_version'],'scope'=>'account','first_exercises'=>['correct'=>0,'total'=>0],'exercise_attempts'=>0,'repeated_exercises'=>0,'first_quizzes'=>['correct'=>0,'total'=>0,'quizzes'=>0],'quiz_attempts'=>0,'repeated_quizzes'=>0,'completed_exercises'=>0,'total_exercises'=>0,'completed_topics'=>0,'total_topics'=>count($units),'latest_review'=>[],'unavailable_records'=>0,'resume'=>null,'next'=>null];
    foreach($units as $u){$out['completed_exercises']+=count($u['completed_lessons']);$out['total_exercises']+=$u['lesson_count'];$out['completed_topics']+=(int)$u['complete'];}
    $identities=[];$review=[];
    foreach($rows as $row){
        $u=$units[$row['unit_id']]??null;$f=$row['feedback']??null;$mode=$row['mode'];$lesson=$row['lesson_id'];
        $valid=$u && is_array($f) && in_array($mode,['exercise','quiz'],true);
        if($mode==='exercise')$valid=$valid && in_array($lesson,array_column($u['lessons']??[],'id'),true) && ($f['lesson_id']??null)===$lesson && is_bool($f['correct']??null);
        else $valid=$valid && $lesson==='quiz' && is_int($f['correct']??null) && is_int($f['total']??null) && $f['total']>0 && $f['correct']>=0 && $f['correct']<=$f['total'] && is_array($f['results']??null) && count($f['results'])===$f['total'] && count(array_filter($f['results'],fn($r)=>is_bool($r['correct']??null)))===$f['total'] && count(array_filter($f['results'],fn($r)=>$r['correct']))===$f['correct'];
        if(!$valid){$out['unavailable_records']++;continue;}
        $identities[]=$row['id'];
        if((int)$row['first_rank']===1){
            if($mode==='exercise'){$out['first_exercises']['total']++;$out['first_exercises']['correct']+=(int)$f['correct'];}
            else{$out['first_quizzes']['quizzes']++;$out['first_quizzes']['total']+=$f['total'];$out['first_quizzes']['correct']+=$f['correct'];}
        }
        if((int)$row['latest_rank']===1){
            $key=$mode==='exercise'?'exercise_attempts':'quiz_attempts';$out[$key]+=(int)$row['tries'];
            $missed=$mode==='exercise'?($f['correct']?0:1):$f['total']-$f['correct'];
            if($missed)$review[$row['unit_id']][$lesson]=['unit_id'=>$u['id'],'title'=>$u['title'],'lesson_id'=>$lesson,'mode'=>$mode,'missed'=>$missed,'response_id'=>$row['id']];
        }
    }
    foreach($units as $u){foreach($u['lessons'] as $lesson)if(isset($review[$u['id']][$lesson['id']]))$out['latest_review'][]=$review[$u['id']][$lesson['id']];if(isset($review[$u['id']]['quiz']))$out['latest_review'][]=$review[$u['id']]['quiz'];}
    $out['repeated_exercises']=max(0,$out['exercise_attempts']-$out['first_exercises']['total']);$out['repeated_quizzes']=max(0,$out['quiz_attempts']-$out['first_quizzes']['quizzes']);
    $position=$summary['position'];$u=$units[$position['unit_id']??'']??null;
    if($u && (($position['lesson_id']??'')==='quiz' || in_array($position['lesson_id'],array_column($u['lessons'],'id'),true)))$out['resume']=['unit_id'=>$u['id'],'title'=>$u['title'],'lesson_id'=>$position['lesson_id'],'mode'=>$position['lesson_id']==='quiz'?'quiz':'exercise'];
    if($out['latest_review'])$out['next']=[...$out['latest_review'][0],'reason'=>'review'];
    else {
        foreach($units as $u)if(!$u['complete']){
            $lesson='quiz';foreach($u['lessons'] as $l)if(!in_array($l['id'],$u['completed_lessons'],true)){$lesson=$l['id'];break;}
            $out['next']=['unit_id'=>$u['id'],'title'=>$u['title'],'lesson_id'=>$lesson,'mode'=>$lesson==='quiz'?'quiz':'exercise','reason'=>'continue'];break;
        }
        if(!$out['next'] && $out['resume'])$out['next']=[...$out['resume'],'reason'=>'maintenance'];
    }
    sort($identities);$out['revision']=hash('sha256',json_encode([$summary['course_version'],$identities,$out['resume'],$out['next']],JSON_THROW_ON_ERROR));
    $out['basis']='These are your account-wide maths results, shared across preparation attempts. First answers stay separate from retries. Completed exercises record a correct answer at least once; later mistakes still need review. Reading or saving a place earns no credit. Course progress does not measure exam readiness.';
    return $out;
}
