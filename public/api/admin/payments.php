<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_admin_auth.php';
require_once dirname(__DIR__) . '/_pro.php';
cssv_require_method('GET','POST');
try {
    $pdo=cssv_db(); $admin=cssv_require_separate_admin($pdo);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE] ?? ''); $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($cookie === '' || $token === '' || !hash_equals($cookie,$token) || !hash_equals($admin['csrf_hash'],cssv_hash_secret($token))) cssv_fail('Refresh your admin session before reviewing a payment.',403,'invalid_csrf');
    }
    cssv_pro_ensure_schema($pdo);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $id=cssv_pro_review($pdo,$admin,cssv_request_json(4096));
        $order=cssv_pro_order($pdo,$id,null);
        cssv_json(['ok'=>true,'order'=>$order,'membership'=>cssv_pro_membership($pdo,$order['user_id'])]);
    }
    if (isset($_GET['order_id'])) {
        $order=cssv_pro_order($pdo,cssv_pro_id($_GET['order_id']),null);
        cssv_json(['ok'=>true,'order'=>$order,'membership'=>cssv_pro_membership($pdo,$order['user_id'])]);
    }
    $status=$_GET['status'] ?? 'pending';
    if (!in_array($status,['pending','approved','rejected'],true)) throw new InvalidArgumentException('Choose a valid payment filter.');
    $offset=filter_var($_GET['offset'] ?? 0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
    if ($offset === false) throw new InvalidArgumentException('Invalid payment page.');
    $q=$pdo->prepare('SELECT s.id,s.order_id,s.transaction_id,s.status,s.submitted_at,s.reviewed_at,s.review_reason,s.reviewed_by,o.amount_minor,o.receiver_number,o.receiver_title,u.email,p.display_name,m.expires_at FROM pro_submissions s JOIN pro_orders o ON o.id=s.order_id JOIN users u ON u.id=o.user_id LEFT JOIN student_profiles p ON p.user_id=u.id LEFT JOIN pro_memberships m ON m.user_id=u.id WHERE s.status=? ORDER BY s.submitted_at DESC,s.id LIMIT 51 OFFSET '.(int)$offset);
    $q->execute([$status]); $rows=$q->fetchAll(); $more=count($rows)>50; $rows=array_slice($rows,0,50);
    foreach ($rows as &$row) {
        $row['amount_minor']=(int)$row['amount_minor'];
        foreach (['submitted_at','reviewed_at','expires_at'] as $field) $row[$field]=cssv_pro_iso($row[$field]);
        $previous=$row['expires_at'] ? (new DateTimeImmutable($row['expires_at']))->format('Y-m-d H:i:s.u') : null;
        $row['proposed_expiry']=cssv_pro_iso(cssv_pro_period(new DateTimeImmutable('now',new DateTimeZone('UTC')),$previous)['expires_at']);
    } unset($row);
    cssv_json(['ok'=>true,'submissions'=>$rows,'has_more'=>$more,'product'=>cssv_pro_product()]);
} catch (Throwable $e) { cssv_pro_problem($e); }
