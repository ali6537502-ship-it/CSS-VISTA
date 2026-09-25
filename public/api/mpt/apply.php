<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('POST');
$body = cssv_request_json(2048);
if (($body['declaration'] ?? false) !== true) cssv_fail('Please confirm the declaration to apply.', 422, 'declaration_required');
$key = substr(preg_replace('/[^A-Za-z0-9_-]/', '', (string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '')), 0, 64) ?: null;
$result = mpt_apply($pdo, $session, $body['mock'] ?? null, $key);
cssv_json(['ok' => true, 'already_applied' => $result['already_applied']] + $result['card'] + mpt_server_clock(), $result['status']);
