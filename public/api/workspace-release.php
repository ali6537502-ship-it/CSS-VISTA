<?php
declare(strict_types=1);
require_once __DIR__.'/_bootstrap_core.php';
require_once __DIR__.'/_workspace_preview.php';
cssv_require_method('GET');
cssv_json(['enabled' => cssv_workspace_enabled()]);
