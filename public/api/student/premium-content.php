<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_premium.php';
cssv_require_method('GET');
header('X-Robots-Tag: noindex, nofollow');
try {
    cssv_pro_fields($_GET,['file']);
    $file=$_GET['file']??'';
    if (!is_string($file) || !($path=cssv_premium_file($file))) cssv_fail('This study resource is unavailable.',404,'resource_not_found');
    $pdo=cssv_db();
    // A shared subject file may serve its free science portion without sign-in.
    if ($file==='css-subject-mcqs/general-science-and-ability.json' && !cssv_premium_active($pdo)) {
        $bank=json_decode((string)file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
        cssv_json(array_values(array_filter($bank,fn($q)=>!in_array($q['topic']??'',cssv_premium_ability_topics(),true))));
    }
    // Owner editorial seed access uses the existing separate MFA admin session.
    $admin=false;
    if (in_array($file,['current-affairs-issues','current-affairs-topics'],true)) {
        require_once dirname(__DIR__).'/_admin_auth.php';
        cssv_admin_ensure_schema($pdo);
        $admin=cssv_admin_current_session($pdo,true)!==null;
    }
    if (!$admin) {
        $session=cssv_require_user($pdo);
        cssv_pro_require_active($pdo,(string)$session['user_id']);
    }
    if ($file==='current-affairs-topics') {
        $row=$pdo->query("SELECT content FROM site_content WHERE id='published'")->fetchColumn();
        $content=$row ? json_decode($row,true,64,JSON_THROW_ON_ERROR) : [];
        $topics=$content['caTopics']??[];
        cssv_json($admin ? $topics : array_values(array_filter($topics,fn($t)=>($t['published']??false)===true)));
    }
    if (!is_file($path)) cssv_fail('This study resource is temporarily unavailable.',503,'resource_unavailable');
    if(str_starts_with($file,'mcq/')) cssv_json(cssv_premium_central_bank($pdo,$file,$path));
    header('X-Robots-Tag: noindex, nofollow');
    if (str_ends_with($path,'.pdf')) {
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="'.basename($path).'"');
        header('X-Frame-Options: SAMEORIGIN');
    } else header('Content-Type: application/json; charset=UTF-8');
    readfile($path);
} catch (Throwable $e) { cssv_pro_problem($e); }
