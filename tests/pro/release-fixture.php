<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli' || getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test') throw new RuntimeException('Isolated CLI fixture only.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
$path=cssv_env('CSSV_CONFIG_FILE');
if (!is_string($path) || !str_starts_with($path, sys_get_temp_dir().'/cssv-pro-private/')) throw new RuntimeException('Disposable private config required.');
$config=require $path;
if (!is_array($config)) throw new RuntimeException('Expected isolated configuration.');
$action=$argv[1]??'';
if ($action==='pause') $config['CSSV_PRO_RELEASE_TEST_PAUSED']='1';
elseif ($action==='restore') unset($config['CSSV_PRO_RELEASE_TEST_PAUSED']);
else throw new RuntimeException('Unknown fixture action.');
$temporary=$path.'.release-test-tmp';
file_put_contents($temporary,"<?php return ".var_export($config,true).";\n",LOCK_EX);
chmod($temporary,0600);
if (!rename($temporary,$path)) throw new RuntimeException('Isolated configuration update failed.');
