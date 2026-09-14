<?php
declare(strict_types=1);

putenv('CI=false');
putenv('CSSV_MAIL_TRANSPORT=');
putenv('CSSV_SMTP_HOST=');
putenv('CSSV_SMTP_USER=');
putenv('CSSV_SMTP_PASSWORD=');
putenv('CSSV_MAIL_FROM=');
$_SERVER['DOCUMENT_ROOT'] = dirname(__DIR__, 2) . '/dist';

require dirname(__DIR__, 2) . '/public/api/_bootstrap_core.php';

$missing = cssv_mail_transport_status();
if ($missing['ready'] !== false || $missing['transport'] !== 'unconfigured') {
    fwrite(STDERR, "Unconfigured production mail was treated as ready.\n");
    exit(1);
}

$complete = cssv_mail_transport_status([
    'CSSV_SMTP_HOST' => 'smtp.hostinger.com',
    'CSSV_SMTP_PORT' => '465',
    'CSSV_SMTP_ENCRYPTION' => 'ssl',
    'CSSV_SMTP_USER' => 'test@example.invalid',
    'CSSV_SMTP_PASSWORD' => 'TEST ONLY mailbox password',
    'CSSV_MAIL_FROM' => 'test@example.invalid',
    'CSSV_MAIL_FROM_NAME' => 'CSS Vista',
]);
if ($complete['ready'] !== true || $complete['transport'] !== 'smtp' || array_key_exists('password', $complete)) {
    fwrite(STDERR, "Complete SMTP settings were rejected or exposed.\n");
    exit(1);
}

echo "PASS: production requires authenticated SMTP and status output excludes credentials.\n";
