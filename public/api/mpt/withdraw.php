<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('POST');
$body = cssv_request_json(1024);
cssv_json(['ok' => true] + mpt_withdraw($pdo, $session, $body['code'] ?? null) + mpt_server_clock());
