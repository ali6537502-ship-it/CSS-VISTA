<?php
declare(strict_types=1);
// Owner-only MPT administration. GET views; POST actions (owner CSRF + reason).
require_once dirname(__DIR__) . '/_mpt_admin.php';
cssv_require_method('GET', 'POST');
header('X-Robots-Tag: noindex, nofollow');
$pdo = cssv_db();
native_owner($pdo);
mpt_ensure_schema($pdo);
mpt_maintain($pdo);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $view = (string)($_GET['view'] ?? 'overview');
    $page = max(1, (int)($_GET['page'] ?? 1));
    switch ($view) {
        case 'overview':
            cssv_json(['ok' => true] + mpt_admin_overview($pdo));
        case 'mock':
            cssv_json(['ok' => true, 'mock' => mpt_admin_mock_row($pdo, mpt_admin_mock($pdo, $_GET['slug'] ?? null))] + mpt_server_clock());
        case 'applications':
            $mock = mpt_admin_mock($pdo, $_GET['slug'] ?? null);
            $search = mb_substr(trim((string)($_GET['q'] ?? '')), 0, 120);
            $appeared = in_array($_GET['appeared'] ?? '', ['yes', 'no'], true) ? (string)$_GET['appeared'] : null;
            if (($_GET['format'] ?? '') === 'csv') mpt_admin_csv(mpt_admin_applications($pdo, $mock, $search, 1, 0, $appeared)['rows']);
            cssv_json(['ok' => true] + mpt_admin_applications($pdo, $mock, $search, $page, 50, $appeared));
        case 'attempts':
            cssv_json(['ok' => true] + mpt_admin_attempts($pdo, mpt_admin_mock($pdo, $_GET['slug'] ?? null), $page));
    }
    cssv_fail('Unknown view.', 404, 'not_found');
}

$body = cssv_request_json(65536);
$result = match ((string)($body['action'] ?? '')) {
    'create_mock' => ['mock' => mpt_admin_create($pdo, $body)],
    'update_mock' => ['mock' => mpt_admin_update($pdo, $body)],
    'cancel_mock' => ['mock' => mpt_admin_cancel_mock($pdo, $body)],
    'cancel_application' => mpt_admin_cancel_application($pdo, $body),
    'void_attempt' => mpt_admin_void_attempt($pdo, $body),
    'grant_resit' => mpt_admin_grant_resit($pdo, $body),
    'rescore' => mpt_admin_rescore($pdo, $body),
    default => cssv_fail('Unknown action.', 400, 'unknown_action'),
};
cssv_json(['ok' => true] + $result);
