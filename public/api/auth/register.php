<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_account_auth.php';
cssv_require_method('POST'); account_require_json_origin();
$pdo=cssv_db(); account_auth_schema($pdo);
$body=cssv_request_json(16384);
$email=cssv_normalize_email($body['email']??'');
$password=account_password($body['password']??null);
$name=trim((string)($body['full_name']??''));
if ($name===''||mb_strlen($name)>180||preg_match('/[\x00-\x1F]/',$name)) cssv_fail('Enter your full name, up to 180 characters.',422,'invalid_name');
account_require_mail_transport();
cssv_enforce_rate_limit($pdo,'account-register',$email,6,3600);
cssv_log_security_event($pdo,'account-register',null,$email);
$hash=account_hash_password($password);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT id,email FROM users WHERE email=? FOR UPDATE'); $query->execute([$email]);
    if (!$query->fetch()) {
        $id=cssv_uuid_v4();
        $pdo->prepare("INSERT INTO users(id,email,password_hash,auth_source,raw_metadata,created_at) VALUES(?,?,?,'local',?,NOW(6))")->execute([$id,$email,$hash,json_encode(['full_name'=>$name],JSON_THROW_ON_ERROR)]);
        $pdo->prepare('INSERT INTO student_profiles(user_id,display_name) VALUES(?,?)')->execute([$id,$name]);
        account_queue_link($pdo,['id'=>$id,'email'=>$email],'verify');
    }
    $pdo->commit();
    account_deliver_mail($pdo);
    cssv_json(['ok'=>true,'confirmation_required'=>true,'message'=>'Check your email to confirm your account. If you already have an account, sign in or request a password reset.'],202);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($error instanceof PDOException && $error->getCode()==='23000') cssv_json(['ok'=>true,'confirmation_required'=>true],202);
    account_log_failure($error,'registration');
}
