<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
cssv_require_method('GET');

$checks = [
    'php' => PHP_VERSION_ID >= 80100,
    'pdo' => class_exists('PDO'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'curl' => extension_loaded('curl'),
    'openssl' => extension_loaded('openssl'),
    'fileinfo' => extension_loaded('fileinfo'),
    'json' => extension_loaded('json'),
    'secure_random' => function_exists('random_bytes'),
];

$mailStatus = cssv_mail_transport_status();
$configured = [
    'database' => (bool)cssv_env('CSSV_DB_HOST') && (bool)cssv_env('CSSV_DB_NAME') && (bool)cssv_env('CSSV_DB_USER') && cssv_env('CSSV_DB_PASSWORD') !== null,
    'app_secret' => strlen((string)cssv_env('CSSV_APP_SECRET', '')) >= 32,
    'private_storage' => (bool)cssv_env('CSSV_PRIVATE_STORAGE_DIR'),
    'native_accounts' => true,
    'mail_ready' => $mailStatus['ready'],
    'smtp' => $mailStatus['transport'] === 'smtp',
];

$db = ['configured' => $configured['database'], 'reachable' => false, 'schema_ready' => false];
if ($configured['database'] && $checks['pdo_mysql']) {
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            cssv_env('CSSV_DB_HOST'),
            cssv_env('CSSV_DB_PORT', '3306'),
            cssv_env('CSSV_DB_NAME')
        );
        $pdo = new PDO($dsn, (string)cssv_env('CSSV_DB_USER'), (string)cssv_env('CSSV_DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $db['reachable'] = (bool)$pdo->query('SELECT 1')->fetchColumn();
        if ($db['reachable']) {
            $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users','student_profiles','auth_sessions','migration_runs')");
            $db['schema_ready'] = ((int)$stmt->fetchColumn() === 4);
        }
    } catch (Throwable) {
        $db['reachable'] = false;
    }
}

$runtimeOk = !in_array(false, $checks, true);
cssv_json([
    'ok' => $runtimeOk,
    'service' => 'css-vista-hostinger-backend',
    'runtime' => $checks,
    'configured' => $configured,
    'database' => $db,
], $runtimeOk ? 200 : 503);
