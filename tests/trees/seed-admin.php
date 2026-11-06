<?php
declare(strict_types=1);
// CI-only fixture. Never import this file in a public endpoint.
require_once __DIR__.'/../../public/api/_bootstrap.php';
require_once __DIR__.'/../../public/api/_admin_auth.php';
$db=cssv_db();
cssv_admin_ensure_schema($db);
$id=cssv_uuid_v4();
$token='tree-test-admin-session-'.bin2hex(random_bytes(24));
$csrf='tree-test-admin-csrf-'.bin2hex(random_bytes(24));
$db->prepare('INSERT INTO admin_accounts(id,email,password_hash,totp_secret_cipher,totp_enabled_at) VALUES(?,?,?,?,NOW(6))')
    ->execute([$id,'testing-admin@example.invalid',password_hash(bin2hex(random_bytes(24)),PASSWORD_DEFAULT),'test-fixture-only']);
$db->prepare("INSERT INTO admin_sessions(id,admin_id,token_hash,csrf_hash,mfa_verified_at,expires_at) VALUES(?,?,?,?,NOW(6),DATE_ADD(NOW(6),INTERVAL 3 HOUR))")
    ->execute([cssv_uuid_v4(),$id,cssv_hash_secret($token),cssv_hash_secret($csrf)]);
file_put_contents('/tmp/trees-test-admin.json',json_encode(['cookie'=>'cssv_owner_session='.$token.'; cssv_owner_csrf='.$csrf,'csrf'=>$csrf],JSON_THROW_ON_ERROR));
echo "Isolated test administrator seeded.\n";
