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
cssv_enforce_rate_limit($pdo,'account-register',$email,6,3600);
cssv_log_security_event($pdo,'account-register',null,$email);
$hash=account_hash_password($password);
try {
    $pdo->beginTransaction();
    $query=$pdo->prepare('SELECT id FROM users WHERE email=? FOR UPDATE'); $query->execute([$email]);
    if ($query->fetchColumn()) {
        $pdo->rollBack();
        cssv_fail('An account already exists for this email. Sign in or reset your password.',409,'account_exists');
    }
    $id=cssv_uuid_v4();
    $pdo->prepare("INSERT INTO users(id,email,password_hash,auth_source,raw_metadata,created_at) VALUES(?,?,?,'local',?,NOW(6))")->execute([$id,$email,$hash,json_encode(['full_name'=>$name],JSON_THROW_ON_ERROR)]);
    $pdo->prepare('INSERT INTO student_profiles(user_id,display_name) VALUES(?,?)')->execute([$id,$name]);
    $session=cssv_issue_session($pdo,$id);
    $pdo->prepare('UPDATE users SET last_sign_in_at=NOW(6),last_seen_at=NOW(6) WHERE id=?')->execute([$id]);
    $pdo->commit();
    cssv_log_security_event($pdo,'register-success',$id,$email);
    cssv_json(['ok'=>true,'confirmation_required'=>false,'user'=>account_user($pdo,$id),'csrf_token'=>$session['csrf_token'],'message'=>'Your CSS Vista account is ready.'],201);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($error instanceof PDOException && $error->getCode()==='23000') cssv_fail('An account already exists for this email. Sign in or reset your password.',409,'account_exists');
    account_log_failure($error,'registration');
}
