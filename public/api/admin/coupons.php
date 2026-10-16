<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
require_once dirname(__DIR__).'/_admin_auth.php';
require_once dirname(__DIR__).'/_pro_coupons.php';
cssv_require_method('GET','POST');
try {
    $pdo=cssv_db();$admin=cssv_require_separate_admin($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST'){
        $cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE]??'');$token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if($cookie==='' || $token==='' || !hash_equals($cookie,$token) || !hash_equals($admin['csrf_hash'],cssv_hash_secret($token))) cssv_fail('Refresh your admin session before managing coupons.',403,'invalid_csrf');
    }
    cssv_coupon_ensure_schema($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST')cssv_json(['ok'=>true,...cssv_coupon_admin($pdo,$admin,cssv_request_json(4096))]);
    $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);if($offset===false)throw new InvalidArgumentException('Invalid coupon page.');
    if (isset($_GET['coupon_id'])) {
        $id=cssv_pro_id($_GET['coupon_id']); $q=$pdo->prepare('SELECT id FROM pro_coupons WHERE id=?'); $q->execute([$id]); if (!$q->fetchColumn()) throw new OutOfBoundsException('Coupon not found.');
        $q=$pdo->prepare('SELECT r.id,r.order_id,r.amount_minor,r.base_amount_minor,r.created_at,r.starts_at,r.expires_at,u.email,o.status order_status FROM pro_coupon_redemptions r JOIN users u ON u.id=r.user_id LEFT JOIN pro_orders o ON o.id=r.order_id WHERE r.coupon_id=? ORDER BY r.created_at DESC,r.id LIMIT 51 OFFSET '.(int)$offset); $q->execute([$id]); $rows=$q->fetchAll(); $more=count($rows)>50; $rows=array_slice($rows,0,50);
        foreach($rows as &$row){foreach(['amount_minor','base_amount_minor']as $key)$row[$key]=(int)$row[$key];foreach(['created_at','starts_at','expires_at']as $key)$row[$key]=cssv_pro_iso($row[$key]);}unset($row);
        cssv_json(['ok'=>true,'allocations'=>$rows,'has_more'=>$more]);
    }
    $q=$pdo->query("SELECT c.id,c.label,c.kind,c.discount_value,c.max_uses,c.expires_at,c.disabled_at,c.created_at,u.email target_email,(SELECT COUNT(*) FROM pro_coupon_redemptions r LEFT JOIN pro_orders o ON o.id=r.order_id WHERE r.coupon_id=c.id AND (r.order_id IS NULL OR o.status<>'cancelled')) uses FROM pro_coupons c LEFT JOIN users u ON u.id=c.target_user_id ORDER BY c.created_at DESC,c.id LIMIT 51 OFFSET ".(int)$offset);
    $rows=$q->fetchAll();$more=count($rows)>50;$rows=array_slice($rows,0,50);foreach($rows as &$row){foreach(['discount_value','max_uses','uses']as $key)$row[$key]=(int)$row[$key];foreach(['expires_at','disabled_at','created_at']as $key)$row[$key]=cssv_pro_iso($row[$key]);}unset($row);
    cssv_json(['ok'=>true,'coupons'=>$rows,'has_more'=>$more,'enabled'=>cssv_coupon_enabled()]);
} catch(Throwable $e){cssv_pro_problem($e);}
