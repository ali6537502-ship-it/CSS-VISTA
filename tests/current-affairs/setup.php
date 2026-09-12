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
$pdo->exec(file_get_contents(dirname(__DIR__,2).'/server/sql/001_hostinger_core_schema.sql'));
cssv_admin_ensure_schema($pdo);
$id=cssv_uuid_v4();
$pdo->prepare('INSERT INTO admin_accounts (id,email,password_hash,totp_secret_cipher,totp_enabled_at) VALUES (?,?,?,?,NOW(6))')->execute([$id,'fixture-admin@example.invalid',password_hash(bin2hex(random_bytes(32)),PASSWORD_DEFAULT),'isolated-test-unused']);
$token=bin2hex(random_bytes(32)); $csrf=bin2hex(random_bytes(32));
$pdo->prepare('INSERT INTO admin_sessions (id,admin_id,token_hash,csrf_hash,mfa_verified_at,expires_at) VALUES (?,?,?,?,NOW(6),DATE_ADD(NOW(6),INTERVAL 1 HOUR))')->execute([cssv_uuid_v4(),$id,cssv_hash_secret($token),cssv_hash_secret($csrf)]);
file_put_contents(dirname(__DIR__,2).'/test-artifacts/admin-session.json',json_encode(['token'=>$token,'csrf'=>$csrf],JSON_THROW_ON_ERROR));
echo "Created isolated database and test admin session.\n";
