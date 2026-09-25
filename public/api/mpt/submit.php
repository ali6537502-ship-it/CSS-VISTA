<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('POST');
$body = cssv_request_json(1024);
cssv_json(['ok' => true] + mpt_submit($pdo, $session, $body['mock'] ?? null, $body['client_id'] ?? null));
