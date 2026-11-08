<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_pro.php';
cssv_require_method('GET','POST');
try {
    $pdo=cssv_db(); $session=cssv_require_user($pdo); $userId=(string)$session['user_id'];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') cssv_require_csrf($session);
    cssv_pro_ensure_schema($pdo);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') cssv_paid_memberships_retired();
    if (isset($_GET['order_id'])) cssv_json(['ok'=>true,'order'=>cssv_pro_order($pdo,cssv_pro_id($_GET['order_id']),$userId),'membership'=>cssv_pro_membership($pdo,$userId),'collection_enabled'=>cssv_pro_product()['collection_enabled']]);
    $offset=filter_var($_GET['offset'] ?? 0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
    if ($offset === false) throw new InvalidArgumentException('Invalid payment page.');
    $q=$pdo->prepare('SELECT id,status,amount_minor,created_at FROM pro_orders WHERE user_id=? ORDER BY created_at DESC,id LIMIT 51 OFFSET '.(int)$offset); $q->execute([$userId]);
    $orders=$q->fetchAll(); $more=count($orders)>50; $orders=array_slice($orders,0,50); foreach ($orders as &$order) { $order['amount_minor']=(int)$order['amount_minor']; $order['created_at']=cssv_pro_iso($order['created_at']); } unset($order);
    cssv_json(['ok'=>true,'membership'=>cssv_pro_membership($pdo,$userId),'product'=>cssv_pro_product(),'orders'=>$orders,'has_more'=>$more]);
} catch (Throwable $e) { cssv_pro_problem($e); }
