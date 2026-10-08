<?php
declare(strict_types=1);
require_once __DIR__ . '/_pro_core.php';
require_once __DIR__ . '/_pro_schema.php';

function cssv_pro_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) return;
    // Admin schema must exist before adding its review foreign key. DDL is
    // outside business transactions because MariaDB/MySQL commits DDL.
    require_once __DIR__ . '/_admin_auth.php';
    cssv_admin_ensure_schema($pdo);
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-pro-schema-v1',5)")->fetchColumn() !== 1) throw new RuntimeException('pro_schema_busy');
    try { foreach (cssv_pro_schema_statements() as $sql) $pdo->exec($sql); $ready = true; }
    finally { $pdo->query("SELECT RELEASE_LOCK('cssvista-pro-schema-v1')"); }
}

function cssv_pro_product(): array
{
    $price = cssv_env('CSSV_PRO_PRICE_MINOR','195000');
    $number = cssv_env('CSSV_PRO_RECEIVER_NUMBER','03055199994');
    $title = cssv_env('CSSV_PRO_RECEIVER_TITLE','Ali Hassan');
    $terms = cssv_env('CSSV_PRO_TERMS_TEXT','');
    $version = cssv_env('CSSV_PRO_TERMS_VERSION','');
    $validPrice = is_string($price) && preg_match('/^[1-9][0-9]{0,8}$/D',$price);
    $ready = cssv_env('CSSV_PRO_COLLECTION_ENABLED','0') === '1'
        && cssv_env('CSSV_PRO_COLLECTION_APPROVED','0') === '1'
        && $validPrice && preg_match('/^0[0-9]{10}$/D',(string)$number)
        && mb_strlen((string)$title) > 0 && mb_strlen((string)$title) <= 120
        && mb_strlen((string)$terms) > 0 && mb_strlen((string)$terms) <= 10000
        && preg_match('/^[A-Za-z0-9._-]{1,80}$/D',(string)$version);
    return ['name'=>'Pro — 30 Days','amount_minor'=>$validPrice ? (int)$price : null,'currency'=>'PKR','duration_days'=>30,
        'collection_enabled'=>(bool)$ready,'receiver_number'=>$ready ? $number : null,'receiver_title'=>$ready ? $title : null,
        'terms_version'=>$ready ? $version : null,'terms_text'=>$ready ? $terms : null,
        'product_revision'=>$ready ? hash('sha256',json_encode([$price,$number,$title,$version,$terms,30],JSON_THROW_ON_ERROR)) : null];
}

function cssv_pro_membership(PDO $pdo, string $userId): array
{
    $q=$pdo->prepare('SELECT starts_at,expires_at FROM pro_memberships WHERE user_id=?'); $q->execute([$userId]);
    $row=$q->fetch() ?: null;
    return ['status'=>cssv_pro_status($row,new DateTimeImmutable('now',new DateTimeZone('UTC'))),
        'starts_at'=>cssv_pro_iso($row['starts_at'] ?? null),'expires_at'=>cssv_pro_iso($row['expires_at'] ?? null)];
}

