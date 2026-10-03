<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_resources.php';
cssv_require_method('GET');
// Public encryption key only. The corresponding private key stays in the
// existing private storage outside the webroot and is never sent to clients.
$keys = cssv_resource_keypair();
cssv_json(['ok'=>true, 'key_id'=>$keys['id'], 'public_key'=>$keys['public']]);
