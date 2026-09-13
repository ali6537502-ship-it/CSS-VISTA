<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')exit(1);
$raw=stream_get_contents(STDIN);
if(!preg_match('/^To:\s*([^\r\n]+@example\.invalid)\s*$/mi',$raw))exit(1);
$directory=dirname(__DIR__,2).'/test-artifacts/account-mail';if(!is_dir($directory))mkdir($directory,0700,true);
$file=$directory.'/'.bin2hex(random_bytes(16)).'.eml';file_put_contents($file,$raw);chmod($file,0600);