function cssv_pro_iso(?string $value): ?string
{
    return $value ? (new DateTimeImmutable($value,new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.u\Z') : null;
}

function cssv_pro_require_active(PDO $pdo, string $userId): void
{
    // Future premium actions call this AFTER cssv_require_user. Owned history
    // does not call it. No existing free feature is gated by this increment.
    cssv_pro_ensure_schema($pdo);
    if (cssv_pro_membership($pdo,$userId)['status'] !== 'active') cssv_fail('Active Pro access is required for this action.',403,'pro_required');
}

function cssv_pro_order(PDO $pdo, string $id, ?string $userId): array
{
    $q=$pdo->prepare('SELECT * FROM pro_orders WHERE id=?'.($userId !== null ? ' AND user_id=?' : ''));
    $q->execute($userId !== null ? [$id,$userId] : [$id]); $order=$q->fetch();
    if (!$order) throw new OutOfBoundsException('Order not found.');
    unset($order['request_id'],$order['request_hash']);
    $order['amount_minor']=(int)$order['amount_minor']; $order['duration_days']=(int)$order['duration_days'];
    $order['created_at']=cssv_pro_iso($order['created_at']);
    $q=$pdo->prepare('SELECT id,transaction_id,status,submitted_at,reviewed_at,review_reason FROM pro_submissions WHERE order_id=? ORDER BY submitted_at DESC,id');
    $q->execute([$id]); $order['submissions']=$q->fetchAll();
    foreach ($order['submissions'] as &$s) { $s['submitted_at']=cssv_pro_iso($s['submitted_at']); $s['reviewed_at']=cssv_pro_iso($s['reviewed_at']); } unset($s);
    $q=$pdo->prepare('SELECT activated_at,starts_at,expires_at FROM pro_grants WHERE order_id=?'); $q->execute([$id]);
    $grant=$q->fetch(); $order['grant']=$grant ? array_map('cssv_pro_iso',$grant) : null;
    return $order;
}

function cssv_pro_mutation(PDO $pdo, string $userId, array $body): string
{
    $action=$body['action'] ?? '';
    cssv_pro_fields($body,match($action) {
        'create'=>['action','request_id','return_to','terms_version','product_revision'],
        'submit'=>['action','order_id','request_id','transaction_id'],
        'cancel'=>['action','order_id'],
        default=>throw new InvalidArgumentException('Unknown payment action.'),
    });
    $id=$action === 'create' ? cssv_uuid_v4() : cssv_pro_id($body['order_id'] ?? null);
    $request=$action !== 'cancel' ? cssv_pro_id($body['request_id'] ?? null) : '';
    $destination=cssv_pro_destination($body['return_to'] ?? null);
    $transaction=$action === 'submit' ? cssv_pro_transaction($body['transaction_id'] ?? null) : '';
    $fingerprint=hash('sha256',json_encode([$action,$destination,$transaction,$body['terms_version'] ?? null,$body['product_revision'] ?? null],JSON_THROW_ON_ERROR));
    $product=cssv_pro_product();
    $pdo->beginTransaction();
    try {
        // One lock order for ALL member/review mutations: membership, order,
        // submission. Serializes distinct renewals, not just duplicate clicks.
        $pdo->prepare('INSERT IGNORE INTO pro_memberships(user_id) VALUES(?)')->execute([$userId]);
        $q=$pdo->prepare('SELECT user_id FROM pro_memberships WHERE user_id=? FOR UPDATE'); $q->execute([$userId]);
        if ($action === 'create') {
            $q=$pdo->prepare('SELECT id,request_hash FROM pro_orders WHERE user_id=? AND request_id=?'); $q->execute([$userId,$request]);
            if ($prior=$q->fetch()) {
                if (!hash_equals($prior['request_hash'],$fingerprint)) throw new DomainException('This request was already used with different details.');
                $pdo->commit(); return $prior['id'];
            }
            if (!$product['collection_enabled']) throw new LogicException('Pro purchases are not open yet. No payment is required.');
            if (($body['terms_version'] ?? null) !== $product['terms_version'] || ($body['product_revision'] ?? null) !== $product['product_revision']) throw new DomainException('Purchase details changed. Please review them again.');
            $q=$pdo->prepare("INSERT INTO pro_orders(id,user_id,request_id,request_hash,amount_minor,receiver_number,receiver_title,terms_version,terms_text,return_to) VALUES(?,?,?,?,?,?,?,?,?,?)");
            $q->execute([$id,$userId,$request,$fingerprint,$product['amount_minor'],$product['receiver_number'],$product['receiver_title'],$product['terms_version'],$product['terms_text'],$destination]);
        } else {
            $q=$pdo->prepare('SELECT status FROM pro_orders WHERE id=? AND user_id=? FOR UPDATE'); $q->execute([$id,$userId]); $order=$q->fetch();
            if (!$order) throw new OutOfBoundsException('Order not found.');
            if ($action === 'cancel') {
                if ($order['status'] === 'cancelled') { $pdo->commit(); return $id; }
                if (!in_array($order['status'],['awaiting_payment','rejected'],true)) throw new DomainException('This order cannot be cancelled in its current state.');
                $pdo->prepare("UPDATE pro_orders SET status='cancelled' WHERE id=?")->execute([$id]);
            } else {
                $q=$pdo->prepare('SELECT request_hash FROM pro_submissions WHERE order_id=? AND request_id=?'); $q->execute([$id,$request]);
                if ($hash=$q->fetchColumn()) {
                    if (!hash_equals($hash,$fingerprint)) throw new DomainException('This submission request was already used with different details.');
                    $pdo->commit(); return $id;
                }
                if (!$product['collection_enabled']) throw new LogicException('Payment submissions are paused. Please contact CSS Vista about an existing transfer.');
                if (!in_array($order['status'],['awaiting_payment','rejected'],true)) throw new DomainException('This order already has a pending or completed review.');
                $pdo->prepare('INSERT INTO pro_submissions(id,order_id,request_id,request_hash,transaction_id) VALUES(?,?,?,?,?)')->execute([cssv_uuid_v4(),$id,$request,$fingerprint,$transaction]);
                $pdo->prepare("UPDATE pro_orders SET status='awaiting_verification' WHERE id=?")->execute([$id]);
            }
        }
        $pdo->commit(); return $id;
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}

function cssv_pro_review(PDO $pdo, array $admin, array $body): string
{
    cssv_pro_fields($body,['action','submission_id','reason','transaction_id','received_amount_minor','receiver_number','received_at','receipt_verified']);
    $action=$body['action'] ?? '';
    if (!in_array($action,['approve','reject'],true)) throw new InvalidArgumentException('Unknown review action.');
    $id=cssv_pro_id($body['submission_id'] ?? null);
    $reason=trim(is_string($body['reason'] ?? null) ? $body['reason'] : '');
    if ($reason === '' || mb_strlen($reason)>500) throw new InvalidArgumentException('Enter a safe review reason of 1–500 characters.');
    $q=$pdo->prepare('SELECT o.user_id,o.id FROM pro_orders o JOIN pro_submissions s ON s.order_id=o.id WHERE s.id=?'); $q->execute([$id]); $identity=$q->fetch();
    if (!$identity) throw new OutOfBoundsException('Submission not found.');
    $pdo->beginTransaction();
    try {
        // Permission is rechecked without schema DDL inside this transaction.
        $current=cssv_admin_current_session($pdo,true);
        if (!$current || !hash_equals($admin['admin_id'],$current['admin_id'])) throw new UnexpectedValueException('Your admin session ended. Please sign in again.');
        $q=$pdo->prepare('SELECT * FROM pro_memberships WHERE user_id=? FOR UPDATE'); $q->execute([$identity['user_id']]); $membership=$q->fetch();
        if (!$membership) throw new RuntimeException('pro_membership_missing');
        $q=$pdo->prepare('SELECT * FROM pro_orders WHERE id=? FOR UPDATE'); $q->execute([$identity['id']]); $order=$q->fetch();
        $q=$pdo->prepare('SELECT * FROM pro_submissions WHERE id=? FOR UPDATE'); $q->execute([$id]); $submission=$q->fetch();
        if ($action === 'approve' && $submission['status'] === 'approved') { $pdo->commit(); return $order['id']; }
        if ($submission['status'] !== 'pending' || $order['status'] !== 'awaiting_verification') throw new DomainException('This submission has already been reviewed. Reload before acting.');
        $receivedAt=null; $amount=null;
        if ($action === 'approve') {
            if (($body['receipt_verified'] ?? null) !== true) throw new InvalidArgumentException('Verify the actual receiving-account record before approval.');
            if (cssv_pro_transaction($body['transaction_id'] ?? null) !== $submission['transaction_id']
                || !is_int($body['received_amount_minor'] ?? null) || $body['received_amount_minor'] !== (int)$order['amount_minor']
                || ($body['receiver_number'] ?? null) !== $order['receiver_number']) throw new DomainException('Transaction, received amount or receiving account does not match this order.');
            $raw=$body['received_at'] ?? null;
            if (!is_string($raw) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D',$raw)) throw new InvalidArgumentException('Enter the received date and time with its timezone.');
            try { $date=new DateTimeImmutable($raw); } catch (Exception) { throw new InvalidArgumentException('Enter a valid received date and time.'); } $dateErrors=DateTimeImmutable::getLastErrors();
            if (($dateErrors && ($dateErrors['warning_count'] || $dateErrors['error_count'])) || $date>new DateTimeImmutable('+5 minutes') || $date<new DateTimeImmutable('2000-01-01')) throw new InvalidArgumentException('Enter a valid received date and time.');
            $receivedAt=$date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'); $amount=$body['received_amount_minor'];
            $period=cssv_pro_period(new DateTimeImmutable('now',new DateTimeZone('UTC')),$membership['expires_at']);
            // Global unique transaction allocation prevents cross-account reuse;
            // uniqueness, grant and aggregate expiry all commit together.
            $pdo->prepare('INSERT INTO pro_grants(id,user_id,order_id,submission_id,transaction_id,activated_at,starts_at,expires_at) VALUES(?,?,?,?,?,?,?,?)')->execute([cssv_uuid_v4(),$identity['user_id'],$order['id'],$id,$submission['transaction_id'],$period['activated_at'],$period['starts_at'],$period['expires_at']]);
            $starts=cssv_pro_status($membership,new DateTimeImmutable('now',new DateTimeZone('UTC'))) === 'active' ? $membership['starts_at'] : $period['starts_at'];
            $pdo->prepare('UPDATE pro_memberships SET starts_at=?,expires_at=? WHERE user_id=?')->execute([$starts,$period['expires_at'],$identity['user_id']]);
        }
        $status=$action === 'approve' ? 'approved' : 'rejected';
        $pdo->prepare('UPDATE pro_submissions SET status=?,reviewed_at=NOW(6),reviewed_by=?,review_reason=?,received_amount_minor=?,received_at=? WHERE id=?')->execute([$status,$admin['admin_id'],$reason,$amount,$receivedAt,$id]);
        $pdo->prepare('UPDATE pro_orders SET status=? WHERE id=?')->execute([$status,$order['id']]);
        $pdo->commit(); return $order['id'];
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}

function cssv_pro_problem(Throwable $e): never
{
    if ($e instanceof InvalidArgumentException) cssv_fail($e->getMessage(),422,'invalid_payment');
    if ($e instanceof OutOfBoundsException) cssv_fail($e->getMessage(),404,'payment_not_found');
    if ($e instanceof DomainException) cssv_fail($e->getMessage(),409,'payment_conflict');
    if ($e instanceof UnexpectedValueException) cssv_fail($e->getMessage(),401,'admin_authentication_required');
    if ($e instanceof LogicException) cssv_fail($e->getMessage(),503,'collection_unavailable');
    if ($e instanceof PDOException && ($e->errorInfo[1] ?? 0) === 1062) cssv_fail('This transaction has already been allocated. Review its existing order.',409,'payment_already_allocated');
    error_log('CSSV Pro request failed: '.get_class($e));
    cssv_fail('Membership could not be updated. Please retry or refresh its status.',503,'membership_unavailable');
}
