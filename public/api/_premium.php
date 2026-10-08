<?php
declare(strict_types=1);
require_once __DIR__.'/_pro.php';
require_once __DIR__.'/_profile.php';

// General Science stays free; the Ability part of its shared bank is Pro.
function cssv_premium_ability_topics(): array {
    return ['Basic arithmetic','Arithmetic and percentages','Numerical ability','Number patterns',
        'Deductive reasoning','Verbal ability','Mechanical ability','Social ability and psychometrics',
        'Relations and directions','Sets and probability','Random sampling','Data interpretation',
        'Decision analysis','Analytical constraints','Calendar reasoning','Clock reasoning'];
}

function cssv_premium_file(string $file): ?string {
    if (in_array($file, ['study-material/essay-themes.json','one-liner-gk/general-ability.json',
        'one-liner-gk/current-affairs-archive.json','one-liner-gk/pakistan-current-affairs.json','css-subject-mcqs/general-science-and-ability.json',
        'css-subject-mcqs/current-affairs.json','recent-affairs/batch-2026-07-11_2026-08-16.json'],true)
        || preg_match('~^mcq/cat-(?:general-ability|current-affairs)-[0-9]+\.json$~D',$file)
        || preg_match('~^magazines/css-vista-current-affairs-weekly-(?:15-august|25-august|03-september)-2026\.pdf$~D',$file)) {
        return dirname(__DIR__).'/'.$file;
    }
    if ($file==='current-affairs-issues') return __DIR__.'/_premium_files/current-affairs-issues.json';
    if ($file==='current-affairs-topics') return __DIR__.'/content.php';
    return null;
}

function cssv_premium_active(PDO $pdo): bool {
    $session=cssv_current_session($pdo);
    if (!$session) return false;
    cssv_pro_ensure_schema($pdo);
    return cssv_pro_membership($pdo,(string)$session['user_id'])['status']==='active'
        && cssv_profile_status(cssv_profile_for_user($pdo,(string)$session['user_id']))['complete'];
}

function cssv_premium_public_content(PDO $pdo, object $content): object {
    require_once __DIR__.'/_admin_auth.php';
    if (!empty($_COOKIE[CSSV_ADMIN_SESSION_COOKIE]) && cssv_admin_current_session($pdo,true)) return $content;
    // The public CMS response must never republish premium teaching content.
    $content->caTopics=[];
    $content->mcqs=array_values(array_filter($content->mcqs??[],fn($q)=>!in_array($q->category??'', ['general-ability','current-affairs'],true)));
    $idsPath=__DIR__.'/_premium_files/question-ids.json';
    if(!is_file($idsPath))throw new RuntimeException('Protected question catalogue unavailable.');
    $ids=array_fill_keys(json_decode((string)file_get_contents($idsPath),true,32,JSON_THROW_ON_ERROR),true);
    foreach($content->mcqOverrides??[] as $override) {
        if(isset($ids[$override->id??''])) foreach(['q','o','a','e'] as $key) unset($override->$key);
    }
    return $content;
}

function cssv_premium_central_bank(PDO $pdo,string $file,string $path): array {
    $bank=json_decode((string)file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
    $raw=$pdo->query("SELECT content FROM site_content WHERE id='published'")->fetchColumn();
    $content=$raw ? json_decode($raw,true,64,JSON_THROW_ON_ERROR) : [];
    $overrides=array_column($content['mcqOverrides']??[],null,'id');
    foreach($bank as &$q) {
        $override=$overrides[$q['id']]??[];
        foreach(['q','o','a','e'] as $key) if(array_key_exists($key,$override))$q[$key]=$override[$key];
    }
    unset($q);
    if(preg_match('~^mcq/cat-(general-ability|current-affairs)-0\.json$~D',$file,$match)) {
        foreach($content['mcqs']??[] as $q) if(($q['category']??'')===$match[1])$bank[]=[
            'id'=>'adm-'.$q['id'],'q'=>$q['question'],'o'=>$q['options'],'a'=>$q['answer'],
            'e'=>$q['explanation']??null,'s'=>$q['topic']??null,
            'd'=>($q['difficulty']??'')==='Easy'?'Basic':(($q['difficulty']??'')==='Hard'?'Advanced':'Intermediate')];
    }
    return $bank;
}
