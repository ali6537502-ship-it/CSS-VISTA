<?php
declare(strict_types=1);
if (getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test') throw new RuntimeException('Isolated CI database required.');
require_once dirname(__DIR__,2).'/public/api/_bootstrap_core.php';
require_once dirname(__DIR__,2).'/public/api/_admin_auth.php';
$pdo=cssv_db();
if (($argv[1] ?? '')==='expire') {
    $pdo->prepare('UPDATE auth_sessions SET expires_at=DATE_SUB(NOW(6),INTERVAL 1 DAY) WHERE user_id=?')->execute([$argv[2] ?? '']);
    exit;
}
// Use the existing account tables verbatim. Unrelated legacy file-storage
// indexes target MariaDB and are not needed by this MySQL isolation suite.
$core=file_get_contents(dirname(__DIR__,2).'/server/sql/001_hostinger_core_schema.sql');
preg_match_all('/CREATE TABLE IF NOT EXISTS (\w+)\s*\([\s\S]*?;/',$core,$tables,PREG_SET_ORDER);
$required=['users','admin_users','student_profiles','student_progress','student_activity','quiz_attempts','question_attempts','auth_sessions','password_reset_tokens','login_security_events','site_content','site_content_versions','mcq_error_reports','custom_test_series_requests'];
foreach ($tables as $table) if (in_array($table[1],$required,true) || str_starts_with($table[1],'factbook_')) $pdo->exec($table[0]);
cssv_admin_ensure_schema($pdo);
if (($argv[1] ?? '')==='user') {
    $id=cssv_uuid_v4();$email=$argv[2];
    if(!str_ends_with($email,'@example.invalid'))throw new RuntimeException('Test email required');
    $q=$pdo->prepare('SELECT id FROM users WHERE email=?');$q->execute([$email]);$existing=$q->fetchColumn();
    if($existing){echo $existing;exit;}
    $pdo->prepare("INSERT INTO users(id,email,password_hash,auth_source,email_verified_at,created_at) VALUES(?,?,?,'local',NOW(6),NOW(6))")->execute([$id,$email,password_hash('TEST ONLY native fixture password',PASSWORD_BCRYPT)]);
    $pdo->prepare("INSERT INTO student_profiles(user_id,display_name,phone,date_of_birth,gender,city,province_region,country,css_attempt_year,preparation_level,optional_subjects,education,profile_photo_path,profile_photo_bytes) VALUES(?,'TEST ONLY','+923001234567','2000-01-01','Other','TEST ONLY','TEST ONLY','Pakistan',2027,'Starting out','[\"TEST ONLY\"]','TEST ONLY','test-only-fixture.jpg',1024)")->execute([$id]);echo $id;exit;
}
$id=cssv_uuid_v4();
$pdo->prepare('INSERT INTO admin_accounts (id,email,password_hash,totp_secret_cipher,totp_enabled_at) VALUES (?,?,?,?,NOW(6))')->execute([$id,'fixture-admin@example.invalid',password_hash(bin2hex(random_bytes(32)),PASSWORD_DEFAULT),'isolated-test-unused']);
$token=bin2hex(random_bytes(32)); $csrf=bin2hex(random_bytes(32));
$pdo->prepare('INSERT INTO admin_sessions (id,admin_id,token_hash,csrf_hash,mfa_verified_at,expires_at) VALUES (?,?,?,?,NOW(6),DATE_ADD(NOW(6),INTERVAL 1 HOUR))')->execute([cssv_uuid_v4(),$id,cssv_hash_secret($token),cssv_hash_secret($csrf)]);
file_put_contents(dirname(__DIR__,2).'/test-artifacts/admin-session.json',json_encode(['token'=>$token,'csrf'=>$csrf],JSON_THROW_ON_ERROR));
echo "Created isolated database and test admin session.\n";
