<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') exit(1);
require __DIR__.'/../../public/api/_bootstrap_core.php';
$pdo=cssv_db();
if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== 'cssvista_briefing_test') exit(1);
$path=cssv_env('CSSV_CONFIG_FILE');
if (!is_string($path) || !str_starts_with($path,'/tmp/cssv-pro-private/')) exit(1);
$config=is_file($path) ? require $path : [];
$action=$argv[1] ?? '';
if ($action==='select') {
    $email=strtolower($argv[2] ?? '');
    if (!str_ends_with($email,'@example.invalid')) exit(1);
    $query=$pdo->prepare('SELECT id FROM users WHERE email=?'); $query->execute([$email]);
    if (!$query->fetchColumn()) exit(1);
    $config['CSSV_WORKSPACE_PREVIEW_TEST_EMAIL_SHA256']=hash('sha256',$email);
    $config['CSSV_WORKSPACE_PREVIEW_ENABLED']='1';
} elseif ($action==='off') $config['CSSV_WORKSPACE_PREVIEW_ENABLED']='0';
elseif ($action==='unpaused') $config['CSSV_PRO_RELEASE_TEST_PAUSED']='0';
elseif ($action==='paused') $config['CSSV_PRO_RELEASE_TEST_PAUSED']='1';
elseif ($action==='unverify') {
    $email=strtolower($argv[2] ?? ''); if (!str_ends_with($email,'@example.invalid')) exit(1);
    $pdo->prepare('UPDATE users SET email_verified_at=NULL WHERE email=?')->execute([$email]); exit;
} else exit(1);
if (!is_dir(dirname($path))) mkdir(dirname($path),0700,true);
file_put_contents($path,'<?php return '.var_export($config,true).';',LOCK_EX);chmod($path,0600);
echo "Updated isolated workspace-preview fixture.\n";
