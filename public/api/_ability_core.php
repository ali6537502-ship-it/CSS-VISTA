<?php
declare(strict_types=1);

function cssv_ability_course(): array {
    static $course=null;
    if($course===null){
        $file=__DIR__.'/_premium_files/general-ability-course.json';
        $raw=(string)file_get_contents($file);
        $course=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
        $course['version']=hash('sha256',$raw);
    }
    return $course;
}
function cssv_ability_unit(mixed $id): array {
    if(!is_string($id))throw new InvalidArgumentException('Choose a course topic.');
    foreach(cssv_ability_course()['units'] as $unit)if($unit['id']===$id)return $unit;
    throw new OutOfBoundsException('Course topic not found.');
}
function cssv_ability_lesson(array $unit,mixed $id): array {
    if(!is_string($id))throw new InvalidArgumentException('Choose a lesson.');
    foreach($unit['lessons'] as $lesson)if($lesson['id']===$id)return $lesson;
    throw new OutOfBoundsException('Lesson not found in this topic.');
}
function cssv_ability_client_unit(array $unit): array {
    foreach($unit['lessons'] as &$lesson)foreach(['answer','proof','explanation'] as $key)unset($lesson['exercise'][$key]);
    unset($lesson);
    foreach($unit['quiz'] as &$question)foreach(['answer','proof','explanation'] as $key)unset($question[$key]);
    unset($question);
    return $unit;
}
function cssv_ability_number(mixed $input): float {
    if(!is_string($input)||strlen($input)>60)throw new InvalidArgumentException('Enter a number or a fraction such as 3/4.');
    $input=trim($input);
    if(preg_match('~^([+-]?\d{1,12})\s*/\s*(\d{1,12})$~D',$input,$match)){
        if((float)$match[2]===0.0)throw new InvalidArgumentException('A fraction cannot have a zero denominator.');
        return (float)$match[1]/(float)$match[2];
    }
    if(!preg_match('~^[+-]?(?:\d{1,12}(?:\.\d{1,8})?|\.\d{1,8})$~D',$input))throw new InvalidArgumentException('Use digits with an optional decimal point, or a fraction.');
    return (float)$input;
}
function cssv_ability_exercise(array $lesson,mixed $input): array {
    if(($lesson['exercise']['kind']??null)==='choice'){
        if(!is_string($input)||!preg_match('/^[0-3]$/D',$input))throw new InvalidArgumentException('Choose one of the four listed options.');
        $q=$lesson['exercise'];$choice=(int)$input;
        return ['lesson_id'=>$lesson['id'],'question_id'=>$q['id'],'prompt'=>$q['prompt'],'unit'=>$q['unit'],'submitted'=>$q['options'][$choice],'correct'=>$choice===$q['answer'],'answer'=>$q['options'][$q['answer']],'explanation'=>$q['explanation']];
    }
    $answer=cssv_ability_number($input);$q=$lesson['exercise'];$expected=cssv_ability_number($q['answer']);
    $correct=abs($answer-$expected)<=0.000000001;
    // Only recurring decimal targets accept the stated two-place rounding.
    // Do not accept a neighbourhood around an integer or an exact decimal.
    if(str_contains($q['answer'],'/')){
        $denominator=(int)explode('/',$q['answer'])[1];
        while($denominator%2===0)$denominator=intdiv($denominator,2);
        while($denominator%5===0)$denominator=intdiv($denominator,5);
        if($denominator!==1)$correct=$correct||abs($answer-round($expected,2))<=0.000000001;
    }
    return ['lesson_id'=>$lesson['id'],'question_id'=>$q['id'],'prompt'=>$q['prompt'],'unit'=>$q['unit'],
        'submitted'=>trim($input),'correct'=>$correct,'answer'=>$q['answer'],'explanation'=>$q['explanation']];
}
/** Only unchanged reviewed units may inherit evidence from a prior edition. */
function cssv_ability_versions(string $unitId): array {
    static $cache=[];if(isset($cache[$unitId]))return $cache[$unitId];
    $course=cssv_ability_course();$unit=cssv_ability_unit($unitId);
    $hash=hash('sha256',json_encode($unit,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));$versions=[$course['version']];
    foreach($course['previous_editions']??[] as $version=>$units)if(preg_match('/^[a-f0-9]{64}$/D',$version)&&isset($units[$unitId])&&hash_equals($hash,$units[$unitId]))$versions[]=$version;
    return $cache[$unitId]=$versions;
}
function cssv_ability_quiz(array $unit,mixed $choices): array {
    if(!is_array($choices)||array_is_list($choices))throw new InvalidArgumentException('Answer all five quiz questions.');
    $keys=array_keys($choices);$expected=array_column($unit['quiz'],'id');sort($keys);sort($expected);
    if($keys!==$expected)throw new InvalidArgumentException('Answer the exact questions in this topic quiz.');
    $results=[];$correct=0;
    foreach($unit['quiz'] as $q){
        $choice=$choices[$q['id']];
        if(!is_int($choice)||$choice<0||$choice>3)throw new InvalidArgumentException('Choose one available option for each question.');
        $right=$choice===$q['answer'];if($right)$correct++;
        $results[]=['question_id'=>$q['id'],'prompt'=>$q['prompt'],'options'=>$q['options'],'unit'=>$q['unit'],
            'choice'=>$choice,'correct'=>$right,'answer'=>$q['answer'],'explanation'=>$q['explanation']];
    }
    return ['correct'=>$correct,'total'=>5,'score'=>$correct*20,'passed'=>$correct>=4,'results'=>$results];
}
