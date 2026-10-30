<?php
declare(strict_types=1);
function cssv_env(string $key,string $fallback=''):string{return getenv($key)===false?$fallback:getenv($key);}
require __DIR__.'/../../public/api/_workspace_preview.php';
function check(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
putenv('CSSV_WORKSPACE_PREVIEW_ENABLED');check(cssv_workspace_enabled(),'All students receive the workspace by default');
putenv('CSSV_WORKSPACE_PREVIEW_ENABLED=0');check(!cssv_workspace_enabled(),'Existing kill switch preserves classic fallback');
putenv('CSSV_WORKSPACE_PREVIEW_ENABLED=1');check(cssv_workspace_enabled(),'Global release is enabled explicitly');
echo "PASS global workspace presentation default and reversible kill switch.\n";
