<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_pro_coupons.php';
cssv_require_method('GET','POST');
try {
    $pdo=cssv_db();$session=cssv_require_user($pdo);$user=(string)$session['user_id'];
    if ($_SERVER['REQUEST_METHOD']==='POST') cssv_require_csrf($session);
    cssv_coupon_ensure_schema($pdo);
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        cssv_enforce_rate_limit($pdo,'pro_coupon_write',$user,120,3600);
        $rate=$pdo->prepare("SELECT COUNT(*) FROM login_security_events WHERE user_id=? AND event_type='pro_coupon_write' AND occurred_at>=DATE_SUB(NOW(6),INTERVAL 1 HOUR)"); $rate->execute([$user]);
        if ((int)$rate->fetchColumn()>=30) cssv_fail('Too many attempts. Please try again later.',429,'rate_limited');
        cssv_log_security_event($pdo,'pro_coupon_write',$user,$user);
        $body=cssv_request_json(4096);$action=$body['action']??'';
        if ($action==='quote') {cssv_pro_fields($body,['action','code']);cssv_coupon_require_enabled();$offer=cssv_coupon_offer(cssv_coupon_find($pdo,cssv_coupon_code($body['code']??null),$user));cssv_json(['ok'=>true,'offer'=>$offer]);}
        if ($action!=='redeem') throw new InvalidArgumentException('Unknown coupon action.');
        $receipt=cssv_coupon_redeem($pdo,$user,$body);
        cssv_json(['ok'=>true,...$receipt,'membership'=>cssv_pro_membership($pdo,$user)]);
    }
    $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if ($offset===false) throw new InvalidArgumentException('Invalid coupon history page.');
    $q=$pdo->prepare('SELECT r.id,r.order_id,r.amount_minor,r.base_amount_minor,r.created_at,r.starts_at,r.expires_at FROM pro_coupon_redemptions r WHERE r.user_id=? ORDER BY r.created_at DESC,r.id LIMIT 51 OFFSET '.(int)$offset);$q->execute([$user]);$rows=$q->fetchAll();$more=count($rows)>50;$rows=array_slice($rows,0,50);
    foreach($rows as &$row){foreach(['amount_minor','base_amount_minor']as $key)$row[$key]=(int)$row[$key];foreach(['created_at','starts_at','expires_at']as $key)$row[$key]=cssv_pro_iso($row[$key]);}unset($row);
    cssv_json(['ok'=>true,'enabled'=>cssv_coupon_enabled(),'redemptions'=>$rows,'has_more'=>$more]);
} catch(Throwable $e) {cssv_pro_problem($e);}
