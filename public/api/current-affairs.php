<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_current_affairs.php';
cssv_require_method('GET','POST');
$pdo=null;
try {
    $pdo=cssv_db();
    $session=cssv_require_user($pdo);
    $userId=$session['user_id'];
    // Prevent a response for a different cookie account during tab/account switching.
    $expected=$_SERVER['HTTP_X_CSSV_USER'] ?? '';
    if ($expected!=='' && !hash_equals($userId,$expected)) cssv_fail('Your account changed. Sign in again to continue.',401,'account_changed');
    if ($_SERVER['REQUEST_METHOD']==='POST') cssv_require_csrf($session);
    ca_ensure_schema($pdo);
    ca_sync_git_release($pdo);
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        $body=ca_request_json();
        if (array_key_exists('user_id',$body)) throw new InvalidArgumentException('Personal records always use the signed-in account.');
        $action=$body['action'] ?? '';
        if ($action==='preferences') {
            $mode=$body['reading_mode'] ?? 'quick';
            if (!in_array($mode,['quick','full'],true)) throw new InvalidArgumentException('Choose Quick Read or Full Analysis.');
            $categories=ca_list($body['preferred_categories'] ?? [],'preferred_categories',50);
            foreach ($categories as $category) ca_text($category,'preferred category',120);
            $name=isset($body['display_name']) ? ca_text($body['display_name'],'display name',160) : null;
            $pdo->beginTransaction();
            $pdo->prepare('INSERT INTO current_affairs_preferences (user_id,reading_mode,preferred_categories) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reading_mode=VALUES(reading_mode),preferred_categories=VALUES(preferred_categories)')
                ->execute([$userId,$mode,ca_json_encode(array_values(array_unique($categories)))]);
            if ($name!==null) $pdo->prepare('UPDATE student_profiles SET display_name=?,updated_at=NOW(6) WHERE user_id=?')->execute([$name,$userId]);
            $pdo->commit();
            cssv_json(['ok'=>true,'preferences'=>ca_preferences($pdo,$userId)]);
        }
        if (!in_array($action,['bookmark','reading'],true)) throw new InvalidArgumentException('Unknown account action.');
        $id=ca_text($body['id'] ?? null,'story id',128);
        if (!ca_query_items($pdo,$userId,' AND i.id=?',[$id],1)) cssv_fail('This development is no longer available.',404,'story_not_found');
        if ($action==='bookmark') {
            if (!is_bool($body['saved'] ?? null)) throw new InvalidArgumentException('saved must be true or false.');
            $saved=(int)$body['saved'];
            $pdo->prepare('INSERT INTO current_affairs_user_items (user_id,item_id,saved,saved_at) VALUES (?,?,?,IF(?=1,NOW(6),NULL)) ON DUPLICATE KEY UPDATE saved=VALUES(saved),saved_at=IF(VALUES(saved)=1,COALESCE(saved_at,NOW(6)),NULL)')
                ->execute([$userId,$id,$saved,$saved]);
        } else {
            $status=$body['status'] ?? '';
            if (!in_array($status,['unread','opened','read'],true)) throw new InvalidArgumentException('Invalid reading status.');
            $pdo->prepare('INSERT IGNORE INTO current_affairs_user_items (user_id,item_id) VALUES (?,?)')->execute([$userId,$id]);
            if ($status==='opened') {
                $sql="UPDATE current_affairs_user_items SET status=IF(status='read','read','opened'),first_opened_at=COALESCE(first_opened_at,NOW(6)),last_opened_at=NOW(6) WHERE user_id=? AND item_id=?";
            } elseif ($status==='read') {
                $sql="UPDATE current_affairs_user_items SET status='read',first_opened_at=COALESCE(first_opened_at,NOW(6)),last_opened_at=NOW(6),completed_at=COALESCE(completed_at,NOW(6)) WHERE user_id=? AND item_id=?";
            } else {
                $sql="UPDATE current_affairs_user_items SET status='unread',completed_at=NULL WHERE user_id=? AND item_id=?";
            }
            $pdo->prepare($sql)->execute([$userId,$id]);
        }
        $q=$pdo->prepare('SELECT saved,status FROM current_affairs_user_items WHERE user_id=? AND item_id=?');
        $q->execute([$userId,$id]); $state=$q->fetch();
        cssv_json(['ok'=>true,'saved'=>(bool)$state['saved'],'reading_status'=>$state['status']]);
    }
    $view=ca_query_param('view',20) ?: 'feed';
    if ($view==='preferences') cssv_json(['ok'=>true,'preferences'=>ca_preferences($pdo,$userId),'categories'=>ca_categories($pdo),'display_name'=>$session['display_name'] ?? '','email'=>$session['email']]);
    if ($view==='story') {
        $rows=ca_query_items($pdo,$userId,' AND i.id=?',[ca_query_param('id',128)],1);
        if (!$rows) cssv_fail('This development is no longer available.',404,'story_not_found');
        cssv_json(['ok'=>true,'story'=>ca_card($rows[0],true),'preferences'=>ca_preferences($pdo,$userId)]);
    }
    $date=ca_query_param('date',10); $date=$date!=='' ? ca_resolve_date($pdo,$date) : ca_today();
    if ($view==='overview') {
        $reading=ca_query_items($pdo,$userId," AND u.status='opened'",[],4,0,'u.last_opened_at DESC,i.id');
        $saved=ca_query_items($pdo,$userId,' AND u.saved=1',[],4,0,'u.saved_at DESC,i.id');
        $today=ca_query_items($pdo,$userId,' AND i.publication_date=?',[$date],100);
        $preferred=ca_preferences($pdo,$userId)['preferred_categories'];
        usort($today,fn($a,$b)=>(int)in_array($b['category'],$preferred,true) <=> (int)in_array($a['category'],$preferred,true));
        $q=$pdo->prepare("SELECT COUNT(*) FROM current_affairs_user_items WHERE user_id=? AND status='read' AND completed_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY)");
        $q->execute([$userId]);
        cssv_json(['ok'=>true,'summary'=>ca_summary($pdo,$userId,$date),'preferences'=>ca_preferences($pdo,$userId),
            'display_name'=>$session['display_name'] ?? '', 'continue_reading'=>array_map('ca_card',$reading),'saved'=>array_map('ca_card',$saved),
            'stories'=>array_map('ca_card',array_slice($today,0,6)),'facts'=>array_map(fn($r)=>ca_card($r,false,true),$today),'weekly_read'=>(int)$q->fetchColumn()]);
    }
    if (!in_array($view,['feed','factbook','archive'],true)) throw new InvalidArgumentException('Unknown briefing view.');
    [$where,$params]=ca_filters($pdo);
    $page=ca_query_param('page',6) ?: '1';
    if (!ctype_digit($page) || (int)$page<1 || (int)$page>10000) throw new InvalidArgumentException('Invalid results page.');
    $offset=((int)$page-1)*20;
    if ($view==='archive') {
        $q=$pdo->prepare('SELECT i.publication_date,d.edition,d.published_at,COUNT(*) story_count FROM current_affairs_items i JOIN current_affairs_days d ON d.publication_date=i.publication_date LEFT JOIN current_affairs_user_items u ON u.item_id=i.id AND u.user_id=? WHERE '.ca_visible().$where.' GROUP BY i.publication_date,d.edition,d.published_at ORDER BY i.publication_date DESC LIMIT 21 OFFSET '.$offset);
        $q->execute(array_merge([$userId],$params));$rows=$q->fetchAll();
        cssv_json(['ok'=>true,'days'=>array_map(fn($r)=>array_merge($r,['story_count'=>(int)$r['story_count']]),array_slice($rows,0,20)),
            'has_more'=>count($rows)>20,'categories'=>ca_categories($pdo)]);
    }
    $rows=ca_query_items($pdo,$userId,$where,$params,21,$offset);
    cssv_json(['ok'=>true,'items'=>array_map(fn($r)=>ca_card($r,false,$view==='factbook'),array_slice($rows,0,20)),
        'has_more'=>count($rows)>20,'page'=>(int)$page,'summary'=>ca_summary($pdo,$userId,$date),'categories'=>ca_categories($pdo),'preferences'=>ca_preferences($pdo,$userId)]);
} catch (Throwable $e) { ca_problem($e,$pdo); }
