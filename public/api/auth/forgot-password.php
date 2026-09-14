<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); account_auth_schema($pdo); $body=cssv_request_json(8192);
$email=cssv_normalize_email($body['email']??'');
account_require_mail_transport();
cssv_enforce_rate_limit($pdo,'reset-request',$email,4,3600);
cssv_log_security_event($pdo,'reset-request',null,$email);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT id,email FROM users WHERE email=? AND disabled_at IS NULL FOR UPDATE'); $query->execute([$email]);
    $outboxId=null;
    if ($user=$query->fetch()) $outboxId=account_queue_link($pdo,$user,'reset');
    $pdo->commit();
    if ($outboxId!==null) account_deliver_mail($pdo,1,$outboxId);
    cssv_json(['ok'=>true,'message'=>'If an account exists for this email, a password-reset email will be sent.'],202);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); account_log_failure($error,'password recovery'); }
