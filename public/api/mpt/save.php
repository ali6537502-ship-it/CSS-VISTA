<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('POST');
cssv_json(['ok' => true] + mpt_save($pdo, $session, cssv_request_json(65536)));
