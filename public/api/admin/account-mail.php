<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_native_admin.php';

cssv_require_method('GET', 'POST');
$pdo = cssv_db();
native_owner($pdo);
account_auth_schema($pdo);

$status = cssv_mail_transport_status();
$delivery = $_SERVER['REQUEST_METHOD'] === 'POST' ? account_deliver_mail($pdo, 10) : null;
$queue = $pdo->query('SELECT status,COUNT(*) AS count FROM account_mail_outbox GROUP BY status')->fetchAll();

cssv_json([
    'ok' => true,
    'transport' => $status['transport'],
    'transport_available' => $status['ready'],
    'settings' => [
        'host' => $status['host'],
        'port' => $status['port'],
        'encryption' => $status['encryption'],
        'user' => $status['user'],
        'from' => $status['from'],
        'from_name' => $status['from_name'],
    ],
    'queue' => $queue,
    'delivery' => $delivery,
    'note' => $status['ready']
        ? 'Accepted means Hostinger SMTP accepted the message; delivery logs and inbox receipt remain the final checks.'
        : 'Authenticated Hostinger SMTP must be connected before verification and password-reset messages can be sent.',
]);
