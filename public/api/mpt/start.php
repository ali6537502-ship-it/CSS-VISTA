<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('POST');
$body = cssv_request_json(2048);
$result = mpt_start($pdo, $session, $body['verification_token'] ?? null, $body['client_id'] ?? null);
$status = $result['status'];
unset($result['status']);
cssv_json(['ok' => true] + $result, $status);
