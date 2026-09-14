<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_native_admin.php';

cssv_require_method('GET', 'POST');
$pdo = cssv_db();
$admin = native_owner($pdo);

$status = cssv_mail_transport_status();
$configPath = (string)($GLOBALS['CSSV_RUNTIME_CONFIG_PATH'] ?? '');
$documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
$configDir = $configPath !== '' ? realpath(dirname($configPath)) : false;
$publicRoot = $documentRoot !== '' ? realpath($documentRoot) : false;
$configPrivate = is_string($configDir) && ($publicRoot === false || !str_starts_with($configDir . DIRECTORY_SEPARATOR, rtrim($publicRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR));
$configWritable = $configPrivate && is_array($GLOBALS['CSSV_RUNTIME_CONFIG'] ?? null)
    && (is_writable($configPath) || (is_dir(dirname($configPath)) && is_writable(dirname($configPath))));

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    cssv_json([
        'ok' => true,
        'configured' => $status['ready'],
        'password_set' => cssv_env('CSSV_SMTP_PASSWORD') !== null,
        'config_writable' => $configWritable,
        'host' => $status['host'] ?: 'smtp.hostinger.com',
        'port' => $status['port'] ?: 465,
        'encryption' => $status['encryption'] ?: 'ssl',
        'user' => $status['user'],
        'from' => $status['from'],
        'from_name' => $status['from_name'],
        'test_recipient' => (string)$admin['email'],
    ]);
}

$body = cssv_request_json(16384);
$host = strtolower(native_text($body['host'] ?? '', 253, true));
$user = cssv_normalize_email($body['user'] ?? '');
$from = cssv_normalize_email($body['from'] ?? '');
$fromName = native_text($body['from_name'] ?? '', 100, true);
$encryption = strtolower(native_text($body['encryption'] ?? '', 8, true));
$port = filter_var($body['port'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]);
$passwordInput = $body['password'] ?? '';

if ($host !== 'smtp.hostinger.com') cssv_fail('Use Hostinger SMTP at smtp.hostinger.com.', 422, 'invalid_smtp_host');
if (!in_array($encryption, ['ssl', 'tls'], true) || (($encryption === 'ssl' && $port !== 465) || ($encryption === 'tls' && $port !== 587))) {
    cssv_fail('Use SSL on port 465 or TLS on port 587.', 422, 'invalid_smtp_security');
}
if (!hash_equals($user, $from)) cssv_fail('The sender address must match the authenticated Hostinger mailbox.', 422, 'invalid_sender');
if (!is_string($passwordInput) || strlen($passwordInput) > 1024 || str_contains($passwordInput, "\0")) cssv_fail('Enter a valid mailbox password.', 422, 'invalid_smtp_password');
$password = $passwordInput !== '' ? $passwordInput : cssv_env('CSSV_SMTP_PASSWORD');
if ($password === null || $password === '') cssv_fail('Enter the Hostinger mailbox password.', 422, 'smtp_password_required');
if (!$configWritable) cssv_fail('The private Hostinger configuration cannot be updated from this release.', 503, 'private_config_unwritable');

$updates = [
    'CSSV_SMTP_HOST' => $host,
    'CSSV_SMTP_PORT' => (string)$port,
    'CSSV_SMTP_ENCRYPTION' => $encryption,
    'CSSV_SMTP_USER' => $user,
    'CSSV_SMTP_PASSWORD' => $password,
    'CSSV_MAIL_FROM' => $from,
    'CSSV_MAIL_FROM_NAME' => $fromName,
];
$testSubject = 'CSS Vista Hostinger SMTP connected';
$testText = "Authenticated Hostinger SMTP was tested successfully for CSS Vista.\n\nVerification and password-reset emails can now be delivered through this mailbox.";
if (!cssv_send_mail((string)$admin['email'], $testSubject, $testText, $updates)) {
    cssv_fail('Hostinger rejected the SMTP test. Check that this mailbox exists and that its mailbox password is correct.', 422, 'smtp_test_failed');
}

$config = $GLOBALS['CSSV_RUNTIME_CONFIG'];
foreach ($updates as $name => $value) $config[$name] = $value;
$serialized = "<?php\ndeclare(strict_types=1);\n// Private Hostinger runtime configuration. Never place this file in public_html.\nreturn " . var_export($config, true) . ";\n";
try {
    $suffix = bin2hex(random_bytes(8));
} catch (Throwable) {
    $suffix = (string)mt_rand(10000000, 99999999);
}
$tempPath = $configPath . '.tmp-' . $suffix;
if (@file_put_contents($tempPath, $serialized, LOCK_EX) === false) {
    cssv_fail('The private Hostinger configuration could not be saved.', 503, 'private_config_write_failed');
}
@chmod($tempPath, 0600);
if (!@rename($tempPath, $configPath)) {
    @unlink($tempPath);
    cssv_fail('The private Hostinger configuration could not be activated.', 503, 'private_config_write_failed');
}
$GLOBALS['CSSV_RUNTIME_CONFIG'] = $config;
foreach ($updates as $name => $value) putenv($name . '=' . $value);

$delivery = account_deliver_mail($pdo, 10);
cssv_json([
    'ok' => true,
    'configured' => true,
    'message' => 'Hostinger SMTP is connected and the test message was accepted.',
    'delivery' => $delivery,
]);
