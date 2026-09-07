<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

$checks = [
    'pdo' => class_exists('PDO'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'openssl' => extension_loaded('openssl'),
    'fileinfo' => extension_loaded('fileinfo'),
    'json' => extension_loaded('json'),
];

http_response_code(200);
echo json_encode([
    'ok' => true,
    'service' => 'css-vista-backend-probe',
    'checks' => $checks,
], JSON_UNESCAPED_SLASHES);
