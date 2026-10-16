<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../../public/api/_pro_readiness.php';
echo json_encode(cssv_pro_readiness(),JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)."\n";
