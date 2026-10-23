<?php
declare(strict_types=1);
require_once __DIR__.'/_pro.php';
require_once __DIR__.'/_pro_coupon_core.php';
require_once __DIR__.'/_pro_coupon_schema.php';
function cssv_coupon_ensure_schema(PDO $pdo): void {
    static $ready=false; if ($ready) return;
    cssv_pro_ensure_schema($pdo);
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-pro-coupons-v1',5)")->fetchColumn()!==1) throw new RuntimeException('coupon_schema_busy');
    try { foreach (cssv_coupon_schema_statements() as $sql) $pdo->exec($sql); $ready=true; }
    finally { $pdo->query("SELECT RELEASE_LOCK('cssvista-pro-coupons-v1')"); }
}
function cssv_coupon_enabled(): bool { return !cssv_pro_release_paused() && cssv_env('CSSV_PRO_COUPONS_ENABLED','0')==='1'; }
function cssv_coupon_require_enabled(): void { if (!cssv_coupon_enabled()) throw new LogicException('Coupon access is not open yet. No payment is required.'); }
function cssv_coupon_revision(array $coupon, int $base, int $amount, ?string $productRevision): string {
    return hash('sha256',json_encode([$coupon['id'],$coupon['kind'],(int)$coupon['discount_value'],$coupon['target_user_id'],(int)$coupon['max_uses'],$coupon['expires_at'],$base,$amount,$productRevision,30],JSON_THROW_ON_ERROR));
}
function cssv_coupon_find(PDO $pdo, string $code, string $user, bool $lock=false): array {
    $q=$pdo->prepare('SELECT * FROM pro_coupons WHERE code_hash=?'.($lock?' FOR UPDATE':''));$q->execute([hash('sha256',$code)]);$c=$q->fetch();
    if (!$c || $c['disabled_at']!==null || new DateTimeImmutable($c['expires_at'],new DateTimeZone('UTC'))<=new DateTimeImmutable('now',new DateTimeZone('UTC')) || ($c['target_user_id']!==null && $c['target_user_id']!==$user)) throw new DomainException('This coupon is unavailable for your account.');
    // Current locking reads prevent a stale transaction snapshot oversubscribing a code.
    $q=$pdo->prepare("SELECT r.user_id FROM pro_coupon_redemptions r LEFT JOIN pro_orders o ON o.id=r.order_id WHERE r.coupon_id=? AND (r.order_id IS NULL OR o.status<>'cancelled')".($lock?' FOR UPDATE':''));$q->execute([$c['id']]);$uses=$q->fetchAll(PDO::FETCH_COLUMN);
    if (count($uses)>=(int)$c['max_uses'] || in_array($user,$uses,true)) throw new DomainException('This coupon is unavailable for your account.');
    return $c;
}
function cssv_coupon_offer(array $coupon): array {
    $product=cssv_pro_product(); $base=$product['amount_minor'];
    if (!is_int($base)) throw new LogicException('Pro pricing is unavailable.');
    $amount=cssv_coupon_amount($coupon['kind'],(int)$coupon['discount_value'],$base);
    if ($amount>0 && !$product['collection_enabled']) throw new LogicException('Discounted purchases are not open yet. No payment is required.');
    return ['kind'=>$coupon['kind'],'base_amount_minor'=>$base,'amount_minor'=>$amount,'discount_minor'=>$base-$amount,'duration_days'=>30,'expires_at'=>cssv_pro_iso($coupon['expires_at']),'coupon_revision'=>cssv_coupon_revision($coupon,$base,$amount,$product['product_revision'])];
}
function cssv_coupon_redeem(PDO $pdo, string $user, array $body): array {
    cssv_pro_fields($body,['action','code','request_id','coupon_revision','product_revision','terms_version','return_to']);
    $code=cssv_coupon_code($body['code']??null);$request=cssv_pro_id($body['request_id']??null);$destination=cssv_pro_destination($body['return_to']??null);
    $hash=hash('sha256',json_encode([$code,$body['coupon_revision']??null,$body['product_revision']??null,$body['terms_version']??null,$destination],JSON_THROW_ON_ERROR));
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT IGNORE INTO pro_memberships(user_id) VALUES(?)')->execute([$user]);
        $q=$pdo->prepare('SELECT * FROM pro_memberships WHERE user_id=? FOR UPDATE');$q->execute([$user]);$membership=$q->fetch();
        $q=$pdo->prepare('SELECT id,order_id,request_hash FROM pro_coupon_redemptions WHERE user_id=? AND request_id=?');$q->execute([$user,$request]);
        if ($prior=$q->fetch()) { if (!hash_equals($prior['request_hash'],$hash)) throw new DomainException('This coupon request was already used with different details.');$pdo->commit();return ['redemption_id'=>$prior['id'],'order_id'=>$prior['order_id']]; }
        cssv_coupon_require_enabled();
        $coupon=cssv_coupon_find($pdo,$code,$user,true);$offer=cssv_coupon_offer($coupon);$product=cssv_pro_product();
        if (($body['coupon_revision']??null)!==$offer['coupon_revision']) throw new DomainException('Coupon details changed. Apply the code again before continuing.');
        $order=null;$period=['activated_at'=>null,'starts_at'=>null,'expires_at'=>null];
        if ($offer['amount_minor']>0) {
            if (($body['product_revision']??null)!==$product['product_revision'] || ($body['terms_version']??null)!==$product['terms_version']) throw new DomainException('Purchase details changed. Review the terms again.');
            $order=cssv_uuid_v4();
            $pdo->prepare('INSERT INTO pro_orders(id,user_id,request_id,request_hash,amount_minor,receiver_number,receiver_title,terms_version,terms_text,return_to) VALUES(?,?,?,?,?,?,?,?,?,?)')->execute([$order,$user,$request,$hash,$offer['amount_minor'],$product['receiver_number'],$product['receiver_title'],$product['terms_version'],$product['terms_text'],$destination]);
        } else {
            $period=cssv_pro_period(new DateTimeImmutable('now',new DateTimeZone('UTC')),$membership['expires_at']);
            $starts=cssv_pro_status($membership,new DateTimeImmutable('now',new DateTimeZone('UTC')))==='active'?$membership['starts_at']:$period['starts_at'];
            $pdo->prepare('UPDATE pro_memberships SET starts_at=?,expires_at=? WHERE user_id=?')->execute([$starts,$period['expires_at'],$user]);
        }
        $id=cssv_uuid_v4();
        $pdo->prepare('INSERT INTO pro_coupon_redemptions(id,coupon_id,user_id,request_id,request_hash,order_id,base_amount_minor,amount_minor,activated_at,starts_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([$id,$coupon['id'],$user,$request,$hash,$order,$offer['base_amount_minor'],$offer['amount_minor'],$period['activated_at'],$period['starts_at'],$period['expires_at']]);
        $pdo->commit();return ['redemption_id'=>$id,'order_id'=>$order];
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack();throw $e; }
}
function cssv_coupon_admin(PDO $pdo, array $admin, array $body): array {
    $action=$body['action']??'';
    cssv_pro_fields($body,$action==='create'?['action','request_id','label','kind','discount_value','target_email','max_uses','expires_at']:['action','coupon_id']);
    if (!in_array($action,['create','disable'],true)) throw new InvalidArgumentException('Unknown coupon action.');
    $request=$action==='create'?cssv_pro_id($body['request_id']??null):null;
    $hash=hash('sha256',json_encode($body,JSON_THROW_ON_ERROR));
    $code=$request?'VISTA-'.strtoupper(substr(cssv_hash_secret('pro-coupon-v1:'.$admin['admin_id'].':'.$request),0,32)):null;
    $pdo->beginTransaction();
    try {
        $current=cssv_admin_current_session($pdo,true);
        if (!$current || !hash_equals($admin['admin_id'],$current['admin_id'])) throw new UnexpectedValueException('Your admin session ended. Sign in again.');
        $q=$pdo->prepare('SELECT id FROM admin_accounts WHERE id=? FOR UPDATE');$q->execute([$admin['admin_id']]);
        if ($action==='disable') {
            $id=cssv_pro_id($body['coupon_id']??null);$q=$pdo->prepare('SELECT id FROM pro_coupons WHERE id=? FOR UPDATE');$q->execute([$id]);if (!$q->fetchColumn()) throw new OutOfBoundsException('Coupon not found.');
            $pdo->prepare('UPDATE pro_coupons SET disabled_by=COALESCE(disabled_by,?),disabled_at=COALESCE(disabled_at,NOW(6)) WHERE id=?')->execute([$admin['admin_id'],$id]);$pdo->commit();return ['coupon_id'=>$id];
        }
        $q=$pdo->prepare('SELECT id,request_hash,code_hash FROM pro_coupons WHERE created_by=? AND request_id=?');$q->execute([$admin['admin_id'],$request]);
        if ($prior=$q->fetch()) { if (!hash_equals($prior['request_hash'],$hash)) throw new DomainException('This create request was already used with different details.');if (!hash_equals($prior['code_hash'],hash('sha256',$code))) throw new DomainException('The backend security key changed. Disable this code and create another.');$pdo->commit();return ['coupon_id'=>$prior['id'],'code'=>$code]; }
        $label=is_string($body['label']??null)?trim($body['label']):'';$kind=$body['kind']??null;$value=$body['discount_value']??null;$limit=$body['max_uses']??null;
        if ($label==='' || mb_strlen($label)>120 || !is_string($kind) || !is_int($value) || !is_int($limit) || $limit<1 || $limit>10000) throw new InvalidArgumentException('Enter a label, valid discount and usage limit of 1–10,000.');
        $base=cssv_pro_product()['amount_minor'];if (!is_int($base)) throw new LogicException('Pro pricing is unavailable.');cssv_coupon_amount($kind,$value,$base);
        $raw=$body['expires_at']??null;if (!is_string($raw) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D',$raw)) throw new InvalidArgumentException('Enter an expiry date and time with timezone.');
        try {$expiry=new DateTimeImmutable($raw);} catch (Exception) {throw new InvalidArgumentException('Enter a valid expiry.');}$errors=DateTimeImmutable::getLastErrors();
        if (($errors && ($errors['warning_count'] || $errors['error_count'])) || $expiry<=new DateTimeImmutable('now')) throw new InvalidArgumentException('Choose a future valid expiry.');
        $target=null;$email=$body['target_email']??null;
        if ($email!==null) { if (!is_string($email) || !filter_var($email,FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Enter the student’s account email.');$q=$pdo->prepare('SELECT id FROM users WHERE email=?');$q->execute([trim($email)]);$target=$q->fetchColumn();if (!$target) throw new InvalidArgumentException('No student account uses that email. Ask the student to register first.'); }
        $id=cssv_uuid_v4();$pdo->prepare('INSERT INTO pro_coupons(id,request_id,request_hash,code_hash,label,kind,discount_value,target_user_id,max_uses,expires_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([$id,$request,$hash,hash('sha256',$code),$label,$kind,$value,$target,$limit,$expiry->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),$admin['admin_id']]);
        $pdo->commit();return ['coupon_id'=>$id,'code'=>$code];
    } catch (Throwable $e) {if ($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
