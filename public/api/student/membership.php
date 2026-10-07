<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_pro.php';
cssv_require_method('GET','POST');
try {
    $pdo=cssv_db(); $session=cssv_require_user($pdo); $userId=(string)$session['user_id'];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') cssv_require_csrf($session);
    cssv_pro_ensure_schema($pdo);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        cssv_enforce_rate_limit($pdo,'pro_payment_write',$userId,120,3600);
        $rate=$pdo->prepare("SELECT COUNT(*) FROM login_security_events WHERE user_id=? AND event_type='pro_payment_write' AND occurred_at>=DATE_SUB(NOW(6),INTERVAL 1 HOUR)");
        $rate->execute([$userId]);
        if ((int)$rate->fetchColumn()>=30) cssv_fail('Too many attempts. Please try again later.',429,'rate_limited');
        cssv_log_security_event($pdo,'pro_payment_write',$userId,$userId);
        $id=cssv_pro_mutation($pdo,$userId,cssv_request_json(4096));
        cssv_json(['ok'=>true,'order'=>cssv_pro_order($pdo,$id,$userId),'membership'=>cssv_pro_membership($pdo,$userId),'collection_enabled'=>cssv_pro_product()['collection_enabled']]);
    }
    if (isset($_GET['order_id'])) cssv_json(['ok'=>true,'order'=>cssv_pro_order($pdo,cssv_pro_id($_GET['order_id']),$userId),'membership'=>cssv_pro_membership($pdo,$userId),'collection_enabled'=>cssv_pro_product()['collection_enabled']]);
    $offset=filter_var($_GET['offset'] ?? 0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
    if ($offset === false) throw new InvalidArgumentException('Invalid payment page.');
    $q=$pdo->prepare('SELECT id,status,amount_minor,created_at FROM pro_orders WHERE user_id=? ORDER BY created_at DESC,id LIMIT 51 OFFSET '.(int)$offset); $q->execute([$userId]);
    $orders=$q->fetchAll(); $more=count($orders)>50; $orders=array_slice($orders,0,50); foreach ($orders as &$order) { $order['amount_minor']=(int)$order['amount_minor']; $order['created_at']=cssv_pro_iso($order['created_at']); } unset($order);
    cssv_json(['ok'=>true,'membership'=>cssv_pro_membership($pdo,$userId),'product'=>cssv_pro_product(),'orders'=>$orders,'has_more'=>$more]);
} catch (Throwable $e) { cssv_pro_problem($e); }
