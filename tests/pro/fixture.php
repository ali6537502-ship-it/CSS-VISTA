<?php
declare(strict_types=1);
if (getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test') throw new RuntimeException('Isolated CI database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
require_once __DIR__.'/../../public/api/_pro.php';
$pdo=cssv_db(); cssv_pro_ensure_schema($pdo);
$action=$argv[1] ?? '';
if ($action==='collection') {
    $enabled=($argv[2] ?? '')==='on';
    $path=cssv_env('CSSV_CONFIG_FILE');
    if (!$path || !str_starts_with($path,sys_get_temp_dir().'/')) throw new RuntimeException('Disposable config path required.');
    file_put_contents($path,"<?php return ".var_export(['CSSV_PRO_COLLECTION_ENABLED'=>$enabled?'1':'0','CSSV_PRO_COLLECTION_APPROVED'=>'1','CSSV_PRO_TERMS_VERSION'=>'test-only-v1','CSSV_PRO_TERMS_TEXT'=>'ISOLATED TEST ONLY. No real payment or commercial terms.'],true).";\n");
} elseif ($action==='browser-tables') {
    $core=file_get_contents(__DIR__.'/../../server/sql/001_hostinger_core_schema.sql');
    preg_match_all('/CREATE TABLE IF NOT EXISTS (\w+)\s*\([\s\S]*?;/',$core,$tables,PREG_SET_ORDER);
    foreach ($tables as $table) if (in_array($table[1],['batches','batch_registrations'],true)) $pdo->exec($table[0]);
} elseif ($action==='reset-rate') {
    $pdo->exec("DELETE FROM login_security_events WHERE event_type='pro_payment_write'");
} elseif ($action==='reviewer') {
    $id=cssv_uuid_v4();
    $pdo->prepare('INSERT INTO admin_accounts(id,email,password_hash,totp_secret_cipher,totp_enabled_at) VALUES(?,?,?,?,NOW(6))')->execute([$id,'test-reviewer-'.$id.'@example.invalid',password_hash(bin2hex(random_bytes(32)),PASSWORD_DEFAULT),'isolated-test-unused']);
    $token=bin2hex(random_bytes(32)); $csrf=bin2hex(random_bytes(32));
    $pdo->prepare('INSERT INTO admin_sessions(id,admin_id,token_hash,csrf_hash,mfa_verified_at,expires_at) VALUES(?,?,?,?,NOW(6),DATE_ADD(NOW(6),INTERVAL 1 HOUR))')->execute([cssv_uuid_v4(),$id,cssv_hash_secret($token),cssv_hash_secret($csrf)]);
    echo json_encode(['token'=>$token,'csrf'=>$csrf],JSON_THROW_ON_ERROR);
} elseif ($action==='expire') {
    $pdo->prepare('UPDATE pro_memberships SET expires_at=DATE_SUB(NOW(6),INTERVAL 1 SECOND) WHERE user_id=?')->execute([$argv[2]]);
} elseif ($action==='incomplete') {
    $pdo->prepare("UPDATE student_profiles SET education='' WHERE user_id=?")->execute([$argv[2]]);
} elseif ($action==='learning') {
    $pdo->prepare('INSERT INTO student_progress(user_id,payload,client_updated_at) VALUES(?,?,NOW(6)) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')->execute([$argv[2],'{"testOnlySavedWork":"preserve through expiry"}']);
} elseif ($action==='progress') {
    $q=$pdo->prepare('SELECT payload FROM student_progress WHERE user_id=?'); $q->execute([$argv[2]]); echo $q->fetchColumn();
} elseif ($action==='snapshot') {
    echo json_encode(['grants'=>$pdo->query('SELECT user_id,order_id,transaction_id,starts_at,expires_at FROM pro_grants ORDER BY activated_at')->fetchAll(),'memberships'=>$pdo->query('SELECT * FROM pro_memberships')->fetchAll()],JSON_THROW_ON_ERROR);
} else throw new RuntimeException('Unknown fixture action');
