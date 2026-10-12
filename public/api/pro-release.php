<?php
declare(strict_types=1);
require_once __DIR__.'/_bootstrap_core.php';
require_once __DIR__.'/_pro_release.php';
cssv_require_method('GET');
cssv_json(['paused'=>cssv_pro_release_paused()]);
