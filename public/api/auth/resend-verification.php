<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); account_auth_schema($pdo); $body=cssv_request_json(8192);
$email=cssv_normalize_email($body['email']??'');
cssv_enforce_rate_limit($pdo,'verification-request',$email,4,3600);
cssv_log_security_event($pdo,'verification-request',null,$email);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT id,email FROM users WHERE email=? AND disabled_at IS NULL AND email_verified_at IS NULL FOR UPDATE'); $query->execute([$email]);
    if ($user=$query->fetch()) account_queue_link($pdo,$user,'verify');
    $pdo->commit(); account_deliver_mail($pdo);
    cssv_json(['ok'=>true,'message'=>'If your account needs confirmation, a new link will be sent.'],202);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); account_log_failure($error,'email confirmation'); }
