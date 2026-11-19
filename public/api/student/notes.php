<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_student_notes.php';
cssv_require_method('GET','POST');
if (cssv_env('CSSV_NOTES_ENABLED','0') !== '1') cssv_fail('Personal notes are temporarily unavailable until secure recovery is enabled.',503,'personal_notes_not_enabled');

try {
    $pdo=cssv_db();
    $session=cssv_require_user($pdo);
    $user=(string)$session['user_id'];
    if ($_SERVER['REQUEST_METHOD']==='POST') cssv_require_csrf($session);
    cssv_notes_schema($pdo);

    if ($_SERVER['REQUEST_METHOD']==='POST') {
        $body=cssv_request_json(CSSV_NOTES_PAGE_BYTES+16384);
        $action=$body['action']??'';
        // Structural operations are logged and rate-limited. Autosaves are
        // deliberately not added to the login security event log on every edit.
        if ($action!=='page_save') {
            $limit=$pdo->prepare("SELECT COUNT(*) FROM login_security_events WHERE user_id=? AND event_type='note_structure' AND occurred_at>=DATE_SUB(NOW(6),INTERVAL 1 HOUR)");
            $limit->execute([$user]);
            if ((int)$limit->fetchColumn()>=300) cssv_fail('Too many folder or note changes. Try again later.',429,'notes_rate_limited');
            cssv_log_security_event($pdo,'note_structure',$user);
        }
        $result=cssv_notes_mutate($pdo,$user,$body);
        cssv_json(['ok'=>true,...$result]);
    }

    $view=$_GET['view']??'list';
    if (!is_string($view)) throw new InvalidArgumentException('Invalid notes view.');
    if ($view==='list') cssv_json(['ok'=>true,...cssv_notes_list($pdo,$user,$_GET)]);
    if ($view==='note') {
        $id=cssv_notes_id($_GET['id']??null);
        cssv_json(['ok'=>true,...cssv_notes_detail($pdo,$user,$id)]);
    }
    if ($view==='page') {
        $id=cssv_notes_id($_GET['id']??null);
        $page=cssv_notes_own_page($pdo,$user,$id);
        cssv_notes_own_note($pdo,$user,$page['note_id']);
        cssv_json(['ok'=>true,'page'=>$page]);
    }
    if ($view==='history') {
        $id=cssv_notes_id($_GET['id']??null);
        cssv_json(['ok'=>true,...cssv_notes_page_history($pdo,$user,$id)]);
    }
    if ($view==='revision') {
        $id=cssv_notes_id($_GET['id']??null);
        $version=filter_var($_GET['version']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        if ($version===false) throw new InvalidArgumentException('Invalid revision number.');
        cssv_notes_own_page($pdo,$user,$id);
        $q=$pdo->prepare('SELECT version,content_html,created_at FROM student_note_revisions WHERE user_id=? AND page_id=? AND version=? LIMIT 1');
        $q->execute([$user,$id,$version]);$revision=$q->fetch();
        if (!$revision) throw new OutOfBoundsException('Earlier version was not found.');
        cssv_json(['ok'=>true,'revision'=>$revision]);
    }
    throw new InvalidArgumentException('Unknown notes view.');
} catch (DomainException $error) {
    cssv_fail($error->getMessage(),409,'note_version_conflict');
} catch (OutOfBoundsException $error) {
    cssv_fail($error->getMessage(),404,'note_not_found');
} catch (InvalidArgumentException $error) {
    cssv_fail($error->getMessage(),422,'invalid_note_request');
} catch (Throwable $error) {
    error_log('CSSV notes failure: '.get_class($error).' #'.(string)$error->getCode());
    cssv_fail('Your notes are temporarily unavailable. Local drafts have not been removed.',503,'notes_unavailable');
}
