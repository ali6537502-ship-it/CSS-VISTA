<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('GET');
cssv_json(['ok' => true] + mpt_performance($pdo, $session));
